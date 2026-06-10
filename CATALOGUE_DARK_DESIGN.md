# 🎨 Design Catalogue - Thème Noir/Gold

## Palette Couleurs

### Fond
- **Background principal** : `bg-black` (#000000)
- **Background secondaire** : `bg-gray-900` (#111827)
- **Background cards** : `bg-gray-900` avec `border-gray-800`

### Accents
- **Gold/Amber principal** : `text-amber-400` / `bg-amber-400` (#FBBF24)
- **Gold hover** : `bg-amber-500` (#F59E0B)
- **Gold glow** : `shadow-amber-500/20`

### Texte
- **Titre** : `text-white`
- **Texte secondaire** : `text-gray-300`
- **Texte muted** : `text-gray-400` / `text-gray-500`

### Bordures
- **Bordure standard** : `border-gray-800`
- **Bordure hover** : `border-amber-500/50`

### Status Badges
- **Disponible** : `bg-amber-500/20 text-amber-400 border-amber-500/30`
- **Maintenance** : `bg-orange-500/20 text-orange-400 border-orange-500/30`
- **Indisponible** : `bg-gray-700/50 text-gray-400 border-gray-600`

## Classes Tailwind à Utiliser

```css
/* Hero Section */
bg-gradient-to-br from-black via-gray-900 to-black
border-b border-gray-800

/* Cards */
bg-gray-900 border border-gray-800 rounded-2xl
hover:border-amber-500/50 hover:shadow-amber-500/10

/* Buttons Primary */
bg-amber-400 text-black font-bold
hover:bg-amber-500 hover:shadow-amber-500/40
hover:-translate-y-0.5

/* Inputs */
bg-black border border-gray-700 text-white
focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20

/* Modal */
bg-gray-900 border border-gray-800
backdrop-blur-sm

/* Skeleton Loading */
bg-gray-900 border border-gray-800 animate-pulse
bg-gray-800 (pour les rectangles de contenu)
```

## Modifications à Appliquer

1. **Remplacer** toutes les références `carloc-600` par `amber-400`
2. **Remplacer** `bg-gray-50` / `bg-white` par `bg-black` / `bg-gray-900`
3. **Remplacer** `text-gray-900` par `text-white`
4. **Remplacer** `text-gray-600` par `text-gray-300` ou `text-gray-400`
5. **Ajouter** des effets glow ambrés sur hover : `hover:shadow-amber-500/10`

## Le fichier est trop long pour être modifié en une seule fois

Il faut le recréer complètement ou le modifier section par section.
