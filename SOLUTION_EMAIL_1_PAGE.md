# ⚡ Solution Email CarLoc - 1 Page

## 🚨 PROBLÈME

```
❌ Erreur: Brevo API response 401 - Key not found
❌ Emails ne partent pas
✅ WhatsApp fonctionne
```

**Cause** : Clé API Brevo manquante sur Render

---

## ✅ SOLUTION (5 MINUTES)

### Étape 1 : Créer Mot de Passe Gmail

1. Allez sur : https://myaccount.google.com/apppasswords
2. Nom : **CarLoc Backend**
3. Cliquez **Créer**
4. **Copiez** le mot de passe (16 caractères)

### Étape 2 : Configurer Render

Dashboard Render → Service Backend → **Environment**

**✅ AJOUTER ces variables** :

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=rostandngaba@gmail.com
EMAIL_HOST_PASSWORD=xxxx_xxxx_xxxx_xxxx
DEFAULT_FROM_EMAIL=rostandngaba@gmail.com
CARLOC_ADMIN_EMAIL=rostandngaba@gmail.com
EMAIL_PROVIDER=smtp
```

**❌ SUPPRIMER ces variables** :

```bash
BREVO_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
```

### Étape 3 : Redémarrer

**Manual Deploy** → **Deploy latest commit**

### Étape 4 : Tester

Créez une réservation sur : https://carloc-smoky.vercel.app

---

## 🧪 TEST LOCAL (Optionnel)

```bash
# Double-cliquez sur :
TEST_EMAIL_LOCAL.bat

# Ou manuellement :
cd gestionlocationbackend
python manage.py test_email votre@email.com
```

---

## 🔍 VÉRIFICATION

### Logs Render (Succès)

```
INFO - Envoi notification type=reservation_creee provider=smtp to=client@example.com
INFO - Notification envoyee avec succes
```

### Logs Render (Erreur)

```
ERROR - SMTPAuthenticationError (535)
→ Mot de passe incorrect, recréez-le

ERROR - Connection refused
→ Vérifiez EMAIL_PORT=587 et EMAIL_USE_TLS=True
```

---

## 🆘 AIDE

| Problème | Solution |
|----------|----------|
| Mot de passe ne fonctionne pas | Activez validation 2 étapes : https://myaccount.google.com/security |
| Emails dans spam | Marquez "Non spam" + ajoutez aux contacts |
| Erreur 535 | Mot de passe incorrect → Recréez-le |
| Connection refused | Port incorrect → `EMAIL_PORT=587` |

---

## 📚 DOCUMENTATION COMPLÈTE

- **Solution rapide détaillée** : `FIX_EMAIL_RAPIDE.md`
- **Guide complet (Gmail + Brevo)** : `GUIDE_CONFIGURATION_EMAIL.md`
- **Analyse du problème** : `RESUME_PROBLEME_EMAIL.md`
- **Point d'entrée** : `LISEZ_MOI_EMAIL.md`

---

## ✅ CHECKLIST

- [ ] Mot de passe Gmail créé
- [ ] 9 variables ajoutées sur Render
- [ ] 3 variables supprimées
- [ ] Service redémarré
- [ ] Email de test reçu

---

**Temps** : 5 minutes | **Difficulté** : ⭐ Facile | **Fiabilité** : ⭐⭐⭐⭐⭐

**Date** : 9 juin 2026 | **Version** : 1.0
