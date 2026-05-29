"""Stockage fichiers : chiffrement local + S3 optionnel."""

import logging
import os

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage, default_storage
from django.utils.deconstruct import deconstructible

logger = logging.getLogger('carloc')


def _get_fernet():
    from cryptography.fernet import Fernet

    key = getattr(settings, 'CARLOC_FILE_ENCRYPTION_KEY', '') or ''
    if not key:
        if settings.DEBUG:
            key = Fernet.generate_key().decode()
            logger.warning(
                'CARLOC_FILE_ENCRYPTION_KEY absent — clé éphémère utilisée (dev uniquement).'
            )
        else:
            raise ValueError('CARLOC_FILE_ENCRYPTION_KEY requis en production.')
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


@deconstructible
class EncryptedMediaStorage(FileSystemStorage):
    """Chiffre les fichiers au repos (Fernet) sur le système de fichiers."""

    def __init__(self, location=None, base_url=None):
        location = location or settings.MEDIA_ROOT
        base_url = base_url or settings.MEDIA_URL
        super().__init__(location=location, base_url=base_url)

    def _save(self, name, content):
        raw = content.read()
        encrypted = _get_fernet().encrypt(raw)
        return super()._save(name, ContentFile(encrypted))

    def _open(self, name, mode='rb'):
        with super()._open(name, mode) as stored:
            decrypted = _get_fernet().decrypt(stored.read())
        return ContentFile(decrypted)


def get_client_document_storage():
    """S3 si configuré, sinon stockage local chiffré."""
    bucket = os.environ.get('AWS_STORAGE_BUCKET_NAME', '').strip()
    if bucket:
        from storages.backends.s3boto3 import S3Boto3Storage

        return S3Boto3Storage(
            bucket_name=bucket,
            default_acl='private',
            file_overwrite=False,
        )
    return EncryptedMediaStorage()


def get_public_image_storage():
    """Cloudinary si configure, sinon stockage media Django classique."""
    if os.environ.get('CLOUDINARY_URL', '').strip():
        from cloudinary_storage.storage import MediaCloudinaryStorage

        return MediaCloudinaryStorage()
    return default_storage


def get_default_file_storage():
    return default_storage
