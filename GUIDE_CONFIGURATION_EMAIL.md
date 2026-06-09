# 🔧 Guide de Configuration Email - CarLoc

## 🚨 PROBLÈME ACTUEL

Les emails ne partent pas vers les clients avec l'erreur suivante :
```
Brevo API response 401 - Key not found
```

**Cause** : Le backend email est configuré pour Brevo mais la clé API `BREVO_API_KEY` n'est pas définie (ou invalide) sur Render.

**WhatsApp fonctionne** ✅ : Les notifications WhatsApp via Twilio fonctionnent parfaitement.

---

## ✅ SOLUTION 1 : Gmail SMTP (RECOMMANDÉE)

### Pourquoi Gmail ?
- ✅ **Simple** : Pas besoin de compte tiers supplémentaire
- ✅ **Fiable** : 500 emails/jour gratuits (largement suffisant pour CarLoc)
- ✅ **Rapide** : Configuration en 5 minutes
- ✅ **Sécurisé** : Mot de passe d'application Google

### Étapes de Configuration

#### 1. Créer un Mot de Passe d'Application Gmail

1. Allez sur https://myaccount.google.com/apppasswords
2. Connectez-vous avec `rostandngaba@gmail.com`
3. Dans le champ "Nom de l'application", tapez : **CarLoc Backend**
4. Cliquez sur **Créer**
5. Copiez le mot de passe généré (16 caractères sans espaces)
   - Format : `abcdefghijklmnop`
   - ⚠️ **Gardez-le secret** - Ne le partagez jamais

#### 2. Configurer les Variables d'Environnement sur Render

Allez sur https://dashboard.render.com → Votre service backend → Environment

**Ajoutez ou modifiez ces variables** :

```bash
# Backend Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend

# Configuration Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=rostandngaba@gmail.com
EMAIL_HOST_PASSWORD=abcdefghijklmnop   # ← Votre mot de passe d'application

# Expéditeur
DEFAULT_FROM_EMAIL=rostandngaba@gmail.com
CARLOC_ADMIN_EMAIL=rostandngaba@gmail.com

# Provider
EMAIL_PROVIDER=smtp
```

**Supprimez ces variables** (si elles existent) :
- `BREVO_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

#### 3. Redémarrer le Service

Sur Render, cliquez sur **"Manual Deploy" → "Deploy latest commit"**

#### 4. Tester

Créez une réservation depuis le frontend et vérifiez que l'email arrive bien dans la boîte de `rostandngaba@gmail.com`.

---

## 🆓 SOLUTION 2 : Brevo (Anciennement SendinBlue)

### Pourquoi Brevo ?
- ✅ **Gratuit** : 300 emails/jour (plan gratuit)
- ✅ **Professionnel** : API robuste avec statistiques
- ⚠️ **Plus complexe** : Nécessite vérification de l'email expéditeur

### Étapes de Configuration

#### 1. Créer un Compte Brevo (si nécessaire)

1. Allez sur https://www.brevo.com/fr/
2. Créez un compte gratuit avec `rostandngaba@gmail.com`
3. Confirmez votre adresse email

#### 2. Vérifier l'Email Expéditeur

1. Allez sur https://app.brevo.com/senders
2. Cliquez sur **"Add a new sender"**
3. Ajoutez `rostandngaba@gmail.com`
4. Cliquez sur **"Send Confirmation Email"**
5. Ouvrez votre boîte Gmail et cliquez sur le lien de confirmation
6. ⚠️ **Attendez la validation** (peut prendre quelques minutes)

#### 3. Obtenir la Clé API Brevo

1. Allez sur https://app.brevo.com/settings/keys/api
2. Cliquez sur **"Generate a new API key"**
3. Nom de la clé : **CarLoc Backend**
4. Copiez la clé générée
   - Format : `xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxx`
   - ⚠️ **Gardez-la secrète**

#### 4. Configurer les Variables d'Environnement sur Render

Allez sur https://dashboard.render.com → Votre service backend → Environment

**Ajoutez ou modifiez ces variables** :

```bash
# Backend Email
EMAIL_BACKEND=anymail.backends.brevo.EmailBackend

# Configuration Brevo
BREVO_API_KEY=xkeysib-votre-cle-api-ici
BREVO_FROM_NAME=CarLoc

# Expéditeur (doit être vérifié dans Brevo)
DEFAULT_FROM_EMAIL=rostandngaba@gmail.com
CARLOC_ADMIN_EMAIL=rostandngaba@gmail.com

# Provider
EMAIL_PROVIDER=brevo
```

**Supprimez ces variables** (si elles existent) :
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USE_TLS`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `RESEND_API_KEY`

#### 5. Vérifier que Anymail est installé

Sur votre machine locale, vérifiez le fichier `requirements.txt` :

```bash
django-anymail[brevo]>=10.0
```

Si absent, ajoutez-le et commitez.

#### 6. Redémarrer le Service

Sur Render, cliquez sur **"Manual Deploy" → "Deploy latest commit"**

#### 7. Tester

Créez une réservation et vérifiez :
1. L'email arrive dans la boîte du client
2. Les statistiques d'envoi apparaissent dans le dashboard Brevo

---

## 📊 Comparaison des Solutions

| Critère | Gmail SMTP | Brevo |
|---------|-----------|-------|
| **Simplicité** | ⭐⭐⭐⭐⭐ Très simple | ⭐⭐⭐ Moyen |
| **Emails/jour gratuits** | 500 | 300 |
| **Temps de config** | 5 minutes | 15 minutes |
| **Vérification expéditeur** | ❌ Non requis | ✅ Requis |
| **Statistiques d'envoi** | ❌ Basiques | ✅ Avancées |
| **Fiabilité** | ⭐⭐⭐⭐⭐ Excellente | ⭐⭐⭐⭐ Très bonne |

---

## 🧪 Tester l'Envoi d'Emails (Local)

### Test avec la commande Django

```bash
cd gestionlocationbackend
python manage.py test_email rostandngaba@gmail.com
```

Vérifiez la boîte email de `rostandngaba@gmail.com`.

---

## 🐛 Debugging

### Vérifier les Logs sur Render

1. Allez sur https://dashboard.render.com
2. Sélectionnez votre service backend
3. Cliquez sur **"Logs"**
4. Cherchez les lignes contenant `notification` ou `email`

### Logs Attendus (Succès)

```
INFO - Envoi notification type=reservation_creee provider=smtp to=client@example.com
INFO - Notification envoyee avec succes type=reservation_creee provider=smtp to=client@example.com
```

### Logs d'Erreur (Gmail)

```
ERROR - SMTPAuthenticationError: (535, b'5.7.8 Username and Password not accepted')
```
**Solution** : Vérifiez le mot de passe d'application Gmail

```
ERROR - SMTPConnectError: (421, b'Service not available')
```
**Solution** : Vérifiez que `EMAIL_USE_TLS=True` et `EMAIL_PORT=587`

### Logs d'Erreur (Brevo)

```
ERROR - Brevo API response 401 - Key not found
```
**Solution** : Vérifiez que `BREVO_API_KEY` est bien définie sur Render

```
ERROR - Brevo API response 400 - Invalid sender
```
**Solution** : Vérifiez que l'email expéditeur est vérifié dans Brevo (https://app.brevo.com/senders)

---

## 📝 Notes Importantes

### Limites d'Envoi

- **Gmail SMTP** : 500 emails/jour (suffisant pour ~50 réservations/jour)
- **Brevo Gratuit** : 300 emails/jour (suffisant pour ~30 réservations/jour)

### Sécurité

- ⚠️ **Ne commitez JAMAIS** les mots de passe ou clés API dans Git
- ✅ Utilisez toujours les variables d'environnement sur Render
- ✅ Les mots de passe d'application Gmail sont plus sécurisés que votre mot de passe principal

### Emails dans Spam

Si les emails arrivent dans le dossier Spam :
1. Marquez-les comme "Non spam"
2. Ajoutez `rostandngaba@gmail.com` aux contacts
3. Pour Brevo, activez SPF/DKIM dans les paramètres de domaine (optionnel)

---

## ✅ Checklist de Vérification

Avant de considérer que tout fonctionne :

- [ ] Mot de passe d'application Gmail créé (ou clé API Brevo)
- [ ] Variables d'environnement configurées sur Render
- [ ] Anciennes variables supprimées (RESEND, BREVO si Gmail)
- [ ] Service redémarré sur Render
- [ ] Test d'envoi réussi (commande `test_email`)
- [ ] Email de réservation reçu dans la boîte du client
- [ ] Email admin reçu dans `rostandngaba@gmail.com`
- [ ] Aucune erreur dans les logs Render

---

## 🆘 Support

Si les emails ne partent toujours pas après avoir suivi ce guide :

1. Vérifiez les logs Render (section Debugging ci-dessus)
2. Testez avec la commande `python manage.py test_email`
3. Vérifiez que toutes les variables d'environnement sont correctes
4. Assurez-vous que le service a bien été redémarré après modification des variables

---

**Dernière mise à jour** : 9 juin 2026  
**Version** : 1.0  
**Auteur** : Kiro AI Assistant
