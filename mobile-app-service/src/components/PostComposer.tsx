import React, { useState } from "react";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonTextarea,
  IonIcon,
  IonSpinner,
} from "@ionic/react";
import { close, send } from "ionicons/icons";
import "./PostComposer.css";

interface PostComposerProps {
  imageUrl: string;
  onPublish: (caption: string) => void;
  onCancel: () => void;
}

const PostComposer: React.FC<PostComposerProps> = ({ imageUrl, onPublish, onCancel }) => {
  const [caption, setCaption] = useState<string>("");
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      await onPublish(caption);
    } catch (error) {
      console.error("Error publishing post:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onCancel} disabled={isPublishing}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
          <IonTitle>New Post</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handlePublish} disabled={isPublishing} strong>
              {isPublishing ? <IonSpinner name="dots" /> : <IonIcon icon={send} />}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="composer-content">
        <div className="image-preview-container">
          <img src={imageUrl} alt="Preview" className="image-preview" />
        </div>

        <div className="caption-container">
          <IonTextarea
            placeholder="Write a caption..."
            value={caption}
            onIonChange={(e) => setCaption(e.detail.value!)}
            autoGrow
            rows={4}
            className="caption-textarea"
            disabled={isPublishing}
          />
        </div>
      </IonContent>
    </>
  );
};

export default PostComposer;
