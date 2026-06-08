"""Configuration du logging structuré en JSON pour CarLoc"""

import logging
import json
from logging.handlers import RotatingFileHandler
import os


class CustomJsonFormatter(logging.Formatter):
    """Formateur personnalisé pour logs JSON structurés"""

    def format(self, record):
        log_object = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Ajouter les champs extras
        if hasattr(record, "__dict__"):
            for key, value in record.__dict__.items():
                if key not in [
                    "name",
                    "msg",
                    "args",
                    "created",
                    "filename",
                    "funcName",
                    "levelname",
                    "levelno",
                    "lineno",
                    "module",
                    "msecs",
                    "message",
                    "pathname",
                    "process",
                    "processName",
                    "relativeCreated",
                    "thread",
                    "threadName",
                    "exc_info",
                    "exc_text",
                    "stack_info",
                    "getMessage",
                    "asctime",
                ]:
                    log_object[key] = value

        # Ajouter les exceptions si présentes
        if record.exc_info:
            log_object["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_object, ensure_ascii=False, default=str)


def setup_logging():
    """Configure le système de logging JSON pour l'application"""

    # Créer dossier logs s'il n'existe pas
    os.makedirs("logs", exist_ok=True)

    # Logger racine
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Nettoyez les handlers existants
    root_logger.handlers.clear()

    # Handler console
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = CustomJsonFormatter()
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # Handler fichier avec rotation
    file_handler = RotatingFileHandler(
        "logs/carloc.log", maxBytes=10485760, backupCount=5  # 10MB
    )
    file_handler.setLevel(logging.DEBUG)
    file_formatter = CustomJsonFormatter()
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)

    # Logger spécifique pour CarLoc
    carloc_logger = logging.getLogger("carloc")
    carloc_logger.setLevel(logging.DEBUG)

    # Handler fichier dédié pour les logs métier
    business_handler = RotatingFileHandler(
        "logs/business.log", maxBytes=10485760, backupCount=5
    )
    business_handler.setLevel(logging.INFO)
    business_handler.setFormatter(file_formatter)
    carloc_logger.addHandler(business_handler)

    return root_logger
