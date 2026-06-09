# ⚡ Correction Rapide Email - CarLoc

## 🚨 Problème Actuel

**Erreur** : `Brevo API response 401 - Key not found`

**Cause** : La clé API Brevo n'est pas configurée sur Render.

---

## ✅ Solution Rapide (5 minutes) - Gmail SMTP

### Étape 1 : Créer un Mot de Passe d'Application Gmail

1. Allez sur : https://myaccount.google.com/apppasswords
2. Connectez-vous avec **rostandngaba@gmail.com**
3. Nom de l'application : **CarLoc Backend**
4. Cliquez sur **Créer**
5. **Copiez** le mot de passe généré (16 caractères)

### Étape 2 : Configurer sur Render

1. Allez sur : https://dashboard.render.com
2. Sélectionnez votre service **carloc-backend** (ou similaire)
3. Cliquez sur **Environment** dans le menu de gauche
4. **Ajoutez ou modifiez** ces variables :

```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=rostandngaba@gmail.com
EMAIL_HOST_PASSWORD=votre_mot_de_passe_dapplication_16_caracteres
DEFAULT_FROM_EMAIL=rostandngaba@gmail.com
CARLOC_ADMIN_EMAIL=rostandngaba@gmail.com
EMAIL_PROVIDER=smtp
```

5. **Supprimez** ces variables (si elles existent) :
   - `BREVO_API_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`

### Étape 3 : Redémarrer

Cliquez sur **Manual Deploy** → **Deploy latest commit**

### Étape 4 : Tester

Créez une nouvelle réservation depuis le frontend :
- https://carloc-smoky.vercel.app

Vérifiez que l'email arrive dans la boîte Gmail du client.

---

## 📋 Variables Render Complètes

Voici toutes les variables d'environnement nécessaires pour l'email :

```bash
# Backend Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend

# Configuration Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=rostandngaba@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx   # ← Mot de passe d'application (sans espaces)

# Expéditeur
DEFAULT_FROM_EMAIL=rostandngaba@gmail.com
CARLOC_ADMIN_EMAIL=rostandngaba@gmail.com

# Provider
EMAIL_PROVIDER=smtp
```

---

## 🧪 Test Local (Optionnel)

Si vous voulez tester localement avant de déployer :

1. Ouvrez le fichier `.env` local :
   ```
   gestionlocationbackend\.env
   ```

2. Ajoutez les mêmes variables que ci-dessus

3. Testez :
   ```bash
   cd gestionlocationbackend
   python manage.py test_email rostandngaba@gmail.com
   ```

4. Vérifiez votre boîte Gmail

---

## 🔍 Vérifier les Logs sur Render

Après redémarrage :

1. Allez sur **Logs** dans le menu Render
2. Cherchez les lignes contenant `notification` ou `email`
3. **Succès attendu** :
   ```
   INFO - Envoi notification type=reservation_creee provider=smtp to=client@example.com
   INFO - Notification envoyee avec succes type=reservation_creee provider=smtp to=client@example.com
   ```

4. **Si erreur** :
   - `SMTPAuthenticationError (535)` → Mot de passe incorrect
   - `SMTPConnectError (421)` → Vérifiez EMAIL_HOST et EMAIL_PORT

---

## ❓ FAQ

**Q : Le mot de passe d'application ne fonctionne pas ?**  
R : Assurez-vous de copier les 16 caractères **sans espaces** dans Render.

**Q : Je n'arrive pas à créer un mot de passe d'application ?**  
R : Vérifiez que la validation en 2 étapes est activée sur votre compte Google :
   https://myaccount.google.com/security

**Q : Les emails arrivent dans le spam ?**  
R : Marquez-les comme "Non spam" et ajoutez rostandngaba@gmail.com aux contacts.

**Q : Je préfère utiliser Brevo au lieu de Gmail ?**  
R : Consultez le guide complet : `GUIDE_CONFIGURATION_EMAIL.md` (Section "Solution 2")

---

## ✅ Checklist Rapide

- [ ] Mot de passe d'application Gmail créé
- [ ] Variables EMAIL_* configurées sur Render
- [ ] Variables BREVO_* et RESEND_* supprimées
- [ ] Service redémarré sur Render
- [ ] Email de test reçu dans Gmail

---

**Temps estimé** : 5 minutes  
**Difficulté** : ⭐ Facile  
**Fiabilité** : ⭐⭐⭐⭐⭐ Excellente

---

📖 **Guide complet** : Voir `GUIDE_CONFIGURATION_EMAIL.md`  
🐛 **Diagnostic** : Exécutez `DIAGNOSTIC_EMAIL.bat`
