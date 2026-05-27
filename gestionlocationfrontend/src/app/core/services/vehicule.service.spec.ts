import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { VehiculeService } from './vehicule.service';
import { Vehicule } from '../../models/vehicule.model';
import { environment } from '../../../environments/environment';

describe('VehiculeService', () => {
  let service: VehiculeService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/vehicules/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VehiculeService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VehiculeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch paginated vehicules', () => {
    const mockVehicules: Vehicule[] = [
      {
        id: 1,
        marque: 'Peugeot',
        modele: '208',
        immatriculation: 'AA-123-BB',
        categorie: 'Citadine',
        prix_journalier: 45,
        statut: 'disponible',
      },
    ];

    service.getVehicules(1, 'peugeot').subscribe(page => {
      expect(page.count).toBe(1);
      expect(page.results?.length).toBe(1);
      expect(page.results?.[0].marque).toBe('Peugeot');
    });

    const req = httpMock.expectOne(r => r.url === baseUrl && r.params.get('page') === '1' && r.params.get('search') === 'peugeot');
    expect(req.request.method).toBe('GET');
    req.flush({ count: 1, next: null, previous: null, results: mockVehicules });
  });

  it('should verify vehicle availability', () => {
    service.verifierDisponibilite(1, '2026-06-01', '2026-06-03').subscribe(result => {
      expect(result.disponible).toBe(true);
      expect(result.message).toContain('disponible');
    });

    const req = httpMock.expectOne(
      r => r.url === `${baseUrl}1/disponibilite/` && r.params.get('date_debut') === '2026-06-01'
    );
    expect(req.request.params.get('date_fin')).toBe('2026-06-03');
    req.flush({ disponible: true, message: 'Véhicule disponible' });
  });

  it('should create a new vehicule', () => {
    const payload: Partial<Vehicule> = {
      marque: 'BMW',
      modele: 'X5',
      immatriculation: 'CC-456-DD',
      categorie: 'SUV',
      prix_journalier: 120,
      statut: 'disponible',
    };

    service.createVehicule(payload).subscribe(result => {
      expect(result.id).toBe(2);
      expect(result.marque).toBe('BMW');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 2, ...payload });
  });
});
