import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  envoyerConfirmationReservation(params: {
    telephone: string;
    prenomNom: string;
    reservationId: number;
    vehicule: string;
    dateDebut: string;
    dateFin: string;
    montant: string;
  }): void {
    const message = [
      `Bonjour ${params.prenomNom || 'cher client'},`,
      '',
      `Votre reservation CarLoc #${params.reservationId} est confirmee.`,
      '',
      `Vehicule : ${params.vehicule}`,
      `Periode : du ${params.dateDebut} au ${params.dateFin}`,
      `Montant estime : ${params.montant}`,
      '',
      'Merci pour votre confiance.',
      "L'equipe CarLoc",
    ].join('\n');

    this.ouvrir(params.telephone, message);
  }

  envoyerFacture(params: {
    telephone: string;
    prenomNom: string;
    numeroFacture: string;
    vehicule: string;
    montantTotal: string;
    montantPaye?: string;
    soldeRestant?: string;
    lienPdf?: string;
  }): void {
    const lines = [
      `Bonjour ${params.prenomNom || 'cher client'},`,
      '',
      `Votre facture CarLoc ${params.numeroFacture} est disponible.`,
      '',
      `Vehicule : ${params.vehicule}`,
      `Montant total : ${params.montantTotal}`,
    ];

    if (params.montantPaye) {
      lines.push(`Montant paye : ${params.montantPaye}`);
    }
    if (params.soldeRestant) {
      lines.push(`Solde restant : ${params.soldeRestant}`);
    }
    if (params.lienPdf) {
      lines.push('', `Lien PDF : ${params.lienPdf}`);
    }

    lines.push('', 'Merci pour votre confiance.', "L'equipe CarLoc");
    this.ouvrir(params.telephone, lines.join('\n'));
  }

  envoyerAnnulation(params: {
    telephone: string;
    prenomNom: string;
    reservationId: number;
    montantRembourse?: string;
  }): void {
    const lines = [
      `Bonjour ${params.prenomNom || 'cher client'},`,
      '',
      `Votre reservation CarLoc #${params.reservationId} a ete annulee.`,
    ];

    if (params.montantRembourse) {
      lines.push(`Remboursement : ${params.montantRembourse}`);
    }

    lines.push('', 'Contactez-nous pour toute question.', "L'equipe CarLoc");
    this.ouvrir(params.telephone, lines.join('\n'));
  }

  envoyerConfirmationPaiement(params: {
    telephone: string;
    prenomNom: string;
    reservationId: number;
    montantPaye: string;
    modePaiement: string;
    soldeRestant: string;
    lienPdf?: string;
  }): void {
    const lines = [
      `Bonjour ${params.prenomNom || 'cher client'},`,
      '',
      'Nous avons bien recu votre paiement CarLoc.',
      '',
      `Reservation : #${params.reservationId}`,
      `Montant recu : ${params.montantPaye}`,
      `Mode : ${params.modePaiement}`,
      `Solde restant : ${params.soldeRestant}`,
    ];

    if (params.lienPdf) {
      lines.push('', `Lien vers la facture/recu : ${params.lienPdf}`);
    }

    lines.push('', 'Merci pour votre confiance.', "L'equipe CarLoc");

    this.ouvrir(params.telephone, lines.join('\n'));
  }

  private formatPhone(telephone: string): string {
    const cleaned = telephone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('+')) return cleaned.slice(1);
    if (cleaned.startsWith('237')) return cleaned;
    if (cleaned.startsWith('0')) return `237${cleaned.slice(1)}`;
    return `237${cleaned}`;
  }

  private ouvrir(telephone: string, message: string): void {
    if (typeof window === 'undefined') return;
    const phone = this.formatPhone(telephone);
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank', 'noopener');
  }
}
