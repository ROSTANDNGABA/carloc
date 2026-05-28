# CarLoc - Gestion professionnelle de location automobile

CarLoc est une application web fullstack Django REST Framework + Angular permettant de gerer une agence de location de vehicules: parc automobile, clients, reservations, contrats, paiements, factures et indicateurs de performance.

## Fonctionnalites principales

- Gestion du parc automobile: creation, modification, suppression, statut disponible/loue/maintenance, historique par vehicule.
- Gestion des clients: profils, documents, permis, piece d'identite, historique et solde.
- Gestion des reservations: disponibilite automatique, planification, modification et annulation.
- Gestion des contrats: creation, cloture, generation PDF, penalites de retard.
- Gestion des paiements: especes, carte, virement, acomptes, factures PDF, soldes impayes.
- Reporting: chiffre d'affaires par periode, taux d'occupation, vehicules rentables, statistiques clients.
- Trois interfaces separees:
  - `/admin`: supervision systeme, CRUD gestionnaires, chiffre d'affaires par gestionnaire, historique.
  - `/gestionnaire`: operations agence, flotte, reservations, clients, finance, contrats, maintenance.
  - `/client`: catalogue, reservations, factures, profil.

## Stack technique

- Backend: Django, Django REST Framework, SimpleJWT, PostgreSQL, django-cors-headers.
- Frontend: Angular 21, Angular Router, Reactive Forms, HTTP Interceptor JWT, Chart.js.
- Admin Django: Jazzmin personnalise.
- Deploiement cible: Render pour l'API, Vercel pour Angular.

## Structure du projet

```text
CARLOC/
  gestionlocationbackend/     API Django REST
  gestionlocationfrontend/    SPA Angular
  render.yaml                 Blueprint Render
```

## Installation locale

### Backend

```bash
cd gestionlocationbackend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed_configuration_metier
python manage.py ensure_admin --username admin@carloc.cm --email admin@carloc.cm --password "Admin12345"
python manage.py runserver
```

API locale: `http://127.0.0.1:8000/api`

### Frontend

```bash
cd gestionlocationfrontend
npm install
npm start
```

Application locale: `http://localhost:4200`

## Comptes de demonstration

A remplir avant la correction avec les comptes crees dans la base de production.

```text
Admin systeme
Email: admin@carloc.cm
Mot de passe: A_REMPLIR

Gestionnaire
Email: gestionnaire@carloc.cm
Mot de passe: A_REMPLIR

Client
Email: client@carloc.cm
Mot de passe: A_REMPLIR
```

## Endpoints principaux

- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `/api/vehicules/`
- `/api/clients/`
- `/api/reservations/`
- `/api/paiements/`
- `/api/contrats/`
- `/api/factures/`
- `/api/maintenances/`
- `/api/dashboard/`
- `/api/gestionnaires/`

## Deploiement Render

1. Creer une base PostgreSQL sur Render.
2. Creer un Web Service depuis le depot GitHub.
3. Utiliser le `render.yaml` fourni ou configurer:
   - Root directory: `gestionlocationbackend`
   - Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start command: `gunicorn gestionlocationbackend.wsgi:application`
4. Ajouter les variables d'environnement:

```text
SECRET_KEY=...
DEBUG=False
ALLOWED_HOSTS=carloc.onrender.com
CORS_ALLOWED_ORIGINS=https://votre-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://votre-frontend.vercel.app
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_HOST=...
DB_PORT=5432
CARLOC_ADMIN_EMAIL=...
CARLOC_ADMIN_USERNAME=...
CARLOC_ADMIN_PASSWORD=...
```

## Deploiement Vercel

1. Importer le dossier `gestionlocationfrontend` dans Vercel.
2. Verifier `gestionlocationfrontend/src/environments/environment.prod.ts`.
3. Verifier que l'URL API pointe vers `https://carloc.onrender.com`.
4. Build command: `npm run build:prod`
5. Output directory: `dist/gestionlocationfrontend/browser`

## Liens de production

```text
Frontend Vercel: https://carloc-smoky.vercel.app/
Backend Render: https://carloc.onrender.com/
Admin Django: https://carloc.onrender.com/admin/
Documentation API: https://carloc.onrender.com/api/docs/
```

## Securite

- Les secrets sont lus depuis `.env` en local et depuis les variables Render en production.
- `.env`, media, logs, base SQLite et environnements virtuels sont ignores par Git.
- L'API utilise JWT, pas les sessions Django, pour les appels Angular.

## Verification rapide

```bash
cd gestionlocationbackend
python manage.py check

cd ../gestionlocationfrontend
npx tsc -p tsconfig.app.json --noEmit
npm run build:prod
```

## Auteur

Projet individuel - Institut Universitaire Saint Jean - Licence 2 - Developpement Web Angular et Django.
