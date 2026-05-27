export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Django REST renvoie souvent { results: [...] } ; ce helper normalise la reponse. */
export function unwrapPaginated<T>(data: PaginatedResponse<T> | T[]): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data?.results ?? [];
}

export function extractApiError(err: unknown): string {
  const e = err as { error?: unknown };
  if (!e?.error) {
    return 'Erreur de communication avec le serveur.';
  }
  if (typeof e.error === 'object' && e.error !== null) {
    const structured = e.error as { message?: string; code?: string; details?: unknown };
    if (structured.message) {
      const code = structured.code ? `[${structured.code}] ` : '';
      const details = structured.details
        ? ` — ${stringifyApiError(structured.details)}`
        : '';
      return `${code}${structured.message}${details}`.trim();
    }
  }
  if (typeof e.error === 'string') {
    return e.error;
  }

  const labelMap: Record<string, string> = {
    email: 'Email',
    num_permis: 'Permis',
    password: 'Mot de passe',
    password_confirm: 'Confirmation',
    telephone: 'Telephone',
    nom: 'Nom',
    prenom: 'Prenom',
    vehicule: 'Véhicule',
    date_debut: 'Date de début',
    date_fin: 'Date de fin',
    client: 'Client',
    non_field_errors: 'Erreur',
    detail: 'Erreur',
  };

  return stringifyApiError(e.error) || 'Requete invalide.';
}

const RESERVATION_ERROR_HINTS: Record<string, string> = {
  date_in_past: 'Choisissez une date de début à partir d’aujourd’hui.',
  max_active_reservations: 'Vous avez atteint le nombre maximal de réservations actives.',
  duplicate_reservation: 'Une réservation identique existe déjà. Consultez Mes réservations.',
  reservation_not_allowed: '',
  duplicate_reservation_conflict: '',
  vehicule_has_active_reservations: '',
  client_has_active_reservations: '',
};

/** Message utilisateur pour les erreurs métier réservation (codes API CarLoc). */
export function extractReservationError(err: unknown): { message: string; profileLink?: boolean } {
  const e = err as { error?: { code?: string; message?: string; details?: unknown } };
  const code = e?.error?.code;
  const base = extractApiError(err);
  if (code && RESERVATION_ERROR_HINTS[code]) {
    const hint = RESERVATION_ERROR_HINTS[code];
    const message = hint ? `${base} ${hint}`.trim() : base;
    return { message, profileLink: false };
  }
  return { message: base };
}

function stringifyApiError(value: unknown): string {
  const labelMap: Record<string, string> = {
    email: 'Email',
    num_permis: 'Permis',
    password: 'Mot de passe',
    password_confirm: 'Confirmation',
    telephone: 'Telephone',
    nom: 'Nom',
    prenom: 'Prenom',
    non_field_errors: 'Erreur',
    detail: 'Erreur',
  };

  const stringify = (val: unknown): string => {
    if (val == null) return '';
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return String(val);
    }
    if (Array.isArray(val)) {
      return val.map(stringify).filter(Boolean).join(', ');
    }
    if (typeof val === 'object') {
      return Object.entries(val as Record<string, unknown>)
        .map(([key, v]) => {
          const label = labelMap[key] ?? key;
          const message = stringify(v);
          return message ? `${label}: ${message}` : '';
        })
        .filter(Boolean)
        .join(' | ');
    }
    return String(val);
  };

  return stringify(value);
}
