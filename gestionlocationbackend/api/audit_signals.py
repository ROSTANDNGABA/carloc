"""
Signaux Django : journalisation structurée + entrées AuditLog en base.
"""

import logging
from datetime import date, datetime
from decimal import Decimal

from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_save, pre_delete, pre_save
from django.dispatch import receiver

from .audit_context import get_audit_context
from .models import AuditLog, Contrat, Paiement, Reservation

audit_logger = logging.getLogger('carloc.audit')

AUDITED_MODELS = (Reservation, Contrat, Paiement)

FIELD_WHITELIST = {
    Reservation: (
        'client_id', 'vehicule_id', 'date_debut', 'date_fin', 'est_annulee',
    ),
    Contrat: (
        'reservation_id', 'date_signature', 'kilometrage_depart',
        'kilometrage_retour', 'penalites_retard',
    ),
    Paiement: (
        'reservation_id', 'montant_paye', 'mode_paiement', 'date_paiement',
    ),
}


def serialize_value(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if value is None:
        return None
    return value


def snapshot(instance):
    fields = FIELD_WHITELIST.get(type(instance), ())
    data = {}
    for name in fields:
        if hasattr(instance, name):
            data[name] = serialize_value(getattr(instance, name))
    return data


def create_audit_log(instance, action, old_values=None, new_values=None, change_reason=''):
    ctx = get_audit_context()
    try:
        AuditLog.objects.create(
            content_type=ContentType.objects.get_for_model(instance),
            object_id=instance.pk,
            action=action,
            actor=ctx.get('user'),
            old_values=old_values or {},
            new_values=new_values or {},
            ip_address=ctx.get('ip_address'),
            change_reason=change_reason,
        )
    except Exception as exc:
        audit_logger.error(
            'Échec création AuditLog',
            extra={'model': type(instance).__name__, 'pk': instance.pk, 'error': str(exc)},
        )


@receiver(pre_save, sender=Reservation, dispatch_uid='audit_reservation_presave')
@receiver(pre_save, sender=Contrat, dispatch_uid='audit_contrat_presave')
@receiver(pre_save, sender=Paiement, dispatch_uid='audit_paiement_presave')
def capture_previous_state(sender, instance, **kwargs):
    if not instance.pk:
        instance._audit_before = {}
        return
    try:
        previous = sender.objects.get(pk=instance.pk)
        instance._audit_before = snapshot(previous)
    except sender.DoesNotExist:
        instance._audit_before = {}


@receiver(post_save, sender=Reservation, dispatch_uid='audit_reservation_postsave')
@receiver(post_save, sender=Contrat, dispatch_uid='audit_contrat_postsave')
@receiver(post_save, sender=Paiement, dispatch_uid='audit_paiement_postsave')
def log_model_change(sender, instance, created, **kwargs):
    new_values = snapshot(instance)
    label = type(instance).__name__

    if created:
        audit_logger.info(
            f'{label} créé #{instance.pk}',
            extra={'object_id': instance.pk, 'action': 'create'},
        )
        create_audit_log(instance, 'create', new_values=new_values)
        return

    old_values = getattr(instance, '_audit_before', {})
    if old_values == new_values:
        return

    audit_logger.info(
        f'{label} modifié #{instance.pk}',
        extra={'object_id': instance.pk, 'action': 'update'},
    )
    create_audit_log(instance, 'update', old_values=old_values, new_values=new_values)


@receiver(pre_delete, sender=Reservation, dispatch_uid='audit_reservation_delete')
@receiver(pre_delete, sender=Contrat, dispatch_uid='audit_contrat_delete')
@receiver(pre_delete, sender=Paiement, dispatch_uid='audit_paiement_delete')
def log_model_delete(sender, instance, **kwargs):
    old_values = snapshot(instance)
    label = type(instance).__name__
    audit_logger.info(
        f'{label} supprimé #{instance.pk}',
        extra={'object_id': instance.pk, 'action': 'delete'},
    )
    create_audit_log(instance, 'delete', old_values=old_values)
