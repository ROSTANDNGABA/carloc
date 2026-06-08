"""Génération PDF des contrats et factures CarLoc (ReportLab)."""

import io
from decimal import Decimal

from django.core.files.base import ContentFile
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import Contrat, Facture


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title", parent=base["Heading1"], fontSize=16, spaceAfter=12
        ),
        "normal": base["Normal"],
        "small": ParagraphStyle(
            "Small", parent=base["Normal"], fontSize=9, textColor=colors.grey
        ),
    }


def _build_pdf(elements) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    doc.build(elements)
    return buffer.getvalue()


def _fmt_montant(value) -> str:
    return f"{Decimal(value):,.0f} FCFA".replace(",", " ")


def generer_pdf_contrat(contrat: Contrat) -> Contrat:
    reservation = contrat.reservation
    client = reservation.client
    vehicule = reservation.vehicule
    styles = _styles()

    elements = [
        Paragraph("CARLOC — Contrat de location", styles["title"]),
        Paragraph(
            f"Contrat n° {contrat.id} — Réservation n° {reservation.id}",
            styles["normal"],
        ),
        Spacer(1, 0.5 * cm),
        Paragraph(
            f"<b>Client :</b> {client.prenom} {client.nom} — {client.email}",
            styles["normal"],
        ),
        Paragraph(
            f"<b>Téléphone :</b> {client.telephone} — <b>Permis :</b> {client.num_permis}",
            styles["normal"],
        ),
        Spacer(1, 0.3 * cm),
        Paragraph(
            f"<b>Véhicule :</b> {vehicule.marque} {vehicule.modele} ({vehicule.immatriculation}) — "
            f"{vehicule.categorie}",
            styles["normal"],
        ),
        Paragraph(
            f"<b>Période :</b> du {reservation.date_debut:%d/%m/%Y} au {reservation.date_fin:%d/%m/%Y} "
            f"({reservation.nb_jours} jour(s))",
            styles["normal"],
        ),
        Spacer(1, 0.5 * cm),
    ]

    data = [
        ["Désignation", "Montant"],
        ["Location véhicule", _fmt_montant(reservation.montant_total)],
        ["Pénalités de retard", _fmt_montant(contrat.penalites_retard)],
        ["TOTAL DÛ", _fmt_montant(reservation.montant_du)],
    ]
    table = Table(data, colWidths=[10 * cm, 5 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a365d")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 0.5 * cm))

    if contrat.kilometrage_depart is not None:
        elements.append(
            Paragraph(
                f"Kilométrage départ : {contrat.kilometrage_depart} km",
                styles["normal"],
            )
        )
    if contrat.kilometrage_retour is not None:
        elements.append(
            Paragraph(
                f"Kilométrage retour : {contrat.kilometrage_retour} km",
                styles["normal"],
            )
        )

    elements.append(Spacer(1, 1 * cm))
    elements.append(
        Paragraph(
            f"Date de signature : {contrat.date_signature:%d/%m/%Y %H:%M}",
            styles["small"],
        )
    )
    elements.append(
        Paragraph(
            "Conditions : retour du véhicule à la date convenue. Pénalité de 1,5× le prix journalier par jour de retard.",
            styles["small"],
        )
    )

    pdf_bytes = _build_pdf(elements)
    filename = f"contrat_{contrat.id}_reservation_{reservation.id}.pdf"
    contrat.fichier_pdf.save(filename, ContentFile(pdf_bytes), save=True)
    return contrat


def generer_pdf_facture(facture: Facture) -> Facture:
    reservation = facture.reservation
    client = reservation.client
    vehicule = reservation.vehicule
    styles = _styles()

    statut_label = dict(Facture.STATUTS).get(facture.statut, facture.statut)
    type_label = dict(Facture.TYPES).get(facture.type_facture, facture.type_facture)

    elements = [
        Paragraph("CARLOC — Facture", styles["title"]),
        Paragraph(f"N° {facture.numero} — {type_label}", styles["normal"]),
        Paragraph(f"Statut : {statut_label}", styles["normal"]),
        Paragraph(
            f"Date d'émission : {facture.date_emission:%d/%m/%Y %H:%M}",
            styles["normal"],
        ),
        Spacer(1, 0.5 * cm),
        Paragraph(f"<b>Client :</b> {client.prenom} {client.nom}", styles["normal"]),
        Paragraph(
            f"<b>Email :</b> {client.email} — <b>Tél :</b> {client.telephone}",
            styles["normal"],
        ),
        Spacer(1, 0.3 * cm),
        Paragraph(
            f"<b>Location :</b> {vehicule.marque} {vehicule.modele} ({vehicule.immatriculation})",
            styles["normal"],
        ),
        Paragraph(
            f"<b>Période :</b> {reservation.date_debut:%d/%m/%Y} — {reservation.date_fin:%d/%m/%Y}",
            styles["normal"],
        ),
        Spacer(1, 0.5 * cm),
    ]

    data = [
        ["Description", "Montant"],
        ["Montant location", _fmt_montant(facture.montant_location)],
        ["Pénalités", _fmt_montant(facture.montant_penalites)],
        ["TOTAL FACTURÉ", _fmt_montant(facture.montant_total)],
    ]

    if facture.type_facture == "location":
        data.append(
            ["Déjà payé (acomptes, etc.)", _fmt_montant(reservation.total_paye)]
        )
        data.append(["RESTE À PAYER", _fmt_montant(reservation.solde_restant)])

    table = Table(data, colWidths=[10 * cm, 5 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d3748")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 1 * cm))
    elements.append(
        Paragraph(
            "Merci pour votre confiance. CarLoc — Location de véhicules.",
            styles["small"],
        )
    )

    pdf_bytes = _build_pdf(elements)
    filename = f'facture_{facture.numero.replace("/", "-")}.pdf'
    facture.fichier_pdf.save(filename, ContentFile(pdf_bytes), save=True)
    return facture
