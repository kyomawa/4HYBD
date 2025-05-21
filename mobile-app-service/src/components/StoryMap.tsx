import React, { useState, useEffect } from "react";
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
  IonText,
  IonItem,
  IonAvatar,
  IonLabel,
  IonAlert,
} from "@ionic/react";
import { 
  navigateOutline, 
  locationOutline, 
  reloadOutline, 
  imageOutline,
  personOutline,
  eyeOutline
} from "ionicons/icons";
import { Geolocation } from "@capacitor/geolocation";
import { getNearbyStories, StoryWithUser } from "../services/story.service";
import { getCurrentLocation } from "../services/location.service";
import "./StoryMap.css";

interface StoryMapProps {
  onStorySelect: (story: StoryWithUser) => void;
  onLocationError: (error: string) => void;
}

const StoryMap: React.FC<StoryMapProps> = ({ onStorySelect, onLocationError }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<StoryWithUser[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [permissionAlert, setPermissionAlert] = useState<boolean>(false);
  const [searchRadius, setSearchRadius] = useState<number>(5); // default 5km

  useEffect(() => {
    loadUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadNearbyStories();
    }
  }, [userLocation, searchRadius]);

  const loadUserLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check permissions first
      const permStatus = await Geolocation.checkPermissions();
      
      if (permStatus.location !== "granted") {
        const requestResult = await Geolocation.requestPermissions();
        if (requestResult.location !== "granted") {
          setPermissionAlert(true);
          setError("Location permission is required to find nearby stories");
          setLoading(false);
          return;
        }
      }

      // Get location from our service that handles caching
      const location = await getCurrentLocation();
      
      if (location) {
        setUserLocation({
          latitude: location.latitude,
          longitude: location.longitude
        });
      } else {
        // Fallback to direct Capacitor API if our service fails
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }
    } catch (err) {
      console.error("Error getting location:", err);
      setError("Could not determine your location. Please check your location settings.");
      onLocationError("Could not determine your location");
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyStories = async () => {
    if (!userLocation) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get stories within the selected radius
      const nearbyStories = await getNearbyStories(searchRadius);
      setStories(nearbyStories);
      
      if (nearbyStories.length === 0) {
        setError(`No stories found within ${searchRadius}km of your location`);
      }
    } catch (err) {
      console.error("Error loading nearby stories:", err);
      setError("Failed to load nearby stories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadUserLocation();
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance}km`;
  };

  if (loading && !userLocation) {
    return (
      <div className="story-map-loading">
        <IonSpinner name="circles" />
        <IonText color="medium">
          <p>Finding your location...</p>
        </IonText>
      </div>
    );
  }

  return (
    <div className="story-map-container">
      <div className="story-map-header">
        <div className="story-map-location">
          <IonIcon icon={locationOutline} color="primary" />
          {userLocation ? (
            <IonText>
              <span className="story-map-coordinates">
                {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </span>
            </IonText>
          ) : (
            <IonText color="danger">
              <span>Location unavailable</span>
            </IonText>
          )}
        </div>
        
        <div className="story-map-actions">
          <IonButton 
            size="small" 
            fill="clear" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <IonIcon slot="icon-only" icon={reloadOutline} />
          </IonButton>
        </div>
      </div>

      <div className="story-map-radius-selector">
        <IonText color="medium">Search radius:</IonText>
        <div className="radius-buttons">
          {[1, 5, 10, 20].map(radius => (
            <IonButton 
              key={radius} 
              size="small" 
              fill={searchRadius === radius ? "solid" : "outline"}
              onClick={() => setSearchRadius(radius)}
            >
              {radius}km
            </IonButton>
          ))}
        </div>
      </div>

      {error && (
        <div className="story-map-error">
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
          {error.includes("No stories found") && (
            <IonButton 
              size="small" 
              expand="block" 
              onClick={() => setSearchRadius(prev => Math.min(prev * 2, 50))}
            >
              Increase Search Radius
            </IonButton>
          )}
        </div>
      )}

      {loading && stories.length > 0 && (
        <div className="story-map-loading-overlay">
          <IonSpinner name="dots" />
        </div>
      )}

      <div className="story-map-list">
        {stories.length > 0 ? (
          stories.map(story => {
            const distance = story.location && userLocation 
              ? calculateDistance(
                  userLocation.latitude, 
                  userLocation.longitude, 
                  story.location.latitude, 
                  story.location.longitude
                ) 
              : null;
            
            return (
              <IonCard key={story.id} className="story-map-card" onClick={() => onStorySelect(story)}>
                <IonCardHeader>
                  <div className="story-card-header">
                    <IonItem lines="none" className="story-user-item">
                      <IonAvatar slot="start">
                        {story.user.profilePicture ? (
                          <img src={story.user.profilePicture} alt={story.user.username} />
                        ) : (
                          <div className="default-avatar">
                            <IonIcon icon={personOutline} />
                          </div>
                        )}
                      </IonAvatar>
                      <IonLabel>
                        <h2>{story.user.username}</h2>
                        {distance !== null && (
                          <p className="distance-text">
                            <IonIcon icon={navigateOutline} /> {formatDistance(distance)}
                          </p>
                        )}
                      </IonLabel>
                      {story.viewed ? (
                        <IonBadge color="medium" slot="end">Viewed</IonBadge>
                      ) : (
                        <IonBadge color="primary" slot="end">New</IonBadge>
                      )}
                    </IonItem>
                  </div>
                </IonCardHeader>
                
                <IonCardContent>
                  <div className="story-preview">
                    <div className="story-thumbnail">
                      <IonIcon icon={imageOutline} size="large" />
                      <div className="story-overlay">
                        <div className="story-stats">
                          <IonIcon icon={eyeOutline} />
                          <span>{story.views.length}</span>
                        </div>
                      </div>
                    </div>
                    {story.caption && (
                      <div className="story-caption">
                        <IonText>
                          <p>{story.caption}</p>
                        </IonText>
                      </div>
                    )}
                  </div>
                </IonCardContent>
              </IonCard>
            );
          })
        ) : !loading && !error ? (
          <div className="empty-stories">
            <IonText color="medium">
              <h5>No stories nearby</h5>
              <p>Be the first to share a moment in this area!</p>
            </IonText>
          </div>
        ) : null}
      </div>

      <IonAlert
        isOpen={permissionAlert}
        onDidDismiss={() => setPermissionAlert(false)}
        header="Location Permission Required"
        message="This app needs location permission to find stories near you. Please enable location in your device settings."
        buttons={[
          {
            text: 'OK',
            handler: () => {
              setPermissionAlert(false);
            }
          }
        ]}
      />
    </div>
  );
};

export default StoryMap;