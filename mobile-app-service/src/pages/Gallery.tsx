import React, { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonImg,
  IonActionSheet,
  IonAlert,
  IonButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonText,
  RefresherEventDetail,
  IonItem,
  IonLabel,
  IonModal,
  IonBackButton,
  IonButtons,
} from "@ionic/react";
import {
  trash,
  ellipsisVertical,
  calendar,
  time,
  chevronDownCircle,
  expandOutline,
  closeCircle,
  share,
} from "ionicons/icons";
import usePhotos from "../hooks/usePhotos";
import { PhotoData } from "../services/camera.service";
import { getAuthToken } from "../services/auth.service";
import { API_URL } from "../config";
import "./Gallery.css";

const Gallery: React.FC = () => {
  const { photos, loading, error, refreshPhotos, removePhoto, clearAllPhotos } = usePhotos();
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [showActionSheet, setShowActionSheet] = useState<boolean>(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false);
  const [showDeleteAllAlert, setShowDeleteAllAlert] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showShareAlert, setShowShareAlert] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareMessage, setShareMessage] = useState<string>("");

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await refreshPhotos();
    event.detail.complete();
  };

  const handlePhotoAction = (photo: PhotoData) => {
    setSelectedPhoto(photo);
    setShowActionSheet(true);
  };

  const handleDeletePhoto = async () => {
    if (selectedPhoto) {
      await removePhoto(selectedPhoto.id);
      setSelectedPhoto(null);
      setShowDeleteAlert(false);
    }
  };

  const handleDeleteAllPhotos = async () => {
    await clearAllPhotos();
    setShowDeleteAllAlert(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFullscreenView = (photo: PhotoData) => {
    setSelectedPhoto(photo);
    setShowModal(true);
  };

  const handleSharePhoto = async () => {
    if (!selectedPhoto) return;

    setIsSharing(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        setShareMessage("Authentication required to share photo");
        setShowShareAlert(true);
        return;
      }

      // Check if photo has a server URL, if not it needs to be uploaded first
      if (!selectedPhoto.serverUrl) {
        setShareMessage("This photo needs to be uploaded to the server first. Please try again when you're online.");
        setShowShareAlert(true);
        return;
      }

      // Share to the social feed
      const response = await fetch(`${API_URL}/api/stories/share`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photo_url: selectedPhoto.serverUrl,
          caption: "Shared from my gallery",
        }),
      });

      if (response.ok) {
        setShareMessage("Photo shared successfully to your social feed!");
      } else {
        const errorData = await response.json();
        setShareMessage(errorData.message || "Failed to share photo");
      }
    } catch (error) {
      console.error("Error sharing photo:", error);
      setShareMessage("Failed to share photo. Please try again later.");
    } finally {
      setIsSharing(false);
      setShowShareAlert(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/profile" />
          </IonButtons>
          <IonTitle>Gallery</IonTitle>
          {photos.length > 0 && (
            <IonButton fill="clear" color="light" slot="end" onClick={() => setShowDeleteAllAlert(true)}>
              <IonIcon slot="icon-only" icon={trash} />
            </IonButton>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon={chevronDownCircle}
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing..."
          ></IonRefresherContent>
        </IonRefresher>

        {loading ? (
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <IonText color="medium">
              <p>Loading photos...</p>
            </IonText>
          </div>
        ) : error ? (
          <div className="error-container">
            <IonText color="danger">
              <p>{error}</p>
            </IonText>
            <IonButton onClick={refreshPhotos}>Retry</IonButton>
          </div>
        ) : photos.length === 0 ? (
          <div className="empty-container">
            <IonText color="medium">
              <h2>No photos yet</h2>
              <p>Take your first photo to see it here!</p>
            </IonText>
            <IonButton routerLink="/app/home" color="primary">
              Take a Photo
            </IonButton>
          </div>
        ) : (
          <IonGrid>
            <IonRow>
              {photos.map((photo) => (
                <IonCol size="12" size-md="6" size-lg="4" key={photo.id}>
                  <IonCard className="photo-card">
                    <div className="photo-container" onClick={() => handleFullscreenView(photo)}>
                      <IonImg
                        src={photo.webPath}
                        alt={`Photo ${formatDate(photo.timestamp)}`}
                        className="photo-image"
                      />
                      <div className="photo-overlay">
                        <IonIcon icon={expandOutline} />
                      </div>
                    </div>

                    <IonCardHeader>
                      <IonCardSubtitle>
                        <IonItem lines="none" className="photo-info">
                          <IonIcon icon={calendar} slot="start" />
                          <IonLabel>{formatDate(photo.timestamp)}</IonLabel>
                        </IonItem>
                        <IonItem lines="none" className="photo-info">
                          <IonIcon icon={time} slot="start" />
                          <IonLabel>{formatTime(photo.timestamp)}</IonLabel>
                        </IonItem>
                        {photo.location && (
                          <IonItem lines="none" className="photo-info">
                            <IonIcon name="location" slot="start" />
                            <IonLabel>
                              {photo.location.latitude.toFixed(6)}, {photo.location.longitude.toFixed(6)}
                            </IonLabel>
                          </IonItem>
                        )}
                        {photo.serverUrl && (
                          <IonItem lines="none" className="photo-info">
                            <IonIcon name="cloud-done" slot="start" />
                            <IonLabel>Synced to server</IonLabel>
                          </IonItem>
                        )}
                      </IonCardSubtitle>
                    </IonCardHeader>

                    <IonCardContent>
                      <IonButton fill="clear" expand="block" color="medium" onClick={() => handlePhotoAction(photo)}>
                        <IonIcon slot="icon-only" icon={ellipsisVertical} />
                      </IonButton>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>
        )}

        {/* Action Sheet for photo actions */}
        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          buttons={[
            {
              text: "Share to Social Feed",
              icon: share,
              handler: handleSharePhoto,
            },
            {
              text: "Delete",
              role: "destructive",
              icon: trash,
              handler: () => setShowDeleteAlert(true),
            },
            {
              text: "View Full Screen",
              icon: expandOutline,
              handler: () => {
                if (selectedPhoto) {
                  handleFullscreenView(selectedPhoto);
                }
              },
            },
            {
              text: "Cancel",
              role: "cancel",
            },
          ]}
        />

        {/* Alert for confirming photo deletion */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Photo"
          message="Are you sure you want to delete this photo? This action cannot be undone."
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Delete",
              role: "destructive",
              handler: handleDeletePhoto,
            },
          ]}
        />

        {/* Alert for confirming all photos deletion */}
        <IonAlert
          isOpen={showDeleteAllAlert}
          onDidDismiss={() => setShowDeleteAllAlert(false)}
          header="Delete All Photos"
          message="Are you sure you want to delete all photos? This action cannot be undone."
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Delete All",
              role: "destructive",
              handler: handleDeleteAllPhotos,
            },
          ]}
        />

        {/* Alert for share result */}
        <IonAlert
          isOpen={showShareAlert}
          onDidDismiss={() => setShowShareAlert(false)}
          header="Share Photo"
          message={shareMessage}
          buttons={["OK"]}
        />

        {/* Modal for fullscreen photo view */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)} className="fullscreen-modal">
          <div className="fullscreen-container">
            {selectedPhoto && <IonImg src={selectedPhoto.webPath} alt="Fullscreen" className="fullscreen-image" />}
            <IonButton className="close-button" fill="clear" color="light" onClick={() => setShowModal(false)}>
              <IonIcon slot="icon-only" icon={closeCircle} />
            </IonButton>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Gallery;
