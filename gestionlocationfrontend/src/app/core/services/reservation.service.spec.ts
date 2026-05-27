import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ReservationService } from './reservation.service';
import { environment } from '../../../environments/environment';

describe('ReservationService', () => {
  let service: ReservationService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/reservations/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReservationService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReservationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch paginated reservations', () => {
    service.getReservations(2, 'dupont').subscribe(page => {
      expect(page.count).toBe(1);
      expect(page.results?.[0].id).toBe(1);
    });

    const req = httpMock.expectOne(
      r => r.url === baseUrl && r.params.get('page') === '2' && r.params.get('search') === 'dupont',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1, client: 1, vehicule: 1, date_debut: '2026-06-01', date_fin: '2026-06-05' }],
    });
  });

  it('should create a reservation', () => {
    const payload = { client: 1, vehicule: 1, date_debut: '2026-06-01', date_fin: '2026-06-05' };

    service.createReservation(payload).subscribe(res => {
      expect(res.id).toBe(10);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 10, ...payload });
  });

  it('should cancel a reservation', () => {
    service.annulerReservation(5).subscribe(res => {
      expect(res.message).toContain('annulée');
    });

    const req = httpMock.expectOne(`${baseUrl}5/annuler/`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Réservation annulée avec succès.' });
  });
});
