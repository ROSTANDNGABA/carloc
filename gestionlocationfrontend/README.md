# Frontend CarLoc

Application Angular de CarLoc.

## Commandes

```bash
npm install
npm start
npm run build:prod
```

## Configuration API

- Developpement: `src/environments/environment.ts`
- Production: `src/environments/environment.prod.ts`

Avant le deploiement Vercel, remplacer l'URL Render dans `environment.prod.ts`.

## Routes principales

- `/admin`: interface super administrateur
- `/gestionnaire`: interface gestionnaire
- `/client`: interface client
- `/login`: connexion
