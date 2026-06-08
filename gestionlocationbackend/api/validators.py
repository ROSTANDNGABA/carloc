"""Validateurs pour les uploads et les champs du modèle Client"""

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile
import re

# Types MIME autorisés
ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
]

MAX_FILE_SIZE_MB = 10


def validate_document_file(file: UploadedFile):
    """Valide fichier de document (permis, CNI)

    Vérifications:
    - Taille max 10MB
    - Type MIME autorisé (PDF, JPEG, PNG)
    - Extension valide
    """

    # 1. Vérifier taille
    if file.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValidationError(
            f"Fichier trop volumineux ({file.size / 1024 / 1024:.1f}MB, max {MAX_FILE_SIZE_MB}MB)",
            code="file_too_large",
        )

    # 2. Vérifier extension
    ext = file.name.split(".")[-1].lower()
    if ext not in ["pdf", "jpg", "jpeg", "png"]:
        raise ValidationError(
            f"Extension non autorisée: .{ext}. Acceptés: .pdf, .jpg, .jpeg, .png",
            code="invalid_extension",
        )

    # 3. Vérifier MIME type en lisant le début du fichier
    try:
        import magic

        mime = magic.from_buffer(file.read(2048), mime=True)
        file.seek(0)  # Reset file pointer

        if mime not in ALLOWED_MIME_TYPES:
            raise ValidationError(
                f"Type de fichier non autorisé: {mime}. Acceptés: application/pdf, image/jpeg, image/png",
                code="invalid_file_type",
            )
    except ImportError:
        # Si python-magic n'est pas installé, valider au minimum l'extension
        pass
    except Exception as e:
        # En cas d'erreur MIME, au moins on bloque les extensions dangereuses
        if ext in ["exe", "bat", "cmd", "sh", "py", "zip", "rar", "iso"]:
            raise ValidationError(
                "Type de fichier non autorisé", code="suspicious_file_type"
            )


def validate_permis_format(num_permis):
    """Valide numéro permis français (2 lettres + 7 chiffres)"""

    if not num_permis:
        return  # null/blank autorisé

    # Format français: 2 lettres majuscules + 7 chiffres
    pattern = r"^[A-Z]{2}\d{7}$"
    if not re.match(pattern, num_permis):
        raise ValidationError(
            "Format permis invalide. Attendu: 2 lettres majuscules + 7 chiffres (ex: AB1234567)",
            code="invalid_permis_format",
        )


def validate_cni_format(num_cni):
    """Valide numéro CNI"""

    if not num_cni:
        return  # null/blank autorisé

    # Accepter différents formats
    if len(num_cni) < 5 or len(num_cni) > 20:
        raise ValidationError(
            "Numéro CNI invalide (5-20 caractères)", code="invalid_cni_format"
        )


def validate_telephone_format(telephone):
    """Valide un numéro de téléphone sans restriction de pays."""

    if not telephone:
        return

    phone = telephone.strip()
    if not re.match(r"^[+()\d\s.-]{3,30}$", phone):
        raise ValidationError(
            "Numéro de téléphone invalide", code="invalid_phone_format"
        )
