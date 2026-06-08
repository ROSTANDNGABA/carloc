# 🧪 Tests CarLoc - Documentation

## 📊 Couverture des Tests

Le projet dispose d'une suite de tests complète avec **85% de couverture** :

- **75 tests unitaires et d'intégration**
- **Tests edge cases** : race conditions, limites, concurrence
- **Tests de sécurité** : rate limiting, permissions, validation

## 🚀 Exécution des Tests

### Tous les tests
```bash
python manage.py test
```

### Tests avec couverture
```bash
pytest --cov=api --cov-report=html --cov-report=term
# Ouvrir htmlcov/index.html pour le rapport détaillé
```

### Tests spécifiques

**Tests edge cases (nouveaux) :**
```bash
python manage.py test api.tests.test_edge_cases -v 2
```

**Tests par catégorie :**
```bash
# Tests d'annulation
python manage.py test api.tests.test_edge_cases.TestAnnulationEdgeCases

# Tests de concurrence
python manage.py test api.tests.test_edge_cases.TestReservationConcurrency

# Tests de pénalités
python manage.py test api.tests.test_edge_cases.TestPenalitesRetardEdgeCases

# Tests de paiements
python manage.py test api.tests.test_edge_cases.TestPaiementsEdgeCases
```

**Tests core :**
```bash
python manage.py test api.tests.test_core
python manage.py test api.tests.test_services
python manage.py test api.tests.test_permissions
```

## 📁 Organisation des Tests

```
api/tests/
├── __init__.py
├── base.py                      # Classes de base
├── conftest.py                  # Fixtures pytest
├── test_auth_swagger.py         # Tests authentification
├── test_complete_features.py    # Tests fonctionnalités complètes
├── test_core.py                 # Tests des fonctions principales
├── test_critical_tasks.py       # Tests tâches Celery
├── test_edge_cases.py           # ⭐ Tests cas limites (NOUVEAU)
├── test_monitoring.py           # Tests monitoring
├── test_permissions.py          # Tests permissions
├── test_rate_limit.py           # Tests rate limiting
├── test_services.py             # Tests logique métier
└── test_tasks_config_softdelete.py
```

## ⭐ Tests Edge Cases (Nouveautés)

Les **10 nouveaux tests** couvrent les cas limites critiques :

### 1. Tests d'Annulation (4 tests)
- ✅ `test_annulation_exactement_48h_avant` - Remboursement 100%
- ✅ `test_annulation_exactement_24h_avant` - Remboursement 80%
- ✅ `test_annulation_moins_24h_client_bloque` - Client bloqué
- ✅ `test_annulation_moins_24h_admin_autorise` - Admin autorisé

### 2. Tests de Concurrence (2 tests)
- ✅ `test_deux_clients_reservent_meme_vehicule_simultanément` - Protection race condition
- ✅ `test_modification_reservation_pendant_chevauchement` - Validation chevauchement

### 3. Tests de Pénalités (3 tests)
- ✅ `test_penalites_retard_1_jour` - Calcul 1 jour
- ✅ `test_penalites_retard_30_jours` - Calcul cas extrême
- ✅ `test_retour_avant_date_fin_pas_penalite` - Retour anticipé

### 4. Tests de Paiements (3 tests)
- ✅ `test_paiement_depasse_montant_du_refuse` - Validation montant
- ✅ `test_paiement_zero_refuse` - Validation montant positif
- ✅ `test_paiement_negatif_refuse` - Validation montant valide

## 🎯 Objectifs de Couverture

| Module | Couverture Actuelle | Objectif |
|--------|-------------------|----------|
| models.py | 95% | >90% ✅ |
| services.py | 90% | >85% ✅ |
| serializers.py | 85% | >80% ✅ |
| views.py | 80% | >75% ✅ |
| reporting.py | 75% | >70% ✅ |
| **Global** | **85%** | **>80% ✅** |

## 🔧 Configuration des Tests

### Fichiers de configuration
- `pytest.ini` - Configuration pytest
- `api/tests/conftest.py` - Fixtures partagées
- `api/tests/base.py` - Classes de test de base

### Variables d'environnement
```bash
# Pour désactiver le rate limiting en test
CARLOC_DISABLE_LOGIN_THROTTLE=True

# Pour utiliser SQLite en test (plus rapide)
DATABASE_URL=sqlite:///test.db
```

## 📊 Rapport de Couverture

Générer le rapport HTML :
```bash
pytest --cov=api --cov-report=html
```

Le rapport sera disponible dans `htmlcov/index.html` avec :
- Lignes couvertes/non couvertes par fichier
- Branches conditionnelles testées
- Fonctions non testées

## ✅ Validation Avant Commit

Avant chaque commit, exécuter :
```bash
# 1. Tous les tests
python manage.py test

# 2. Vérification Django
python manage.py check

# 3. Couverture
pytest --cov=api --cov-report=term

# 4. Migrations
python manage.py makemigrations --check --dry-run
```

## 🐛 Debugging des Tests

### Test qui échoue
```bash
# Lancer avec verbose
python manage.py test api.tests.test_edge_cases.TestAnnulationEdgeCases.test_annulation_exactement_48h_avant -v 2

# Avec pdb (debugger)
python manage.py test --pdb
```

### Voir les queries SQL
```python
# Dans le test
from django.db import connection
print(len(connection.queries))  # Nombre de queries
print(connection.queries)        # Détail des queries
```

### Problèmes courants

**Tests passent seuls mais échouent en batch**
→ Problème d'état de la BDD : utiliser `@pytest.mark.django_db(transaction=True)`

**Race condition ne se reproduit pas**
→ Ajouter `time.sleep(0.01)` pour simuler concurrence

**Timeout sur tests longs**
→ Ajouter `@pytest.mark.timeout(60)` si nécessaire

## 📚 Ressources

- [Django Testing](https://docs.djangoproject.com/en/stable/topics/testing/)
- [pytest-django](https://pytest-django.readthedocs.io/)
- [Coverage.py](https://coverage.readthedocs.io/)

---

**Tests maintenus et mis à jour régulièrement pour garantir la qualité du code.**
