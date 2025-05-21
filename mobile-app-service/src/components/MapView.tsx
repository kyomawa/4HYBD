import React, { useRef, useEffect, useState } from "react";
import { IonContent, IonSpinner, IonText, IonAlert } from "@ionic/react";
import { Story } from "../services/story.service";
import { getCurrentLocation, LocationData } from "../services/location.service";
import { MAPS_CONFIG, initGoogleMaps, isGoogleMapsLoaded } from "../config/maps.config";
import "./MapView.css";

interface MapViewProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
}

const MapView: React.FC<MapViewProps> = ({ stories, onStoryClick }) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        // Initialiser l'API Google Maps si nécessaire
        if (!isGoogleMapsLoaded()) {
          await initGoogleMaps();
        }

        // Obtenir la position actuelle
        const location = await getCurrentLocation();
        if (!location) {
          throw new Error("Impossible d'obtenir la position actuelle");
        }

        // Initialiser la carte avec la configuration
        const map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
          center: { lat: location.latitude, lng: location.longitude },
          zoom: MAPS_CONFIG.DEFAULT_ZOOM,
          ...MAPS_CONFIG.MAP_OPTIONS
        });

        mapRef.current = map;

        // Ajouter un marqueur pour la position actuelle
        new google.maps.Marker({
          position: { lat: location.latitude, lng: location.longitude },
          map,
          icon: MAPS_CONFIG.MARKER_OPTIONS.currentLocation
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing map:", error);
        setError(error instanceof Error ? error.message : "Une erreur est survenue lors de l'initialisation de la carte");
        setIsLoading(false);
      }
    };

    initializeMap();

    return () => {
      // Nettoyer les marqueurs
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Nettoyer les marqueurs existants
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Ajouter les nouveaux marqueurs pour chaque story
    stories.forEach(story => {
      if (!story.location) return;

      const marker = new google.maps.Marker({
        position: { 
          lat: story.location.coordinates[1], 
          lng: story.location.coordinates[0] 
        },
        map: mapRef.current,
        icon: {
          ...MAPS_CONFIG.MARKER_OPTIONS.story,
          url: story.userAvatar || undefined
        }
      });

      marker.addListener("click", () => onStoryClick(story));
      markersRef.current.push(marker);
    });
  }, [stories, onStoryClick]);

  if (isLoading) {
    return (
      <div className="map-loading">
        <IonSpinner name="crescent" />
        <IonText>Chargement de la carte...</IonText>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <IonAlert
          isOpen={!!error}
          header="Erreur"
          message={error}
          buttons={['OK']}
          onDidDismiss={() => setError(null)}
        />
        <div className="map-error">
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        </div>
      </>
    );
  }

  return <div id="map" className="map-container" />;
};

export default MapView; 