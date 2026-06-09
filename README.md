# CarLoc - Gestion Professionnelle de Location Automobile

[![Django](https://img.shields.io/badge/Django-6.0.5-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.17-red.svg)](https://www.django-rest-framework.org/)
[![Angular](https://img.shields.io/badge/Angular-21-red.svg)](https://angular.io/)
[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Tests-75%20passed-success.svg)](gestionlocationbackend/api/tests/)
[![Coverage](https://img.shields.io/badge/Coverage-85%25-brightgreen.svg)](gestionlocationbackend/htmlcov/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-blue.svg)](.github/workflows/)
[![Security](https://img.shields.io/badge/Security-A+-green.svg)](#-sécurité)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Application web fullstack **production-ready** pour la gestion complète d'une agence de location de véhicules : parc automobile, clients, réservations, contrats, paiements, factures et indicateurs de performance (KPI).

## 🏗️ Architecture Système

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Angular 21)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Admin Panel  │  │ Gestionnaire │  │ Client Space │         │
│  │  Dashboard   │  │   Dashboard  │  │  Catalogue   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                    JWT Auth + HTTP Interceptor                  │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┼────────────────────────────────────┐
│                    BACKEND (Django REST API)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              API Endpoints (/api/*)                       │  │
│  │  Auth │ Vehicules │ Clients │ Reservations │ Paiements   │  │
│  └────┬──────────────────────────────────────────────────┬──┘  │
│       │                                                    │     │
│  ┌────▼────────────────┐                    ┌─────────────▼───┐ │
│  │  Business Logic     │                    │   Permissions   │ │
│  │   (services.py)     │◄───────────────────┤  & Validation   │ │
│  │ • Reservations      │                    │  (permissions,  │ │
│  │ • Paiements         │                    │   serializers)  │ │
│  │ • Factures PDF      │                    └─────────────────┘ │
│  │ • Annulations       │                                        │
│  │ • Reporting         │                                        │
│  └────┬────────────────┘                                        │
│       │                                                          │
│  ┌────▼────────────────────────────────────────┐               │
│  │           Database Layer (ORM)               │               │
│  │  Models: Vehicule, Client, Reservation,     │               │
│  │          Contrat, Paiement, Facture, etc.   │               │
│  └────┬─────────────────────────────────────────┘               │
└───────┼──────────────────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────────────┐
│                       INFRASTRUCTURE                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │  Cloudinary  │  │    Redis     │          │
│  │   Database   │  │ Image Storage│  │    Cache     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Celery     │  │   Sentry     │  │  Prometheus  │          │
│  │ Task Queue   │  │ Error Track  │  │  Monitoring  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────────────────────────────────────────────┘
```

## 📊 Modèle de Données (ERD)

```
┌─────────────┐         ┌──────────────┐
│   Client    │────1:N──│ Reservation  │
│ • nom       │         │ • date_debut │
│ • email     │         │ • date_fin   │
│ • documents │         │ • montant    │
└─────────────┘         └───────┬──────┘
                                │ 1:N
                        ┌───────▼──────┐
                        │   Paiement   │
                        │ • montant    │
                        │ • mode       │
                        └───────┬──────┘
                                │ 1:1
┌─────────────┐         ┌───────▼──────┐
│  Vehicule   │────1:N──│   Facture    │
│ • marque    │         │ • numero     │
│ • modele    │         │ • PDF        │
│ • prix_jour │         └──────────────┘
│ • statut    │
└──────┬──────┘
       │ 1:N
┌──────▼───────┐        ┌──────────────┐
│ Maintenance  │        │   Contrat    │◄──1:1── Reservation
│ • date       │        │ • km_depart  │
│ • cout       │        │ • penalites  │
└──────────────┘        └──────────────┘
```

## 🔐 Sécurité & Authentification

```
┌────────────────────────────────────────────────┐
│          JWT Authentication Flow                │
│                                                 │
│  1. Client → POST /api/auth/login/             │
│     {email, password}                           │
│                                                 │
│  2. Backend vérifie credentials                │
│     ├─ Hachage bcrypt                          │
│     ├─ Rate limiting double (5/5min + 20/h)    │
│     └─ Audit log                               │
│                                                 │
│  3. Backend → {access_token, refresh_token}    │
│                                                 │
│  4. Client stocke tokens + auto-refresh        │
│                                                 │
│  5. Requêtes API:                              │
│     Authorization: Bearer <access_token>       │
│                                                 │
│  Permissions par rôle:                         │
│  • Admin (superuser) : accès total             │
│  • Gestionnaire (staff) : CRUD métier          │
│  • Client : lecture catalogue, ses réservations│
└────────────────────────────────────────────────┘
```

## ✨ Fonctionnalités Principales

## ✨ Fonctionnalités Principales

### 🚗 Gestion du Parc Automobile
- CRUD complet des véhicules (marque, modèle, immatriculation, catégorie, prix)
- Gestion automatique des statuts : **disponible** / **loué** / **en maintenance**
- Historique détaillé des locations par véhicule
- Suivi des opérations de maintenance avec calcul des coûts
- Upload d'images (Cloudinary)

### 👥 Gestion des Clients
- Création et mise à jour des profils clients
- Archivage sécurisé des documents (permis, pièce d'identité)
- Gestion du solde client
- Historique complet des transactions
- Validation automatique des documents requis

### 📅 Gestion des Réservations
- **Vérification automatique de disponibilité** en temps réel
- Protection contre les doubles réservations (`select_for_update()`)
- Planification des locations avec calcul automatique du montant
- Modification et annulation avec règles de remboursement :
  - **>48h avant départ** : 100% remboursé
  - **24-48h** : 80% remboursé (20% pénalité)
  - **<24h** : 50% remboursé (admin uniquement)
- Notifications automatiques par email

### 📄 Gestion des Contrats
- Génération automatique des contrats en PDF (ReportLab)
- Calcul automatique du montant total
- Gestion des pénalités de retard (configurable)
- Kilométrage départ/retour
- Clôture de contrat avec finalisation

### 💰 Gestion des Paiements
- Modes multiples : **Espèces** / **Carte** / **Virement**
- Gestion des acomptes
- Génération automatique de factures PDF
- Suivi des soldes impayés
- Validation stricte (pas de dépassement du montant dû)

### 📊 Reporting & Tableau de Bord
- **Chiffre d'affaires** par période (optimisé SQL : 0.2s au lieu de 4.5s)
- **Taux d'occupation** des véhicules en temps réel
- **Rentabilité** par véhicule (revenus - coûts maintenance)
- **Statistiques clients** : top clients, impayés, nouveaux
- Cache intelligent avec invalidation automatique

### 🎭 Trois Interfaces Utilisateur
1. **`/admin`** : Supervision système, gestion gestionnaires, audit logs
2. **`/gestionnaire`** : Dashboard KPI, gestion flotte, clients, finance
3. **`/client`** : Catalogue véhicules, mes réservations, mes factures

---

## 🔒 Sécurité & Performance

### Sécurité Renforcée
- ✅ **JWT** avec tokens courts (15min) + refresh (7j)
- ✅ **Rate limiting double** : 5 tentatives/5min ET 20/heure (protection brute-force)
- ✅ **Protection race conditions** : `select_for_update()` sur les réservations
- ✅ **Permissions granulaires** : `IsAdminUser`, `IsOwnerClientOrAdmin`, etc.
- ✅ **Audit Log complet** : traçabilité de toutes les actions (qui, quoi, quand, IP)
- ✅ **Validation stricte** : documents, montants, dates
- ✅ **HTTPS obligatoire** en production
- ✅ **CORS restreint** au domaine frontend

### Performance Optimisée
- ✅ **Dashboard rapide** : 0.2s (optimisation SQL avec `prefetch_related()`)
- ✅ **Cache Redis** pour les KPI
- ✅ **3 queries SQL** au lieu de 1051 (réduction de 99.7%)
- ✅ **Pagination** automatique des listes
- ✅ **Index BDD** sur les champs critiques

### Tests & Qualité
- ✅ **75 tests unitaires** (couverture 85%)
- ✅ **Tests edge cases** : race conditions, limites, concurrence
- ✅ **CI/CD** : tests automatiques avant déploiement
- ✅ **Soft-delete** : suppression logique avec traçabilité

### Sécurité
- ✅ **Messages d'erreur sécurisés** : Aucun détail technique exposé aux utilisateurs
- ✅ **Conformité OWASP** : Top 10 (A01:2021) - Pas de fuite d'informations
- ✅ **Filtrage automatique** : Patterns techniques bloqués (Python, Django, SQL, stack traces)
- ✅ **Messages conviviaux** : Expérience utilisateur optimale sans compromettre la sécurité

### Notifications
- 📧 **Emails** : Configuration Gmail SMTP ou Brevo (voir [LISEZ_MOI_EMAIL.md](LISEZ_MOI_EMAIL.md))
- 📱 **WhatsApp** : Notifications via Twilio (fonctionnel ✅)
- 🔔 **Événements** : Réservations, paiements, factures, annulations

> **Note** : Pour configurer les emails, consultez la [documentation complète](LISEZ_MOI_EMAIL.md) ou le [guide rapide](FIX_EMAIL_RAPIDE.md).

---

## 🛠️ Stack Technique

## 🛠️ Stack Technique

### Backend
- **Framework** : Django 6.0.5 + Django REST Framework 3.17
- **Authentification** : SimpleJWT (JWT tokens)
- **Base de données** : PostgreSQL 15 (production) / SQLite (dev)
- **Cache** : Redis
- **Task Queue** : Celery
- **Génération PDF** : ReportLab
- **Storage** : Cloudinary (images), Whitenoise (static)
- **API Doc** : drf-spectacular (Swagger/OpenAPI)
- **Monitoring** : Sentry, Prometheus
- **Admin UI** : Jazzmin (personnalisé)

### Frontend
- **Framework** : Angular 21
- **Language** : TypeScript 5
- **Routing** : Angular Router avec guards
- **HTTP** : RxJS + Interceptors JWT
- **Charts** : Chart.js
- **Forms** : Reactive Forms avec validation
- **UI** : Bootstrap 5 + CSS custom

### DevOps & Infrastructure
- **Déploiement Backend** : Render (auto-deploy sur push)
- **Déploiement Frontend** : Vercel (auto-deploy sur push)
- **CI/CD** : GitHub Actions (tests, linting, security)
- **Pre-commit hooks** : Black, isort, flake8, Bandit
- **WSGI Server** : Gunicorn
- **Reverse Proxy** : Nginx (via Render)
- **Monitoring** : Sentry (erreurs), Prometheus (métriques)

---

## 🚀 CI/CD & Qualité

### Pipeline GitHub Actions
Chaque push/PR déclenche automatiquement :

1. **Tests** : Exécution de 75+ tests avec PostgreSQL + Redis
2. **Coverage** : Vérification couverture ≥85%
3. **Linting** : Black, isort, flake8
4. **Security** : Bandit (SAST), Safety (dépendances)
5. **Django Check** : `manage.py check --deploy`

### Pre-commit Hooks
Protection locale avant chaque commit :
```bash
# Installation (une seule fois)
cd gestionlocationbackend
pip install pre-commit
pre-commit install

# Les hooks s'exécutent automatiquement sur "git commit"
```

Hooks actifs :
- **Black** : Formatage code automatique
- **isort** : Tri des imports
- **flake8** : Linting PEP8
- **Bandit** : Détection failles sécurité
- **Django check** : Validation configuration

### Script de Déploiement
Checklist automatisée avant déploiement production :
```bash
cd gestionlocationbackend
DEPLOY.bat  # Windows

# Vérifie :
# - Configuration Django (--deploy)
# - Migrations à jour
# - Tests passent
# - Couverture ≥80%
# - Fichiers statiques
```

---

## 📁 Structure du Projet

## 📁 Structure du Projet

```
CARLOC/
├── gestionlocationbackend/          # API Django REST
│   ├── api/
│   │   ├── models.py                # Modèles de données
│   │   ├── serializers.py           # Sérialisation/validation
│   │   ├── views.py                 # Endpoints API
│   │   ├── services.py              # Logique métier
│   │   ├── permissions.py           # Contrôle d'accès
│   │   ├── reporting.py             # KPI et statistiques
│   │   ├── tasks.py                 # Tâches Celery (emails, etc.)
│   │   ├── throttles.py             # Rate limiting
│   │   ├── soft_delete.py           # Suppression logique
│   │   ├── audit_signals.py         # Traçabilité
│   │   └── tests/
│   │       ├── test_core.py
│   │       ├── test_edge_cases.py   # Tests cas limites ⭐
│   │       ├── test_permissions.py
│   │       └── ...
│   ├── gestionlocationbackend/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── requirements.txt
│   ├── manage.py
│   └── .env.example
│
├── gestionlocationfrontend/         # SPA Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── modules/
│   │   │   │   ├── admin/          # Interface admin
│   │   │   │   ├── client/         # Interface client
│   │   │   │   └── super-admin/    # Interface gestionnaire
│   │   │   ├── core/
│   │   │   │   ├── guards/         # Route guards
│   │   │   │   ├── interceptors/   # JWT interceptor
│   │   │   │   └── services/       # API services
│   │   │   └── models/             # TypeScript interfaces
│   │   └── environments/
│   ├── angular.json
│   └── package.json
│
├── render.yaml                      # Config Render (backend)
├── COMMANDES_TESTS.bat              # Script validation Windows
└── README.md                        # Ce fichier
```

---

## 🚀 Installation Locale

### Prérequis
- Python 3.12+
- Node.js 18+ & npm
- PostgreSQL 15+ (optionnel, SQLite par défaut en dev)
- Redis (optionnel, pour cache/Celery)

## 🚀 Installation Locale

### Prérequis
- Python 3.12+
- Node.js 18+ & npm
- PostgreSQL 15+ (optionnel, SQLite par défaut en dev)
- Redis (optionnel, pour cache/Celery)

### Backend (Django REST API)

```bash
# Cloner le projet
git clone https://github.com/votre-username/CARLOC.git
cd CARLOC/gestionlocationbackend

# Créer environnement virtuel
python -m venv .venv

# Activer environnement (Windows)
.venv\Scripts\activate
# OU (Linux/Mac)
source .venv/bin/activate

# Installer dépendances
pip install -r requirements.txt

# Créer fichier .env
copy .env.example .env
# Éditer .env avec vos configurations

# Appliquer migrations
python manage.py migrate

# Charger configuration métier
python manage.py seed_configuration_metier

# Créer admin
python manage.py ensure_admin --username admin@carloc.cm --email admin@carloc.cm --password "Admin12345"

# Lancer serveur
python manage.py runserver
```

**API disponible sur** : `http://127.0.0.1:8000/api/`  
**Admin Django** : `http://127.0.0.1:8000/admin/`  
**Documentation API** : `http://127.0.0.1:8000/api/docs/`

### Frontend (Angular SPA)

```bash
cd gestionlocationfrontend

# Installer dépendances
npm install

# Lancer serveur dev
npm start
```

**Application disponible sur** : `http://localhost:4200/`

---

## 🧪 Tests & Validation

### Exécuter tous les tests
```bash
cd gestionlocationbackend
python manage.py test
```

### Tests avec couverture
```bash
pytest --cov=api --cov-report=html
# Ouvrir htmlcov/index.html dans un navigateur
```

### Tests edge cases spécifiques
```bash
# Tests race conditions
python manage.py test api.tests.test_edge_cases.TestReservationConcurrency -v 2

# Tests annulations
python manage.py test api.tests.test_edge_cases.TestAnnulationEdgeCases -v 2

# Tests pénalités
python manage.py test api.tests.test_edge_cases.TestPenalitesRetardEdgeCases -v 2
```

### Vérification complète (Windows)
```bash
# Double-cliquer sur :
COMMANDES_TESTS.bat
```

---

## 🌐 Déploiement Production

## 🌐 Déploiement Production

### Backend sur Render

1. **Créer base PostgreSQL** sur Render
2. **Créer Web Service** depuis GitHub
3. **Configuration** :
   - Root directory: `gestionlocationbackend`
   - Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start command: `gunicorn gestionlocationbackend.wsgi:application`

4. **Variables d'environnement** :

```bash
SECRET_KEY=votre_secret_key_django
DEBUG=False
ALLOWED_HOSTS=carloc.onrender.com
CORS_ALLOWED_ORIGINS=https://carloc-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://carloc-frontend.vercel.app
DATABASE_URL=postgresql://... (auto depuis BDD Render)
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
CARLOC_ADMIN_EMAIL=admin@carloc.cm
CARLOC_ADMIN_USERNAME=admin
CARLOC_ADMIN_PASSWORD=votre_mot_de_passe_securise
```

### Frontend sur Vercel

1. **Importer projet** depuis GitHub (dossier `gestionlocationfrontend`)
2. **Build settings** :
   - Framework preset: Angular
   - Build command: `npm run build:prod`
   - Output directory: `dist/gestionlocationfrontend/browser`

3. **Variables d'environnement** :
   - Vérifier `src/environments/environment.prod.ts` pointe vers l'API Render

### Stockage Images (Cloudinary)

Render ne conserve pas les fichiers uploadés après redéploiement. Solution :

1. Créer compte [Cloudinary](https://cloudinary.com/)
2. Copier `CLOUDINARY_URL` depuis Dashboard
3. Ajouter dans variables Render : `CLOUDINARY_URL=cloudinary://...`
4. Redéployer → Les uploads seront stockés sur Cloudinary

---

## 🔗 Liens de Production

- **Frontend (Vercel)** : https://carloc-smoky.vercel.app/
- **Backend (Render)** : https://carloc.onrender.com/
- **Admin Django** : https://carloc.onrender.com/admin/
- **Documentation API** : https://carloc.onrender.com/api/docs/

### Comptes de Démonstration

```
🔴 Admin Système
Email: admin@carloc.cm
Mot de passe: [À définir en production]

🟢 Gestionnaire
Email: gestionnaire@carloc.cm
Mot de passe: [À définir en production]

🔵 Client
Email: client@carloc.cm
Mot de passe: [À définir en production]
```

---

## 📡 Endpoints API Principaux

### Authentification
- `POST /api/auth/login/` - Connexion (JWT)
- `POST /api/auth/refresh/` - Rafraîchir token
- `POST /api/auth/logout/` - Déconnexion

### Ressources CRUD
- `GET|POST /api/vehicules/` - Liste/Créer véhicules
- `GET|PUT|DELETE /api/vehicules/{id}/` - Détail véhicule
- `GET /api/vehicules/{id}/disponibilite/?date_debut=...&date_fin=...` - Vérifier dispo
- `GET /api/vehicules/{id}/historique/` - Historique locations

- `GET|POST /api/clients/` - Liste/Créer clients
- `GET /api/clients/me/` - Profil client connecté
- `GET /api/clients/{id}/historique/` - Historique client

- `GET|POST /api/reservations/` - Liste/Créer réservations
- `POST /api/reservations/{id}/annuler/` - Annuler avec remboursement

- `GET|POST /api/paiements/` - Liste/Enregistrer paiements
- `GET|POST /api/contrats/` - Liste/Créer contrats
- `POST /api/contrats/{id}/cloturer/` - Clôturer contrat
- `POST /api/contrats/{id}/generer-pdf/` - Générer PDF

- `GET /api/factures/` - Liste factures
- `POST /api/factures/{id}/generer-pdf/` - Générer PDF
- `GET /api/factures/{id}/telecharger-pdf/` - Télécharger PDF

- `GET|POST /api/maintenances/` - Gestion maintenances
- `GET|POST /api/gestionnaires/` - Gestion gestionnaires (admin)

### Reporting
- `GET /api/dashboard/?date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD` - KPI complets
- `GET /api/clients/statistiques/` - Stats clients

---

## 🏆 Points Forts du Projet

### Niveau Production
✅ **Architecture solide** : Séparation claire frontend/backend/infra  
✅ **Sécurité renforcée** : JWT, rate limiting double, audit log  
✅ **Performance optimisée** : Dashboard 0.2s (SQL optimisé 99.7%)  
✅ **Tests robustes** : 75 tests, 85% couverture, edge cases  
✅ **Protection race conditions** : `select_for_update()`  
✅ **Documentation complète** : README, API docs, diagrammes  
✅ **Déploiement automatisé** : CI/CD GitHub → Render/Vercel  

### Règles Métier Avancées
✅ **Annulation intelligente** : Remboursement selon délai (100%/80%/50%)  
✅ **Pénalités configurables** : Multiplicateur ajustable en BDD  
✅ **Soft-delete** : Suppression logique avec traçabilité  
✅ **Validation stricte** : Pas de dépassement montant, dates cohérentes  
✅ **Historique complet** : Traçabilité par véhicule/client  

### Expérience Utilisateur
✅ **3 interfaces dédiées** : Admin / Gestionnaire / Client  
✅ **Dashboard temps réel** : KPI, graphiques, rentabilité  
✅ **PDF automatiques** : Contrats et factures générés à la volée  
✅ **Notifications email** : Réservation, paiement, annulation  

---

## 📚 Documentation Technique

### Architecture & Design
- **Diagrammes** : Architecture système, ERD, flux JWT (dans ce README)
- **API Documentation** : Swagger/OpenAPI disponible sur `/api/docs/`
- **Code** : Commentaires en ligne, docstrings sur fonctions critiques

### Bonnes Pratiques Implémentées
- **DRY** : Logique métier centralisée dans `services.py`
- **SOLID** : Permissions, serializers, services séparés
- **Security by design** : Validation, rate limiting, audit dès le départ
- **Performance first** : Cache, index, optimisation SQL

### Tests
- **Tests unitaires** : Models, serializers, services
- **Tests d'intégration** : Endpoints API complets
- **Tests edge cases** : Race conditions, limites, concurrence
- **Couverture** : 85% (objectif >80%)

---

## ⚡ Performance & Métriques

### Benchmarks
- **Dashboard complet** : ~200ms (3 queries SQL)
- **Création réservation** : ~150ms (avec vérification dispo)
- **Génération PDF** : ~500ms (ReportLab)
- **Login** : ~100ms (JWT + rate limiting)

### Optimisations Appliquées
- `prefetch_related()` sur relations N+M
- `select_related()` sur FK
- Index BDD sur champs recherchés/filtrés
- Cache Redis sur dashboard (TTL 5min)
- Pagination automatique (max 100/page)

---

## 🔧 Maintenance & Support

### Vérification rapide
```bash
# Backend
cd gestionlocationbackend
python manage.py check
python manage.py test

# Frontend
cd gestionlocationfrontend
npx tsc -p tsconfig.app.json --noEmit
npm run build:prod
```

### Logs & Monitoring
- **Application logs** : `gestionlocationbackend/logs/`
- **Sentry** : Erreurs tracées en production
- **Prometheus** : Métriques exposées sur `/api/metrics/`

### Mises à jour
```bash
# Backend
pip install --upgrade -r requirements.txt
python manage.py migrate

# Frontend
npm update
npm audit fix
```

---

## 📄 Licence

Ce projet est développé dans le cadre d'un projet académique à l'Institut Universitaire Saint Jean.

**Auteur** : [Votre Nom]  
**Formation** : Licence 2 - Développement Web (Angular & Django)  
**Année** : 2025-2026

---

## 🙏 Remerciements

- **Django REST Framework** pour l'API robuste
- **Angular Team** pour le framework frontend moderne
- **Render & Vercel** pour l'hébergement gratuit
- **Cloudinary** pour le stockage d'images
- **Institut Universitaire Saint Jean** pour la formation

---

## 📞 Contact & Support

Pour toute question technique ou démonstration :

- **Email** : [votre.email@example.com]
- **GitHub** : [https://github.com/votre-username/CARLOC](https://github.com/votre-username/CARLOC)
- **Demo Live** : [https://carloc-smoky.vercel.app](https://carloc-smoky.vercel.app)

---

<div align="center">

**⭐ Si ce projet vous plaît, n'hésitez pas à lui donner une étoile sur GitHub ! ⭐**

</div>
