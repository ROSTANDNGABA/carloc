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

/**
 * Extrait un message d'erreur convivial pour l'utilisateur.
 * ⚠️ SÉCURITÉ : Ne jamais exposer de détails techniques (codes, stack traces, etc.)
 */
export function extractApiError(err: unknown): string {
  const e = err as { status?: number; error?: unknown; statusText?: string };

  // Erreurs réseau (pas de connexion au serveur)
  if (e.status === 0 || e.status === undefined) {
    return 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.';
  }

  // Rate limiting (trop de tentatives)
  if (e.status === 429) {
    return 'Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.';
  }

  // Erreurs d'authentification
  if (e.status === 401 || e.status === 403) {
    return 'Accès refusé. Veuillez vous reconnecter.';
  }

  // Ressource non trouvée
  if (e.status === 404) {
    return 'La ressource demandée est introuvable.';
  }

  // Erreurs serveur (500, 502, 503, 504)
  if (e.status && e.status >= 500) {
    return 'Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.';
  }

  // Erreurs métier structurées (avec message convivial)
  if (typeof e.error === 'object' && e.error !== null) {
    const structured = e.error as { message?: string; code?: string; details?: unknown };
    
    // Si le backend a déjà envoyé un message convivial, l'utiliser
    if (structured.message && isUserFriendlyMessage(structured.message)) {
      return structured.message;
    }

    // Sinon, extraire les détails de validation
    if (structured.details) {
      const validationMessage = stringifyValidationErrors(structured.details);
      if (validationMessage) {
        return validationMessage;
      }
    }
  }

  // Erreur texte simple du backend
  if (typeof e.error === 'string' && isUserFriendlyMessage(e.error)) {
    return e.error;
  }

  // Message par défaut (ne jamais exposer de détails techniques)
  return 'Une erreur est survenue. Veuillez réessayer.';
}

/**
 * Vérifie si un message est convivial pour l'utilisateur final
 * (pas de détails techniques, codes erreur, stack traces, etc.)
 */
function isUserFriendlyMessage(message: string): boolean {
  const technicalPatterns = [
    /python/i,
    /manage\.py/i,
    /runserver/i,
    /backend/i,
    /500/,
    /404/,
    /\[.*\]/,  // codes entre crochets [ERR_001]
    /stack trace/i,
    /exception/i,
    /traceback/i,
    /django/i,
    /postgres/i,
    /sql/i,
    /database/i,
    /line \d+/i,
    /file ".*"/i,
    /integrityerror/i,
    /validationerror/i,
    /typeerror/i,
    /valueerror/i,
    /keyerror/i,
    /syntaxerror/i,
    /internal server error/i,
  ];

  return !technicalPatterns.some(pattern => pattern.test(message));
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

/**
 * Transforme les erreurs de validation en message convivial
 */
function stringifyValidationErrors(value: unknown): string {
  const labelMap: Record<string, string> = {
    email: 'Email',
    num_permis: 'Numéro de permis',
    password: 'Mot de passe',
    password_confirm: 'Confirmation du mot de passe',
    telephone: 'Téléphone',
    nom: 'Nom',
    prenom: 'Prénom',
    vehicule: 'Véhicule',
    date_debut: 'Date de début',
    date_fin: 'Date de fin',
    client: 'Client',
    montant_paye: 'Montant',
    non_field_errors: '',
    detail: '',
  };

  const stringify = (val: unknown): string => {
    if (val == null) return '';
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      const msg = String(val);
      return isUserFriendlyMessage(msg) ? msg : 'Erreur de validation.';
    }
    if (Array.isArray(val)) {
      return val.map(stringify).filter(Boolean).join(', ');
    }
    if (typeof val === 'object') {
      const errors = Object.entries(val as Record<string, unknown>)
        .map(([key, v]) => {
          const message = stringify(v);
          if (!message) return '';
          
          if (key === 'non_field_errors' || key === 'detail') {
            return message;
          }
          
          const label = labelMap[key];
          if (!label) {
            // Champ technique inconnu ou non listé, on utilise un terme générique
            return `Champ incorrect : ${message}`;
          }
          
          return `${label} : ${message}`;
        })
        .filter(Boolean);

      return errors.join('. ');
    }
    return String(val);
  };

  const result = stringify(value);
  return result ? result + '.' : '';
}

function stringifyApiError(value: unknown): string {
  // Cette fonction est deprecated, utiliser stringifyValidationErrors à la place
  return stringifyValidationErrors(value);
}
