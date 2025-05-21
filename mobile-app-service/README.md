# BeUnreal Mobile App

Application mobile de partage de moments en temps réel, construite avec Ionic et React.

## Configuration de l'environnement

1. Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Configuration de l'API
VITE_API_URL=http://localhost:3000/api

# Clé API Google Maps
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Configuration de l'environnement
NODE_ENV=development

# Configuration de l'application
VITE_APP_NAME=BeUnreal
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION="BeUnreal - Partagez vos moments en temps réel"
```

2. Obtenez une clé API Google Maps :
   - Allez sur la [Console Google Cloud](https://console.cloud.google.com)
   - Créez un nouveau projet ou sélectionnez un projet existant
   - Activez l'API Maps JavaScript et l'API Places
   - Créez une clé API avec les restrictions appropriées
   - Copiez la clé API dans votre fichier `.env`

## Installation

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Construire pour la production
npm run build

# Lancer sur Android
npm run android
```

## Fonctionnalités

- Partage de photos et vidéos en temps réel
- Géolocalisation des stories
- Interface utilisateur moderne et intuitive
- Support du mode sombre
- Notifications en temps réel
- Gestion des amis et des abonnements

## Structure du projet

```
mobile-app-service/
├── src/
│   ├── components/     # Composants React réutilisables
│   ├── pages/         # Pages de l'application
│   ├── services/      # Services et logique métier
│   ├── contexts/      # Contextes React
│   ├── config/        # Configuration
│   ├── assets/        # Ressources statiques
│   └── theme/         # Thèmes et styles
├── public/            # Fichiers publics
└── android/          # Configuration Android
```

## Développement

### Prérequis

- Node.js 16+
- npm 7+
- Android Studio (pour le développement Android)
- JDK 11+

### Scripts disponibles

- `npm run dev` : Démarre le serveur de développement
- `npm run build` : Construit l'application pour la production
- `npm run android` : Lance l'application sur un appareil/émulateur Android
- `npm run test` : Lance les tests
- `npm run lint` : Vérifie le code avec ESLint

## Contribution

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/amazing-feature`)
3. Committez vos changements (`git commit -m 'Add some amazing feature'`)
4. Poussez vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
