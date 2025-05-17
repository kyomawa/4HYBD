# BeUnreal - Application Mobile Hybride

BeUnreal est une application mobile hybride inspirée de BeReal, développée avec Ionic React et Capacitor. Elle permet aux utilisateurs de prendre des photos, les partager, suivre d'autres utilisateurs, et communiquer via messagerie.

## Fonctionnalités

### Authentification

- Connexion & Inscription
- Gestion de session utilisateur
- Profils utilisateurs

### Flux Social

- Feed des publications des utilisateurs suivis
- Prise de photo avec appareil photo du device
- Ajout de légendes aux photos
- Likes et commentaires

### Profil Utilisateur

- Photo de profil personnalisable
- Affichage des publications de l'utilisateur
- Statistiques de followers/following

### Recherche & Découverte

- Recherche d'utilisateurs
- Suggestions d'utilisateurs à suivre
- Système follow/unfollow

### Messagerie

- Conversations directes entre utilisateurs
- Création de groupes de discussion
- Envoi de textes et photos dans les conversations

### Design & UX

- Interface noir et blanc
- Support du mode sombre
- Design responsive
- Navigation fluide entre écrans

## Architecture

### Structure des dossiers

```
src/
├── components/        # Composants UI réutilisables
├── contexts/          # Contextes React pour le state global
├── hooks/             # Hooks personnalisés
├── pages/             # Pages/écrans de l'application
├── services/          # Services pour l'API et le stockage local
└── theme/             # Variables CSS et configuration du thème
```

### Technologies utilisées

- **Ionic Framework**: UI components
- **React**: Bibliothèque UI
- **Capacitor**: API natives (Camera, Preferences, Notifications)
- **TypeScript**: Type safety
- **CSS Modules**: Styling

## Services

### AuthService

Gère tout ce qui concerne l'authentification, les profils utilisateurs et la gestion des relations entre utilisateurs (follow/unfollow).

### PostService

S'occupe de la création, récupération et interaction avec les publications (posts).

### ChatService

Gère la messagerie entre utilisateurs, conversations individuelles et de groupe.

### CameraService

Interface avec l'API Camera de Capacitor pour la capture photo.

### StorageService

Stockage local des données utilisateur et des préférences.

### NotificationService

Gestion des notifications locales quotidiennes.

## Pages principales

### Login & Register

Écrans d'authentification permettant aux utilisateurs de créer un compte ou de se connecter.

### Home (Feed)

Affiche les publications des utilisateurs suivis. Permet de prendre des photos et de voir le contenu des autres.

### Search

Permet de rechercher d'autres utilisateurs et de les suivre.

### Profile

Affiche le profil de l'utilisateur avec ses photos et statistiques. Remplace l'ancienne page Gallery.

### Chat

Système de messagerie pour communiquer avec d'autres utilisateurs.

### Settings

Paramètres de l'application et notifications.

## Installation et exécution

### Prérequis

- Node.js 14+
- NPM ou Yarn
- Ionic CLI (`npm install -g @ionic/cli`)

### Installation

```bash
# Cloner le dépôt
git clone [URL_DU_REPO]
cd beunreal

# Installer les dépendances
npm install

# Démarrer en mode développement
ionic serve
```

### Build pour plateformes mobiles

```bash
# Ajouter la plateforme Android
ionic cap add android

# Ajouter la plateforme iOS
ionic cap add ios

# Build du projet
ionic cap build android
ionic cap build ios
```

## Notes d'implémentation

### Frontend uniquement

Cette version ne contient que la partie frontend. Le backend devra être implémenté séparément, mais la structure a été conçue pour faciliter cette intégration future.

### Mockup des données

Les données sont actuellement mockées localement via Capacitor Preferences. Dans une version de production, toutes les fonctions des services devront être modifiées pour appeler des API REST.

### Responsive design

L'interface est optimisée pour les mobiles mais reste utilisable sur desktop pour faciliter le développement.

## Améliorations futures

- Intégration avec un backend (Firebase, Node.js, etc.)
- Tests unitaires et E2E
- Optimisations de performance
- Localisation multi-langue
- Push notifications
- Mode hors-ligne
