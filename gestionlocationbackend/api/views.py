from django.conf import settings
from django.contrib.auth.models import User
from django.http import FileResponse
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.db.models import Sum
from rest_framework import permissions, status, viewsets
from rest_framework.filters import SearchFilter
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_spectacular.utils import OpenApiParameter, extend_schema
from drf_spectacular.types import OpenApiTypes

from .models import AuditLog, Client, Contrat, Facture, Maintenance, NotificationLog, Paiement, Reservation, Vehicule
from .permissions import (
    IsAdminOrReadOnly,
    IsAdminUser,
    IsFactureOwnerOrAdmin,
    IsOwnerClientOrAdmin,
    IsReservationOwnerOrAdmin,
    IsSuperAdminUser,
)
from .pdf_generators import generer_pdf_contrat, generer_pdf_facture
from .reporting import get_dashboard_complet, historique_client, historique_vehicule
from .serializers import (
    CarLocTokenObtainPairSerializer,
    ClientSerializer,
    ContratClotureSerializer,
    ContratSerializer,
    FactureSerializer,
    GestionnaireSerializer,
    MaintenanceSerializer,
    NotificationLogSerializer,
    PaiementSerializer,
    ReservationAnnulationSerializer,
    ReservationSerializer,
    VehiculeDisponibiliteSerializer,
    VehiculeSerializer,
)
from .throttles import LoginThrottle
from .services import (
    ReservationCancellationError,
    annuler_reservation_avec_regles,
    apres_suppression_maintenance,
    finaliser_reservation,
    mettre_a_jour_facture_location,
    vehicule_disponible_pour_periode,
    sync_vehicule_statut,
)


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class CarLocTokenObtainPairView(TokenObtainPairView):
    serializer_class = CarLocTokenObtainPairSerializer

    def get_throttles(self):
        if getattr(settings, 'CARLOC_DISABLE_LOGIN_THROTTLE', False):
            return []
        return [LoginThrottle()]


class GestionnaireViewSet(viewsets.ModelViewSet):
    serializer_class = GestionnaireSerializer
    permission_classes = [IsSuperAdminUser]
    filter_backends = [SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']

    def get_queryset(self):
        return (
            User.objects.filter(is_staff=True, is_superuser=False)
            .order_by('last_name', 'first_name', 'username')
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        stats = self._stats_by_manager()
        page = self.paginate_queryset(queryset)
        users = page if page is not None else queryset
        payload = []
        for user in users:
            data = self.get_serializer(user).data
            data.update(stats.get(user.id, {'chiffre_affaires': 0, 'locations_realisees': 0}))
            payload.append(data)
        if page is not None:
            return self.get_paginated_response(payload)
        return Response(payload)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        managers = self.get_queryset()
        stats = self._stats_by_manager(include_history=True)
        return Response([
            {
                **self.get_serializer(manager).data,
                **stats.get(manager.id, {
                    'chiffre_affaires': 0,
                    'locations_realisees': 0,
                    'historique_locations': [],
                }),
            }
            for manager in managers
        ])

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.is_staff = False
        instance.save(update_fields=['is_active', 'is_staff'])

    def _stats_by_manager(self, include_history=False):
        paiement_ct = ContentType.objects.get_for_model(Paiement)
        reservation_ct = ContentType.objects.get_for_model(Reservation)

        paiement_ids_by_actor = {}
        paiement_logs = AuditLog.objects.filter(
            content_type=paiement_ct,
            action='create',
            actor__isnull=False,
        ).values('actor_id', 'object_id')
        for row in paiement_logs:
            paiement_ids_by_actor.setdefault(row['actor_id'], set()).add(row['object_id'])

        reservation_ids_by_actor = {}
        reservation_logs = AuditLog.objects.filter(
            content_type=reservation_ct,
            action='create',
            actor__isnull=False,
        ).values('actor_id', 'object_id')
        for row in reservation_logs:
            reservation_ids_by_actor.setdefault(row['actor_id'], set()).add(row['object_id'])

        stats = {}
        for manager in self.get_queryset():
            paiement_ids = paiement_ids_by_actor.get(manager.id, set())
            reservation_ids = reservation_ids_by_actor.get(manager.id, set())
            chiffre_affaires = Paiement.objects.filter(pk__in=paiement_ids).aggregate(
                total=Sum('montant_paye')
            )['total'] or 0
            entry = {
                'chiffre_affaires': float(chiffre_affaires),
                'locations_realisees': len(reservation_ids),
            }
            if include_history:
                reservations = (
                    Reservation.objects.filter(pk__in=reservation_ids)
                    .select_related('client', 'vehicule')
                    .order_by('-date_creation')
                )
                entry['historique_locations'] = [
                    {
                        'id': reservation.id,
                        'client': f'{reservation.client.prenom} {reservation.client.nom}',
                        'vehicule': (
                            f'{reservation.vehicule.marque} {reservation.vehicule.modele} '
                            f'({reservation.vehicule.immatriculation})'
                        ),
                        'date_debut': reservation.date_debut,
                        'date_fin': reservation.date_fin,
                        'montant_total': float(reservation.montant_total),
                        'total_paye': float(reservation.total_paye),
                        'est_annulee': reservation.est_annulee,
                    }
                    for reservation in reservations[:25]
                ]
            stats[manager.id] = entry
        return stats


class VehiculeViewSet(viewsets.ModelViewSet):
    queryset = Vehicule.objects.all()
    serializer_class = VehiculeSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter]
    search_fields = ['immatriculation', 'marque', 'modele', 'categorie']

    def perform_destroy(self, instance):
        from .deletion_rules import valider_suppression_vehicule

        valider_suppression_vehicule(instance)
        instance.delete()

    def perform_update(self, serializer):
        instance = serializer.save()
        if not instance.is_active:
            instance.is_active = True
            instance.deleted_at = None
            instance.save(update_fields=['is_active', 'deleted_at'])
        sync_vehicule_statut(instance)

    def perform_create(self, serializer):
        instance = serializer.save()
        if not instance.is_active:
            instance.is_active = True
            instance.deleted_at = None
            instance.save(update_fields=['is_active', 'deleted_at'])
        sync_vehicule_statut(instance)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser], url_path='sync-statuts')
    def sync_statuts(self, request):
        from .models import Vehicule
        count = 0
        for vehicule in Vehicule.objects.all():
            sync_vehicule_statut(vehicule)
            count += 1
        return Response({
            'message': f'Statuts de {count} véhicules synchronisés avec succès.'
        })

    @action(detail=True, methods=['get'], url_path='disponibilite')
    def disponibilite(self, request, pk=None):
        vehicule = self.get_object()
        serializer = VehiculeDisponibiliteSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        date_debut = serializer.validated_data['date_debut']
        date_fin = serializer.validated_data['date_fin']
        disponible = vehicule_disponible_pour_periode(vehicule, date_debut, date_fin)

        message = 'Véhicule disponible pour cette période.' if disponible else (
            'Véhicule indisponible (maintenance ou réservation existante).'
        )

        return Response({
            'date_debut': date_debut,
            'date_fin': date_fin,
            'disponible': disponible,
            'message': message,
        })

    @action(detail=True, methods=['get'], url_path='historique', permission_classes=[IsAdminUser])
    def historique(self, request, pk=None):
        vehicule = self.get_object()
        return Response(historique_vehicule(vehicule))


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.select_related('user')
    serializer_class = ClientSerializer
    filter_backends = [SearchFilter]
    search_fields = ['nom', 'prenom', 'email', 'telephone', 'num_permis']

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        if self.action in ('me', 'historique'):
            return [permissions.IsAuthenticated()]
        if self.action in ('list', 'destroy', 'statistiques'):
            return [IsAdminUser()]
        return [IsOwnerClientOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return super().get_queryset()
        if hasattr(user, 'client_profile'):
            return super().get_queryset().filter(pk=user.client_profile.pk)
        return Client.objects.none()

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        if not hasattr(request.user, 'client_profile'):
            return Response(
                {'detail': 'Profil client introuvable pour cet utilisateur.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(request.user.client_profile)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='historique')
    def historique(self, request, pk=None):
        client = self.get_object()
        user = request.user
        if not user.is_staff and (
            not hasattr(user, 'client_profile') or user.client_profile.pk != client.pk
        ):
            return Response({'detail': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(historique_client(client))

    @action(detail=False, methods=['get'], url_path='statistiques')
    def statistiques(self, request):
        from .reporting import parse_date, statistiques_clients

        date_debut = parse_date(request.query_params.get('date_debut'))
        date_fin = parse_date(request.query_params.get('date_fin'))
        return Response(statistiques_clients(date_debut, date_fin))

    def perform_destroy(self, instance):
        from .deletion_rules import valider_suppression_client

        valider_suppression_client(instance)
        instance.delete()


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related('client', 'vehicule').prefetch_related('paiements')
    serializer_class = ReservationSerializer
    filter_backends = [SearchFilter]
    search_fields = [
        'client__nom', 'client__prenom', 'client__email',
        'vehicule__immatriculation', 'vehicule__marque', 'vehicule__modele',
    ]
    permission_classes = [IsReservationOwnerOrAdmin]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        if hasattr(user, 'client_profile'):
            return qs.filter(client=user.client_profile)
        return qs.none()

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'detail': 'Utilisez l\'action « annuler » plutôt que la suppression.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def perform_create(self, serializer):
        reservation = serializer.save()
        sync_vehicule_statut(reservation.vehicule)

    def perform_update(self, serializer):
        old_vehicule = serializer.instance.vehicule if serializer.instance else None
        reservation = serializer.save()
        sync_vehicule_statut(reservation.vehicule)
        if old_vehicule and old_vehicule != reservation.vehicule:
            sync_vehicule_statut(old_vehicule)

    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        reservation = self.get_object()
        if reservation.est_annulee:
            return Response(
                {'message': 'Cette réservation est déjà annulée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = annuler_reservation_avec_regles(
                reservation,
                user=request.user,
                ip_address=_client_ip(request),
            )
        except ReservationCancellationError as exc:
            detail = exc.messages[0] if getattr(exc, 'messages', None) else str(exc)
            return Response({'detail': detail}, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            'message': 'Réservation annulée avec succès.',
            'reservation_id': result['reservation_id'],
            'montant_rembourse': result['montant_remboursé'],
            'montant_penalite': result['montant_pénalité'],
            'taux_remboursement': result['taux_remboursement'],
        }
        serializer = ReservationAnnulationSerializer(payload)
        return Response(serializer.data)


class PaiementViewSet(viewsets.ModelViewSet):
    queryset = Paiement.objects.select_related('reservation__client', 'reservation__vehicule')
    serializer_class = PaiementSerializer
    permission_classes = [IsAdminUser]


class MaintenanceViewSet(viewsets.ModelViewSet):
    queryset = Maintenance.objects.select_related('vehicule')
    serializer_class = MaintenanceSerializer
    permission_classes = [IsAdminUser]

    def perform_destroy(self, instance):
        vehicule = instance.vehicule
        instance.delete()
        apres_suppression_maintenance(vehicule)


class ContratViewSet(viewsets.ModelViewSet):
    queryset = Contrat.objects.select_related('reservation__client', 'reservation__vehicule')
    serializer_class = ContratSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['get', 'put', 'patch', 'post', 'head', 'options']

    @action(detail=True, methods=['post'])
    def cloturer(self, request, pk=None):
        contrat = self.get_object()
        input_serializer = ContratClotureSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        date_retour = input_serializer.validated_data.get('date_retour') or timezone.now().date()
        km_retour = input_serializer.validated_data.get('kilometrage_retour')

        contrat = finaliser_reservation(
            contrat.reservation,
            date_retour=date_retour,
            kilometrage_retour=km_retour,
        )

        output = ContratSerializer(contrat, context={'request': request})
        return Response(output.data)

    @action(detail=True, methods=['post'], url_path='generer-pdf')
    def generer_pdf(self, request, pk=None):
        contrat = generer_pdf_contrat(self.get_object())
        serializer = ContratSerializer(contrat, context={'request': request})
        return Response(serializer.data)


class FactureViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Facture.objects.select_related(
        'reservation__client', 'reservation__vehicule', 'paiement',
    )
    serializer_class = FactureSerializer
    permission_classes = [IsFactureOwnerOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        if hasattr(user, 'client_profile'):
            return qs.filter(reservation__client=user.client_profile)
        return qs.none()

    @action(detail=True, methods=['post'], url_path='generer-pdf')
    def generer_pdf(self, request, pk=None):
        facture = generer_pdf_facture(self.get_object())
        serializer = self.get_serializer(facture)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='telecharger-pdf')
    def telecharger_pdf(self, request, pk=None):
        facture = self.get_object()
        if not facture.fichier_pdf:
            return Response(
                {'detail': 'Aucun PDF disponible. Utilisez generer-pdf d\'abord.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return FileResponse(facture.fichier_pdf.open('rb'), as_attachment=True, filename=facture.fichier_pdf.name)


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NotificationLog.objects.select_related('reservation')
    serializer_class = NotificationLogSerializer
    permission_classes = [IsAdminUser]


@extend_schema(
    tags=['reporting'],
    parameters=[
        OpenApiParameter('date_debut', str, OpenApiParameter.QUERY, description='YYYY-MM-DD'),
        OpenApiParameter('date_fin', str, OpenApiParameter.QUERY, description='YYYY-MM-DD'),
    ],
    responses=OpenApiTypes.OBJECT,
    summary='Tableau de bord KPI',
    description='Chiffre d\'affaires, taux d\'occupation, rentabilité véhicules et statistiques clients.',
)
class DashboardAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from .reporting import parse_date

        date_debut = parse_date(request.query_params.get('date_debut'))
        date_fin = parse_date(request.query_params.get('date_fin'))
        return Response(get_dashboard_complet(date_debut, date_fin))
