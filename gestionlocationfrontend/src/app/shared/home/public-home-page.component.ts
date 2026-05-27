import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { VehiculeService } from '@app/core/services/vehicule.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Vehicule } from '@app/models/vehicule.model';
import { imageUrl, money, statusLabel, statusTone } from '@app/shared/formatters';

type ValueCard = {
  title: string;
  description: string;
  icon: string;
};

type ServiceCard = {
  title: string;
  description: string;
  icon: string;
};

@Component({
  selector: 'app-public-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<section class="lux-hero">
  <div class="lux-hero-content">
    <div class="eyebrow">L'excellence sans compromis</div>
    <h1>Prenez le volant <br>de vos <span>rêves.</span></h1>
    <p>Découvrez une flotte de véhicules de prestige soigneusement sélectionnés pour vous offrir une expérience de conduite inoubliable, où chaque détail compte.</p>
    <div class="hero-actions">
      <a routerLink="/catalogue" class="lux-btn lux-btn-primary">Explorer la flotte</a>
      <a routerLink="/login" class="lux-btn lux-btn-outline">Espace Client</a>
    </div>
  </div>
</section>

<!-- Nos Services Section -->
<section class="lux-section lux-services" id="services">
  <div class="lux-container text-center">
    <div class="services-header">
      <span class="section-tag">Ce que nous offrons</span>
      <h2>Nos <span>Services</span></h2>
      <p class="section-subtitle">Une gamme complète de services pensés pour rendre votre expérience de location simple, fluide et premium.</p>
    </div>

    <div class="services-grid">
      @for (service of services; track service.title; let i = $index) {
        <div class="service-card" [style.animation-delay]="(i * 0.1) + 's'">
          <div class="service-icon-wrapper">
            <div class="service-icon-bg"></div>
            <i class="bi" [ngClass]="service.icon"></i>
          </div>
          <h3>{{ service.title }}</h3>
          <p>{{ service.description }}</p>
          <div class="service-line"></div>
        </div>
      }
    </div>
  </div>
</section>

<section class="lux-section lux-fleet">
  <div class="lux-container text-center">
    <h2>Nos Modèles <span>Emblématiques</span></h2>
    <p class="section-subtitle">Chaque véhicule est sélectionné pour vous offrir le frisson de la perfection.</p>
    
    <div class="fleet-grid">
      <div class="fleet-card">
        <div class="fleet-image" style="background-image: url('/assets/images/cat_supercar.png');"></div>
        <div class="fleet-info">
          <h3>Sportive</h3>
          <p>La puissance à l'état pur. Pour ceux qui aiment ressentir la route.</p>
        </div>
      </div>
      <div class="fleet-card">
        <div class="fleet-image" style="background-image: url('/assets/images/cat_gt.png');"></div>
        <div class="fleet-info">
          <h3>Prestige</h3>
          <p>Le confort absolu allié à un design majestueux.</p>
        </div>
      </div>
      <div class="fleet-card">
        <div class="fleet-image" style="background-image: url('/assets/images/cat_suv.png');"></div>
        <div class="fleet-info">
          <h3>Électrique & SUV</h3>
          <p>Le futur du luxe. Spacieux, fulgurant et éco-responsable.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="lux-section lux-promises">
  <div class="lux-container">
    <div class="promises-grid">
      <div class="promise">
        <i class="bi bi-shield-check"></i>
        <h4>Sécurité Maximale</h4>
        <p>Des véhicules révisés avant chaque départ.</p>
      </div>
      <div class="promise">
        <i class="bi bi-gem"></i>
        <h4>Qualité Premium</h4>
        <p>Finitions haut de gamme et propreté clinique.</p>
      </div>
      <div class="promise">
        <i class="bi bi-headset"></i>
        <h4>Assistance 24/7</h4>
        <p>Un service client dédié, toujours à vos côtés.</p>
      </div>
    </div>
  </div>
</section>
  `,
  styles: [`
  .lux-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }
  .lux-section {
    padding: 6rem 0;
  }
  .section-subtitle {
    color: var(--lux-text-muted);
    font-size: 1.1rem;
    margin-bottom: 4rem;
  }
  .text-center {
    text-align: center;
  }
  
  /* Hero Section */
  .lux-hero {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6rem 2rem;
    min-height: 80vh;
    overflow: hidden;
    background-color: var(--lux-bg);
    background-image: url('/assets/images/hero-bg.jpg');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
  }
  .lux-hero::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at center, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0.85) 100%);
    z-index: 1;
  }
  .lux-hero-content {
    position: relative;
    z-index: 3;
    max-width: 900px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .eyebrow {
    color: var(--lux-accent);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 1.5rem;
    text-shadow: 0 2px 8px rgba(0,0,0,0.6);
  }
  .lux-hero h1 {
    font-size: 5rem;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    font-weight: 800;
    color: #ffffff;
    text-shadow: 0 4px 12px rgba(0,0,0,0.7);
  }
  .lux-hero h1 span {
    color: var(--lux-accent);
  }
  .lux-hero p {
    font-size: 1.25rem;
    color: #e5e5e5;
    line-height: 1.6;
    margin-bottom: 2.5rem;
    max-width: 700px;
    text-shadow: 0 2px 6px rgba(0,0,0,0.6);
  }
  .hero-actions {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
  }
  @media (max-width: 768px) {
    .lux-hero h1 { font-size: 3.5rem; }
    .hero-actions { flex-direction: column; width: 100%; }
    .hero-actions .lux-btn { width: 100%; }
  }
  
  /* Fleet Section */
  .text-center h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: var(--lux-heading);
  }
  .text-center h2 span {
    color: var(--lux-accent);
  }
  .fleet-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
  .fleet-card {
    background-color: var(--lux-surface);
    border: 1px solid var(--lux-border);
    border-radius: var(--lux-radius);
    overflow: hidden;
    transition: var(--lux-transition);
  }
  .fleet-card:hover {
    transform: translateY(-10px);
    border-color: var(--lux-accent);
    box-shadow: 0 15px 40px rgba(0,0,0,0.15);
  }
  .fleet-image {
    height: 220px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    border-bottom: 1px solid var(--lux-border);
    margin: 1rem;
  }
  .fleet-info {
    padding: 1.5rem;
    text-align: left;
  }
  .fleet-info h3 {
    margin-bottom: 0.5rem;
    font-size: 1.4rem;
    color: var(--lux-heading);
  }
  .fleet-info p {
    color: var(--lux-text-muted);
    font-size: 0.95rem;
  }
  
  /* Services Section */
  .lux-services {
    background: linear-gradient(180deg, var(--lux-bg) 0%, var(--lux-surface-alt) 100%);
    position: relative;
    overflow: hidden;
  }
  .lux-services::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(ellipse at 30% 20%, rgba(30,64,175,0.05) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 80%, rgba(212,175,55,0.04) 0%, transparent 50%);
    pointer-events: none;
  }
  .services-header {
    margin-bottom: 4rem;
    position: relative;
  }
  .section-tag {
    display: inline-block;
    color: var(--lux-accent);
    text-transform: uppercase;
    letter-spacing: 0.25em;
    font-size: 0.85rem;
    font-weight: 700;
    margin-bottom: 1rem;
    padding: 0.4rem 1.2rem;
    border: 1px solid rgba(212,175,55,0.3);
    border-radius: 2rem;
    background: rgba(212,175,55,0.08);
  }
  .services-header h2 {
    font-size: 2.8rem;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    font-weight: 800;
    color: var(--lux-heading);
  }
  .services-header h2 span {
    color: var(--lux-accent);
  }
  .services-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
    position: relative;
  }
  .service-card {
    background: var(--lux-surface);
    border: 1px solid var(--lux-border);
    border-radius: 1.25rem;
    padding: 2.5rem 1.8rem 2rem;
    text-align: center;
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    position: relative;
    overflow: hidden;
    animation: fadeInUp 0.6s ease-out both;
  }
  .service-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--lux-accent), transparent);
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  .service-card:hover {
    transform: translateY(-12px);
    border-color: var(--lux-accent);
    box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 40px rgba(212,175,55,0.1);
  }
  .service-card:hover::before {
    opacity: 1;
  }
  .service-icon-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    margin-bottom: 1.5rem;
  }
  .service-icon-bg {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(30,64,175,0.1), rgba(30,64,175,0.05));
    transition: all 0.4s ease;
  }
  .service-card:hover .service-icon-bg {
    transform: scale(1.15);
    background: linear-gradient(135deg, rgba(30,64,175,0.2), rgba(30,64,175,0.08));
    box-shadow: 0 0 30px rgba(30,64,175,0.15);
  }
  .service-icon-wrapper i {
    position: relative;
    z-index: 1;
    font-size: 2rem;
    color: var(--lux-accent);
    transition: transform 0.4s ease;
  }
  .service-card:hover .service-icon-wrapper i {
    transform: scale(1.1);
  }
  .service-card h3 {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: var(--lux-heading);
  }
  .service-card p {
    color: var(--lux-text-muted);
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }
  .service-line {
    width: 40px;
    height: 2px;
    background: linear-gradient(90deg, var(--lux-accent), transparent);
    margin: 0 auto;
    transition: width 0.4s ease;
  }
  .service-card:hover .service-line {
    width: 80px;
  }
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (max-width: 1024px) {
    .services-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 600px) {
    .services-grid {
      grid-template-columns: 1fr;
    }
    .services-header h2 {
      font-size: 2rem;
    }
  }

  /* Promises Section */
  .lux-promises {
    background-color: var(--lux-surface-alt);
    border-top: 1px solid var(--lux-border);
  }
  .promises-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3rem;
    text-align: center;
  }
  .promise i {
    font-size: 3rem;
    color: var(--lux-accent);
    margin-bottom: 1.5rem;
    display: inline-block;
  }
  .promise h4 {
    font-size: 1.3rem;
    margin-bottom: 1rem;
    color: var(--lux-heading);
  }
  .promise p {
    color: var(--lux-text-muted);
  }

  @media (max-width: 900px) {
    .fleet-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    .promises-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }
  `]
})
export class PublicHomePageComponent implements OnInit {
  private readonly vehiculeService = inject(VehiculeService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly vehicles = signal<Vehicule[]>([]);

  readonly moneyFmt = money;
  readonly statusLabel = statusLabel;
  readonly statusTone = statusTone;

  readonly valueCards: ValueCard[] = [
    {
      title: 'Sélection premium',
      description: 'Des véhicules choisis pour leur confort, leur fiabilité et leur image.',
      icon: 'bi-award-fill',
    },
    {
      title: 'Tarifs transparents',
      description: 'Les prix sont affichés en FCFA, sans ambiguïté ni surprise.',
      icon: 'bi-receipt',
    },
    {
      title: 'Parcours fluide',
      description: 'Une interface claire du site public jusqu’à l’espace client.',
      icon: 'bi-lightning-charge-fill',
    },
  ];

  readonly services: ServiceCard[] = [
    {
      title: 'Location courte durée',
      description: 'Pour vos trajets ponctuels, rendez-vous et besoins rapides.',
      icon: 'bi-calendar2-check-fill',
    },
    {
      title: 'Location longue durée',
      description: 'Une formule souple pour les missions prolongées et entreprises.',
      icon: 'bi-briefcase-fill',
    },
    {
      title: 'Réservation en ligne',
      description: 'Un parcours simple pour choisir, réserver et confirmer.',
      icon: 'bi-phone-fill',
    },
    {
      title: 'Accompagnement client',
      description: 'Une équipe disponible pour vous guider à chaque étape.',
      icon: 'bi-headset',
    },
  ];

  readonly promises = [
    'Véhicules préparés avec soin et contrôlés avant chaque location',
    'Conditions de location claires et faciles à comprendre',
    'Service client réactif pour vous accompagner avant et pendant la location',
    'Expérience cohérente et premium sur tout le parcours',
  ] as const;

  readonly fallbackFeatured: Vehicule[] = [
    {
      id: 1,
      immatriculation: 'LT-CL-001',
      marque: 'Toyota',
      modele: 'Corolla',
      categorie: 'Berline',
      prix_journalier: 28000,
      statut: 'disponible',
    },
    {
      id: 2,
      immatriculation: 'LT-CL-014',
      marque: 'Hyundai',
      modele: 'Tucson',
      categorie: 'SUV',
      prix_journalier: 42000,
      statut: 'disponible',
    },
    {
      id: 3,
      immatriculation: 'LT-CL-027',
      marque: 'Mercedes',
      modele: 'C-Class',
      categorie: 'Premium',
      prix_journalier: 85000,
      statut: 'maintenance',
    },
  ];

  ngOnInit() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');

    this.vehiculeService
      .getAllVehicules()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: vehicles => this.vehicles.set(vehicles),
        error: (err: unknown) => {
          this.error.set(extractApiError(err));
          this.vehicles.set(this.fallbackFeatured);
        },
      });
  }

  featuredVehicles() {
    const list = this.vehicles();
    return list.length ? list.slice(0, 3) : this.fallbackFeatured;
  }

  vehicleImage(vehicle: Vehicule, index: number): string {
    return imageUrl(vehicle.image, vehicle.categorie, index);
  }
}
