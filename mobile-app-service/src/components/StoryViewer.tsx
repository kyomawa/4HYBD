import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonProgressBar,
  IonSpinner,
  IonText,
  IonAvatar,
  IonModal,
  IonFooter,
  IonItem,
  IonLabel,
  IonBadge,
  IonActionSheet,
} from "@ionic/react";
import {
  closeOutline,
  timeOutline,
  locationOutline,
  ellipsisVertical,
  heartOutline,
  heart,
  chatbubbleOutline,
  personOutline,
  trash,
  flag,
  shareOutline,
} from "ionicons/icons";
import { StoryWithUser, markStoryAsViewed, deleteStory } from "../services/story.service";
import { User } from "../services/auth.service";
import "./StoryViewer.css";

interface StoryViewerProps {
  story: StoryWithUser;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: () => void;
  currentUser?: User | null;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ 
  story, 
  isOpen, 
  onClose, 
  onDelete, 
  currentUser 
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  const [showActions, setShowActions] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Check if the story belongs to the current user
  const isOwnStory = currentUser && story.userId === currentUser.id;

  // Calculate time remaining before story expires
  const calculateTimeRemaining = (): string => {
    if (!story) return "";
    
    const now = Date.now();
    const expiresAt = story.expiresAt;
    const remainingMs = expiresAt - now;
    
    if (remainingMs <= 0) return "Expired";
    
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };
  
  useEffect(() => {
    if (isOpen && story) {
      setLoading(true);
      setError(null);
      setProgress(0);
      
      // Start the progress timer
      let startTime = Date.now();
      const duration = 5000; // 5 seconds to view a story
      
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(elapsed / duration, 1);
        setProgress(newProgress);
        
        if (newProgress >= 1) {
          clearInterval(timer);
          // Mark as viewed when the progress reaches 100%
          markAsViewed();
        }
      }, 100);
      
      // Mark the story as viewed
      markAsViewed();
      
      // Preload the image
      const img = new Image();
      img.src = story.mediaUrl;
      img.onload = () => {
        setLoading(false);
      };
      img.onerror = () => {
        setError("Failed to load image");
        setLoading(false);
      };
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [isOpen, story]);
  
  const markAsViewed = async () => {
    if (story && !story.viewed) {
      try {
        await markStoryAsViewed(story.id);
        // Update the local state to reflect the story has been viewed
        story.viewed = true;
      } catch (err) {
        console.error("Error marking story as viewed:", err);
      }
    }
  };
  
  const handleLikeToggle = () => {
    setLiked(!liked);
    // In a real implementation, you would call an API to like/unlike the story
  };
  
  const handleDeleteStory = async () => {
    if (!story) return;
    
    try {
      setActionLoading(true);
      await deleteStory(story.id);
      if (onDelete) onDelete();
      onClose();
    } catch (err) {
      console.error("Error deleting story:", err);
      setError("Failed to delete story. Please try again.");
    } finally {
      setActionLoading(false);
      setShowActions(false);
    }
  };
  
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="story-viewer-modal">
      <IonHeader className="story-viewer-header">
        <IonToolbar color="transparent">
          <IonProgressBar value={progress} color="light" />
          <IonButtons slot="start">
            <IonButton onClick={onClose} color="light">
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </IonButtons>
          <div className="story-user-info">
            <IonAvatar>
              {story.user.profilePicture ? (
                <img src={story.user.profilePicture} alt={story.user.username} />
              ) : (
                <div className="default-avatar">
                  <IonIcon icon={personOutline} />
                </div>
              )}
            </IonAvatar>
            <div className="story-user-text">
              <h4>{story.user.username}</h4>
              <div className="story-meta">
                <span className="story-time">
                  <IonIcon icon={timeOutline} />
                  {calculateTimeRemaining()}
                </span>
                {story.location && (
                  <span className="story-location">
                    <IonIcon icon={locationOutline} />
                    {story.locationName || "Nearby"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowActions(true)} color="light">
              <IonIcon slot="icon-only" icon={ellipsisVertical} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="story-viewer-content">
        {loading ? (
          <div className="story-loading">
            <IonSpinner name="circles" color="light" />
          </div>
        ) : error ? (
          <div className="story-error">
            <IonText color="danger">
              <p>{error}</p>
            </IonText>
            <IonButton onClick={onClose}>Close</IonButton>
          </div>
        ) : (
          <div className="story-media-container">
            <img src={story.mediaUrl} alt="Story" className="story-media" />
            {story.caption && (
              <div className="story-caption-overlay">
                <p>{story.caption}</p>
              </div>
            )}
          </div>
        )}
      </IonContent>

      <IonFooter className="story-viewer-footer">
        <div className="story-actions">
          <IonButton fill="clear" color="light" onClick={handleLikeToggle}>
            <IonIcon slot="icon-only" icon={liked ? heart : heartOutline} color={liked ? "danger" : "light"} />
          </IonButton>
          <IonButton fill="clear" color="light">
            <IonIcon slot="icon-only" icon={chatbubbleOutline} />
          </IonButton>
          <IonButton fill="clear" color="light">
            <IonIcon slot="icon-only" icon={shareOutline} />
          </IonButton>
          <div className="story-views">
            <IonBadge color="light">
              <IonIcon icon={personOutline} /> {story.views.length}
            </IonBadge>
          </div>
        </div>
      </IonFooter>

      <IonActionSheet
        isOpen={showActions}
        onDidDismiss={() => setShowActions(false)}
        buttons={[
          ...(isOwnStory
            ? [
                {
                  text: "Delete Story",
                  role: "destructive",
                  icon: trash,
                  handler: handleDeleteStory,
                },
              ]
            : [
                {
                  text: "Report Story",
                  role: "destructive",
                  icon: flag,
                  handler: () => {
                    // Handle report functionality
                    console.log("Report story");
                  },
                },
              ]),
          {
            text: "Share",
            icon: shareOutline,
            handler: () => {
              // Handle share functionality
              console.log("Share story");
            },
          },
          {
            text: "Cancel",
            role: "cancel",
          },
        ]}
      />

      {actionLoading && (
        <div className="action-loading-overlay">
          <IonSpinner name="dots" />
        </div>
      )}
    </IonModal>
  );
};

export default StoryViewer;