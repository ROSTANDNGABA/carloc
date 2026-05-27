import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { todayIso } from '@app/shared/formatters';

/** Dates de location : fin > début, début non passée. */
export function reservationDatesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const debut = control.get('date_debut')?.value as string | undefined;
    const fin = control.get('date_fin')?.value as string | undefined;
    if (!debut || !fin) {
      return null;
    }
    const today = todayIso();
    if (debut < today) {
      return { dateInPast: true };
    }
    if (fin <= debut) {
      return { dateRange: true };
    }
    return null;
  };
}
