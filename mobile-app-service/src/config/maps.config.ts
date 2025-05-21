// Configuration de l'API Google Maps
export const MAPS_CONFIG = {
  // La clé API doit être définie dans les variables d'environnement
  API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  
  // Configuration par défaut de la carte
  DEFAULT_CENTER: {
    lat: 48.8566, // Paris par défaut
    lng: 2.3522
  },
  
  DEFAULT_ZOOM: 13,
  
  // Options de la carte
  MAP_OPTIONS: {
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true,
    gestureHandling: 'greedy'
  },
  
  // Configuration des marqueurs
  MARKER_OPTIONS: {
    currentLocation: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2
    },
    story: {
      scaledSize: new google.maps.Size(40, 40)
    }
  }
};

// Fonction d'initialisation de l'API Google Maps
export const initGoogleMaps = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const callback = 'initMap';
    window[callback] = () => {
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_CONFIG.API_KEY}&libraries=places&callback=${callback}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      reject(new Error('Erreur lors du chargement de l\'API Google Maps'));
    };
    document.head.appendChild(script);
  });
};

// Fonction pour vérifier si l'API est chargée
export const isGoogleMapsLoaded = (): boolean => {
  return !!(window.google && window.google.maps);
};

// Déclaration des types globaux
declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
} 