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
  IonFab,
  IonFabButton,
  IonSegment,
  IonSegmentButton,
  IonModal,
  IonBadge,
  IonAlert,
  IonLabel,
  RefresherEventDetail,
  useIonRouter,
  SegmentCustomEvent,
} from "@ionic/react";
import {
  camera,
  images,
  locationOutline,
  searchOutline,
  people,
  refresh,
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
  const router = useIonRouter();

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
        <div className="spinner-container">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading stories...</p>
          </IonText>
        </div>
      );
    }

    if (stories.length === 0) {
      return (
        <div className="empty-feed">
          <IonIcon icon={imageOutline} className="empty-feed-icon" />
          <h2>No Stories Yet</h2>
          <p>Follow users or share your first story to see content here</p>
          <div className="empty-feed-actions">
            <IonButton fill="solid" onClick={() => setShowCameraModal(true)}>
              <IonIcon icon={camera} />
              Take Photo
            </IonButton>
            <IonButton fill="outline" routerLink="/app/search">
              Find People
            </IonButton>
          </div>
        </div>
      );
    }

    return (
      <div className="stories-feed">
        <StoryCircles stories={stories} onStorySelect={handleStorySelected} />
      </div>
    );
  };

  return (
    <IonPage className="home-page">
      <IonHeader>
        <IonToolbar>
          <div className="home-title-container">
            <img src={logoImage} alt="Logo" className="header-logo" />
            <IonTitle>BeUnreal</IonTitle>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon={chevronDownCircle}
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing..."
          />
        </IonRefresher>

        <IonSegment value={selectedSegment} onIonChange={handleSegmentChange} className="feed-segment">
          <IonSegmentButton value="feed">
            <IonIcon icon={people} />
            <IonLabel>Feed</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="nearby">
            <IonIcon icon={locationOutline} />
            <IonLabel>
              Nearby
              {locationError && <IonBadge color="danger" className="location-badge">!</IonBadge>}
            </IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {selectedSegment === "feed" ? (
          renderFeedContent()
        ) : (
          <StoryMap onStorySelect={handleStorySelected} onLocationError={handleLocationError} />
        )}

        <IonModal isOpen={showCameraModal} onDidDismiss={() => setShowCameraModal(false)} className="camera-modal">
          <CameraView onPhotoTaken={handlePhotoTaken} onClose={() => setShowCameraModal(false)} />
        </IonModal>

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