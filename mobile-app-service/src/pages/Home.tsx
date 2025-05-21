import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonTitle,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonText,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonModal,
  IonBadge,
  IonAlert,
  IonLabel,
  RefresherEventDetail,
  SegmentCustomEvent,
} from "@ionic/react";
import {
  camera,
  locationOutline,
  people,
  chevronDownCircle,
  imageOutline,
} from "ionicons/icons";
import { useAuthContext } from "../contexts/AuthContext";
import { getFeedStories, StoryWithUser } from "../services/story.service";
import { takePicture } from "../services/camera.service";
import { CameraResultType, CameraSource } from "@capacitor/camera";
import CameraView from "../components/CameraView";
import StoryCircles from "../components/StoryCircles";
import StoryMap from "../components/StoryMap";
import StoryViewer from "../components/StoryViewer";
import StoryCapture from "../components/StoryCapture";
import logoImage from "../assets/logo.png";
import "./Home.css";

const Home: React.FC = () => {
  const { user } = useAuthContext();

  const [stories, setStories] = useState<StoryWithUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSegment, setSelectedSegment] = useState<string>("feed");
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<any>(null);
  const [showStoryCapture, setShowStoryCapture] = useState<boolean>(false);
  const [showStoryViewer, setShowStoryViewer] = useState<boolean>(false);
  const [selectedStory, setSelectedStory] = useState<StoryWithUser | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationAlert, setShowLocationAlert] = useState<boolean>(false);

  // Load stories when component mounts or refreshes
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      setIsLoading(true);
      const loadedStories = await getFeedStories();
      setStories(loadedStories);
    } catch (error) {
      console.error("Error loading stories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = (event: CustomEvent<RefresherEventDetail>) => {
    loadStories().then(() => {
      event.detail.complete();
    });
  };

  const handleSegmentChange = (e: SegmentCustomEvent) => {
    setSelectedSegment(e.detail.value as string);
  };

  // Conservé pour implémenter un futur bouton de prise de photo
  const handleTakePhoto = async () => {
    try {
      const photo = await takePicture({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1200,
        height: 1600,
        correctOrientation: true,
        presentationStyle: "fullscreen",
      });

      if (photo && photo.webPath) {
        setCapturedPhoto({
          id: `temp_${Date.now()}`,
          webPath: photo.webPath,
          timestamp: Date.now(),
          type: "story"
        });
        setShowCameraModal(false);
        setShowStoryCapture(true);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    }
  };

  const handlePhotoTaken = (webPath: string) => {
    setCapturedPhoto({
      id: `temp_${Date.now()}`,
      webPath,
      timestamp: Date.now(),
      type: "story"
    });
    setShowCameraModal(false);
    setShowStoryCapture(true);
  };

  const handleStoryPublished = () => {
    setShowStoryCapture(false);
    setCapturedPhoto(null);
    loadStories();
  };

  const handleStorySelected = (story: StoryWithUser) => {
    setSelectedStory(story);
    setShowStoryViewer(true);
  };

  const handleLocationError = (error: string) => {
    setLocationError(error);
    setShowLocationAlert(true);
  };

  const renderFeedContent = () => {
    if (isLoading) {
      return (
        // @ts-ignore
        <div className="spinner-container">
          {/* @ts-ignore */}
          <IonSpinner name="crescent" color="primary" />
          {/* @ts-ignore */}
          <IonText color="medium">
            <p>Loading stories...</p>
          </IonText>
        </div>
      );
    }

    if (stories.length === 0) {
      return (
        // @ts-ignore
        <div className="empty-feed">
          {/* @ts-ignore */}
          <IonIcon icon={imageOutline} className="empty-feed-icon" />
          <h2>No Stories Yet</h2>
          <p>Follow users or share your first story to see content here</p>
          {/* @ts-ignore */}
          <div className="empty-feed-actions">
            {/* @ts-ignore */}
            <IonButton 
              fill="solid" 
              onClick={() => setShowCameraModal(true)}
            >
              {/* @ts-ignore */}
              <IonIcon slot="start" icon={camera} />
              Take Photo
            </IonButton>
            {/* @ts-ignore */}
            <IonButton 
              fill="outline" 
              routerLink="/app/search"
            >
              Find People
            </IonButton>
          </div>
        </div>
      );
    }

    return (
      // @ts-ignore
      <div className="stories-feed">
        <StoryCircles stories={stories} onStorySelect={handleStorySelected} />
      </div>
    );
  };

  return (
    <IonPage className="home-page">
      {/* @ts-ignore */}
      <IonHeader>
        {/* @ts-ignore */}
        <IonToolbar>
          {/* @ts-ignore */}
          <div className="home-title-container">
            <img src={logoImage} alt="Logo" className="header-logo" />
            {/* @ts-ignore */}
            <IonTitle>BeUnreal</IonTitle>
          </div>
        </IonToolbar>
      </IonHeader>

      {/* @ts-ignore */}
      <IonContent fullscreen>
        {/* @ts-ignore */}
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          {/* @ts-ignore */}
          <IonRefresherContent
            pullingIcon={chevronDownCircle}
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing..."
          />
        </IonRefresher>

        {/* @ts-ignore */}
        <IonSegment 
          value={selectedSegment} 
          onIonChange={handleSegmentChange} 
          className="feed-segment"
        >
          {/* @ts-ignore */}
          <IonSegmentButton value="feed">
            {/* @ts-ignore */}
            <IonIcon icon={people} />
            {/* @ts-ignore */}
            <IonLabel>Feed</IonLabel>
          </IonSegmentButton>
          {/* @ts-ignore */}
          <IonSegmentButton value="nearby">
            {/* @ts-ignore */}
            <IonIcon icon={locationOutline} />
            {/* @ts-ignore */}
            <IonLabel>
              Nearby
              {locationError && (
                /* @ts-ignore */
                <IonBadge color="danger" className="location-badge">!</IonBadge>
              )}
            </IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {selectedSegment === "feed" ? (
          renderFeedContent()
        ) : (
          <StoryMap 
            onStorySelect={handleStorySelected} 
            onLocationError={handleLocationError} 
          />
        )}

        {/* @ts-ignore */}
        <IonModal 
          isOpen={showCameraModal} 
          onDidDismiss={() => setShowCameraModal(false)} 
          className="camera-modal"
        >
          <CameraView 
            onPhotoTaken={handlePhotoTaken} 
            onClose={() => setShowCameraModal(false)} 
          />
        </IonModal>

        {/* @ts-ignore */}
        <IonModal 
          isOpen={showStoryCapture} 
          onDidDismiss={() => {
            setShowStoryCapture(false);
            setCapturedPhoto(null);
          }} 
          className="story-capture-modal"
        >
          {capturedPhoto && (
            <StoryCapture 
              photoData={capturedPhoto} 
              onCancel={() => {
                setShowStoryCapture(false);
                setCapturedPhoto(null);
              }}
              onSuccess={handleStoryPublished}
            />
          )}
        </IonModal>

        {selectedStory && (
          <StoryViewer
            story={selectedStory}
            isOpen={showStoryViewer}
            onClose={() => {
              setShowStoryViewer(false);
              setSelectedStory(null);
            }}
            onDelete={() => {
              setShowStoryViewer(false);
              setSelectedStory(null);
              loadStories();
            }}
            currentUser={user}
          />
        )}

        {/* @ts-ignore */}
        <IonAlert
          isOpen={showLocationAlert}
          onDidDismiss={() => setShowLocationAlert(false)}
          header="Location Error"
          message={locationError || "Error accessing your location. Please check your settings."}
          buttons={[
            {
              text: "OK",
              role: "cancel",
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default Home;