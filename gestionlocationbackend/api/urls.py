from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .monitoring.views import HealthCheckView, SentryDebugView
from .views import (
    CarLocTokenObtainPairView,
    GestionnaireViewSet,
    VehiculeViewSet,
    ClientViewSet,
    ReservationViewSet,
    PaiementViewSet,
    MaintenanceViewSet,
    ContratViewSet,
    FactureViewSet,
    NotificationLogViewSet,
    DashboardAPIView,
)

router = DefaultRouter()
router.register(r'gestionnaires', GestionnaireViewSet, basename='gestionnaire')
router.register(r'vehicules', VehiculeViewSet)
router.register(r'clients', ClientViewSet)
router.register(r'reservations', ReservationViewSet)
router.register(r'paiements', PaiementViewSet)
router.register(r'maintenances', MaintenanceViewSet)
router.register(r'contrats', ContratViewSet)
router.register(r'factures', FactureViewSet)
router.register(r'notifications', NotificationLogViewSet)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health'),
    path('monitoring/sentry-test/', SentryDebugView.as_view(), name='sentry-debug'),
    # Documentation OpenAPI / Swagger
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    # Authentification
    path('auth/login/', CarLocTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Métier
    path('dashboard/', DashboardAPIView.as_view(), name='dashboard'),
    path('', include(router.urls)),
]
