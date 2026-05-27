import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { clientAuthGuard } from './core/guards/client-auth.guard';
import { gestionnaireAuthGuard } from './core/guards/gestionnaire-auth.guard';
import { PublicHomePageComponent } from './shared/home/public-home-page.component';
import { PublicShellComponent } from './shared/navbar/public-shell.component';

export const routes: Routes = [
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/super-admin/super-admin-shell.component').then(
        m => m.SuperAdminShellComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./modules/super-admin/components/dashboard/super-admin-dashboard-page.component').then(
            m => m.SuperAdminDashboardPageComponent,
          ),
        data: { title: 'Vue societe' },
      },
      {
        path: 'gestionnaires',
        loadComponent: () =>
          import('./modules/admin/components/gestion-gestionnaires/admin-gestionnaires-page.component').then(
            m => m.AdminGestionnairesPageComponent,
          ),
        data: { title: 'Gestionnaires' },
      },
      {
        path: 'historique',
        loadComponent: () =>
          import('./modules/super-admin/components/history/super-admin-history-page.component').then(
            m => m.SuperAdminHistoryPageComponent,
          ),
        data: { title: 'Historique' },
      },
    ],
  },
  {
    path: 'gestionnaire',
    canActivate: [gestionnaireAuthGuard],
    loadComponent: () => import('./modules/admin/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./modules/admin/components/dashboard/admin-dashboard-page.component').then(
            m => m.AdminDashboardPageComponent,
          ),
        data: { title: 'Dashboard' },
      },
      {
        path: 'vehicules',
        loadComponent: () =>
          import('./modules/admin/components/gestion-parc/admin-vehicles-page.component').then(
            m => m.AdminVehiclesPageComponent,
          ),
        data: { title: 'Flotte' },
      },
      {
        path: 'reservations',
        loadComponent: () =>
          import('./modules/admin/components/gestion-reservations/admin-reservations-page.component').then(
            m => m.AdminReservationsPageComponent,
          ),
        data: { title: 'Reservations' },
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./modules/admin/components/gestion-clients/admin-clients-page.component').then(
            m => m.AdminClientsPageComponent,
          ),
        data: { title: 'Clients' },
      },
      {
        path: 'finance',
        loadComponent: () =>
          import('./modules/admin/components/gestion-paiements/admin-finance-page.component').then(
            m => m.AdminFinancePageComponent,
          ),
        data: { title: 'Finance' },
      },
      {
        path: 'contrats',
        loadComponent: () =>
          import('./modules/admin/components/gestion-contrats/admin-contracts-page.component').then(
            m => m.AdminContractsPageComponent,
          ),
        data: { title: 'Contrats' },
      },
      {
        path: 'maintenance',
        loadComponent: () =>
          import('./modules/admin/components/gestion-maintenance/admin-maintenance-page.component').then(
            m => m.AdminMaintenancePageComponent,
          ),
        data: { title: 'Maintenance' },
      },
    ],
  },
  {
    path: 'client',
    canActivate: [clientAuthGuard],
    loadComponent: () => import('./modules/client/client-shell.component').then(m => m.ClientShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./modules/client/components/catalogue/catalogue-page.component').then(
            m => m.CataloguePageComponent,
          ),
      },
      {
        path: 'reservations',
        loadComponent: () =>
          import('./modules/client/components/reservation/client-reservations-page.component').then(
            m => m.ClientReservationsPageComponent,
          ),
      },
      {
        path: 'factures',
        loadComponent: () =>
          import('./modules/client/components/facture/invoices-page.component').then(
            m => m.InvoicesPageComponent,
          ),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./modules/client/components/profil/client-profile-page.component').then(
            m => m.ClientProfilePageComponent,
          ),
      },
    ],
  },
  {
    path: '',
    component: PublicShellComponent,
    children: [
      { path: '', component: PublicHomePageComponent },
      {
        path: 'catalogue',
        loadComponent: () =>
          import('./modules/client/components/catalogue/catalogue-page.component').then(
            m => m.CataloguePageComponent,
          ),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./modules/auth/login/login-page.component').then(m => m.LoginPageComponent),
      },
      {
        path: 'inscription',
        loadComponent: () =>
          import('./modules/auth/inscription/register-page.component').then(
            m => m.RegisterPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
