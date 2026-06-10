import { environment } from '@env/environment';

type MaybeNumber = number | string | null | undefined;

const fallbackByCategory: Record<string, string> = {
  suv: 'assets/images/cat_suv.png',
  'tout terrain': 'assets/images/cat_suv.png',
  '4x4': 'assets/images/cat_suv.png',
  supercar: 'assets/images/cat_supercar.png',
  sport: 'assets/images/cat_gt.png',
  gt: 'assets/images/cat_gt.png',
  client: 'assets/images/vision_mechanic.png',
};

const fallbackImages = [
  'assets/images/hero.jpg',
  'assets/images/cat_suv.png',
  'assets/images/cat_supercar.png',
  'assets/images/cat_gt.png',
];

export function toNumber(value: MaybeNumber): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function money(value: MaybeNumber): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return 'Non défini';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function imageUrl(
  source: string | null | undefined,
  category?: string | null,
  index = 0,
): string {
  const cleanSource = source?.trim();
  if (cleanSource) {
    if (cleanSource.startsWith('http://') || cleanSource.startsWith('https://')) return cleanSource;
    if (cleanSource.startsWith('assets/')) return cleanSource;

    const base = environment.mediaBaseUrl.replace(/\/$/, '');
    const path = cleanSource.startsWith('/') ? cleanSource : `/${cleanSource}`;
    return `${base}${path}`;
  }

  const normalized = (category ?? '').toLowerCase();
  return fallbackByCategory[normalized] ?? fallbackImages[index % fallbackImages.length];
}

export function statusLabel(status: string | boolean | null | undefined): string {
  if (status === true) return 'Actif';
  if (status === false) return 'Inactif';

  const labels: Record<string, string> = {
    disponible: 'Disponible',
    loue: 'Loué',
    maintenance: 'Maintenance',
    brouillon: 'Brouillon',
    emise: 'Émise',
    payee: 'Payée',
    annulee: 'Annulée',
    especes: 'Espèces',
    carte: 'Carte',
    virement: 'Virement',
    revision: 'Révision',
    reparation: 'Réparation',
    controle: 'Contrôle',
    pneus: 'Pneus',
    location: 'Location',
    acompte: 'Acompte',
  };

  return labels[String(status ?? '')] ?? String(status ?? 'Non défini');
}

export function statusTone(status: string | boolean | null | undefined): string {
  if (status === true) return 'tone-success';
  if (status === false) return 'tone-muted';

  const tones: Record<string, string> = {
    disponible: 'tone-success',
    loue: 'tone-info',
    maintenance: 'tone-warning',
    payee: 'tone-success',
    emise: 'tone-info',
    brouillon: 'tone-muted',
    annulee: 'tone-danger',
    location: 'tone-info',
    acompte: 'tone-warning',
  };

  return tones[String(status ?? '')] ?? 'tone-muted';
}

/** Même logique que api/utils.py `nb_jours_location`. */
export function nbJoursLocation(start: string | null | undefined, end: string | null | undefined): number {
  if (!start || !end) return 0;
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 1);
}

/** @deprecated Préférer nbJoursLocation pour les montants de location. */
export function daysBetween(start: string | null | undefined, end: string | null | undefined): number {
  return nbJoursLocation(start, end);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function reservationStatusLabel(reservation: {
  est_annulee?: boolean;
  est_soldee?: boolean;
  est_active?: boolean;
  date_debut?: string;
  date_fin?: string;
}): string {
  if (reservation.est_annulee) return 'Annulée';
  if (reservation.est_soldee) return 'Soldée';
  const today = todayIso();
  if (reservation.date_debut && reservation.date_fin) {
    if (reservation.date_debut <= today && today <= reservation.date_fin) {
      return 'En cours';
    }
    if (reservation.date_debut > today) {
      return 'À venir';
    }
    if (reservation.date_fin < today) {
      return 'Terminée';
    }
  }
  if (reservation.est_active) return 'Active';
  return 'Confirmée';
}

export function reservationStatusTone(reservation: {
  est_annulee?: boolean;
  est_soldee?: boolean;
  date_debut?: string;
  date_fin?: string;
}): string {
  if (reservation.est_annulee) return 'tone-danger';
  if (reservation.est_soldee) return 'tone-success';
  const today = todayIso();
  if (reservation.date_debut && reservation.date_fin) {
    if (reservation.date_debut <= today && today <= reservation.date_fin) return 'tone-info';
    if (reservation.date_fin < today) return 'tone-muted';
  }
  return 'tone-warning';
}

/** Règles alignées sur api/services.py `peut_annuler_reservation` (aperçu UI). */
export function canCancelReservation(
  reservation: {
    est_annulee?: boolean;
    date_debut?: string;
    date_fin?: string;
  },
  isAdmin = false,
): boolean {
  if (reservation.est_annulee || !reservation.date_debut || !reservation.date_fin) {
    return false;
  }
  const today = todayIso();
  if (reservation.date_debut <= today && today <= reservation.date_fin) {
    return false;
  }
  const daysBefore = Math.floor(
    (parseLocalDate(reservation.date_debut).getTime() - parseLocalDate(today).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (!isAdmin && daysBefore * 24 < 24) {
    return false;
  }
  return true;
}

function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

export function clientName(nom?: string | null, prenom?: string | null): string {
  return [prenom, nom].filter(Boolean).join(' ') || 'Client';
}
