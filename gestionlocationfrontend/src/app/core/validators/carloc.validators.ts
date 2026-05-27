import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Aligné sur api/validators.py (permis français). */
export const PERMIS_PATTERN = /^[A-Z]{2}\d{7}$/;

/** Téléphone FR : 0XXXXXXXXX ou +33XXXXXXXXX */
export const TELEPHONE_PATTERN = /^(?:\+33|0)[1-9]\d{8}$/;

export function normalizePhone(value: string): string {
  return value.replace(/\s/g, '').replace(/\./g, '').replace(/-/g, '');
}

export function permisValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value as string | null)?.trim().toUpperCase();
    if (!raw) {
      return null;
    }
    return PERMIS_PATTERN.test(raw) ? null : { permisFormat: true };
  };
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
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value as string | null)?.trim();
    if (!raw) {
      return null;
    }
    const len = raw.length;
    return len >= 5 && len <= 20 ? null : { cniFormat: true };
  };
}
