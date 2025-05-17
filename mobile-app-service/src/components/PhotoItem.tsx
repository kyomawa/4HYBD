import React from "react";
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonImg,
} from "@ionic/react";
import { calendar, time, ellipsisVertical, expandOutline } from "ionicons/icons";
import { PhotoData } from "../services/camera.service";
import "./PhotoItem.css";

interface PhotoItemProps {
  photo: PhotoData;
  onActionClick: (photo: PhotoData) => void;
  onPhotoClick: (photo: PhotoData) => void;
}

const PhotoItem: React.FC<PhotoItemProps> = ({ photo, onActionClick, onPhotoClick }) => {
  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <IonCard className="photo-item-card">
      <div className="photo-item-container" onClick={() => onPhotoClick(photo)}>
        <IonImg src={photo.webPath} alt={`Photo ${formatDate(photo.timestamp)}`} className="photo-item-image" />
        <div className="photo-item-overlay">
          <IonIcon icon={expandOutline} />
        </div>
      </div>

      <IonCardHeader>
        <IonCardSubtitle>
          <IonItem lines="none" className="photo-item-info">
            <IonIcon icon={calendar} slot="start" />
            <IonLabel>{formatDate(photo.timestamp)}</IonLabel>
          </IonItem>
          <IonItem lines="none" className="photo-item-info">
            <IonIcon icon={time} slot="start" />
            <IonLabel>{formatTime(photo.timestamp)}</IonLabel>
          </IonItem>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <IonButton fill="clear" expand="block" color="medium" onClick={() => onActionClick(photo)}>
          <IonIcon slot="icon-only" icon={ellipsisVertical} />
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
};

export default PhotoItem;
