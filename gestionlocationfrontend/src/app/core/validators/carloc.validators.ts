import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Téléphone international souple : chiffres et signes usuels, sans restriction pays. */
export const TELEPHONE_PATTERN = /^[+()\d\s.-]{3,30}$/;

export function normalizePhone(value: string): string {
  return value.trim();
}

export function permisValidator(): ValidatorFn {
  return (_control: AbstractControl): ValidationErrors | null => null;
}

export function telephoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = normalizePhone((control.value as string | null) ?? '');
    if (!raw) {
      return null;
    }
    return TELEPHONE_PATTERN.test(raw) ? null : { telephoneFormat: true };
  };
}

export function cniValidator(): ValidatorFn {
  return (_control: AbstractControl): ValidationErrors | null => null;
}
