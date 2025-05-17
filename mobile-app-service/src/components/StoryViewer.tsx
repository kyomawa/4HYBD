import React, { useState, useEffect, useRef } from "react";
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
  IonAvatar,
  IonProgressBar,
  IonRow,
  IonCol,
  IonGrid,
  IonFooter,
  IonItem,
  IonInput,
  IonToast,
  IonActionSheet,
  IonBadge,
} from "@ionic/react";
import {
  close,
  locationOutline,
  timeOutline,
  heart,
  heartOutline,
  chatbubbleOutline,
  ellipsisVertical,
  send,
  chevronBack,
  chevronForward,
  thumbsUp,
  happy,
  sad,
  flame,
} from "ionicons/icons";
import { StoryWithUser, markStoryAsViewed, deleteStory, likeStory, unlikeStory } from "../services/story.service";
import { useAuthContext } from "../contexts/AuthContext";
import "./StoryViewer.css";

interface StoryViewerProps {
  stories: StoryWithUser[];
  initialIndex?: number;
  onClose: () => void;
  onDelete?: (storyId: string) => void;
}

interface Reaction {
  icon: string;
  label: string;
  color: string;
}

const REACTIONS: Reaction[] = [
  { icon: heart, label: "J'aime", color: "danger" },
  { icon: thumbsUp, label: "Super", color: "primary" },
  { icon: happy, label: "Haha", color: "warning" },
  { icon: sad, label: "Triste", color: "medium" },
  { icon: flame, label: "Wow", color: "tertiary" },
];

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, initialIndex = 0, onClose, onDelete }) => {
  const { user } = useAuthContext();
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showActionSheet, setShowActionSheet] = useState<boolean>(false);
  const [showReactions, setShowReactions] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [likes, setLikes] = useState<Record<string, boolean>>({});

  // Changer le type de timer de number à NodeJS.Timeout | null
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const storyDuration = 5000; // 5 seconds per story
  const progressInterval = 100; // Update progress every 100ms

  const currentStory = stories[currentIndex];

  useEffect(() => {
    // Initialize likes
    const initialLikes: Record<string, boolean> = {};
    stories.forEach((story) => {
      // Vérifier si la propriété views existe et contient l'ID de l'utilisateur
      initialLikes[story.id] = story.views && user ? story.views.includes(user.id) : false;
    });
    setLikes(initialLikes);

    // Reset progress when story changes
    setProgress(0);
    setIsLoading(true);

    // Mark story as viewed
    if (currentStory) {
      markStoryAsViewed(currentStory.id);
    }

    // Clear existing timer
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    // Start new timer
    const interval = setInterval(() => {
      if (!isPaused) {
        setProgress((prevProgress) => {
          const newProgress = prevProgress + progressInterval / storyDuration;

          // Move to next story when progress completes
          if (newProgress >= 1) {
            clearInterval(interval);

            // If there are more stories, move to next
            if (currentIndex < stories.length - 1) {
              setCurrentIndex(currentIndex + 1);
            } else {
              // Close viewer when all stories are viewed
              onClose();
            }
          }

          return newProgress;
        });
      }
    }, progressInterval);

    progressTimerRef.current = interval;

    // Clean up timer on unmount
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [currentIndex, isPaused, stories, user]);

  const handlePrevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handleTouchStart = () => {
    setIsPaused(true);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;

    try {
      const result = await deleteStory(currentStory.id);

      if (result) {
        // Notify parent component
        if (onDelete) {
          onDelete(currentStory.id);
        }

        // Move to next story or close
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error("Error deleting story:", error);
      setToastMessage("Failed to delete story");
      setShowToast(true);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || !currentStory) return;

    // Placeholder message functionality
    setToastMessage("Message envoyé!");
    setShowToast(true);
    setMessage("");
  };

  const handleLikeStory = async (reaction?: Reaction) => {
    if (!currentStory || !user) return;

    try {
      setIsPaused(true);

      // Toggle like status in state for immediate feedback
      const isLiked = likes[currentStory.id];
      const newLikes = { ...likes };
      newLikes[currentStory.id] = !isLiked;
      setLikes(newLikes);

      if (isLiked) {
        await unlikeStory(currentStory.id);
        setToastMessage("Like retiré");
      } else {
        await likeStory(currentStory.id);
        setToastMessage(reaction ? `Réaction "${reaction.label}" envoyée!` : "Story likée!");
      }

      setShowToast(true);
      setShowReactions(false);
    } catch (error) {
      console.error("Error liking/unliking story:", error);
      setToastMessage("Une erreur est survenue");
      setShowToast(true);

      // Revert on error
      const newLikes = { ...likes };
      newLikes[currentStory.id] = !newLikes[currentStory.id];
      setLikes(newLikes);
    } finally {
      setTimeout(() => {
        setIsPaused(false);
      }, 500);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return "À l'instant";
    } else if (diffMins < 60) {
      return `Il y a ${diffMins}m`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        return `Il y a ${diffHours}h`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `Il y a ${diffDays}j`;
      }
    }
  };

  if (!currentStory) {
    return null;
  }

  // Calculer le nombre de vues total pour l'affichage dans le badge
  const viewsCount = currentStory.views?.length || 0;
  // Ajouter 1 si l'utilisateur actuel a aimé cette story (pour l'interface utilisateur)
  const displayViewsCount = viewsCount + (likes[currentStory.id] ? 1 : 0);

  return (
    <>
      <div
        className="story-viewer-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleNextStory}
      >
        <IonHeader className="story-header">
          <IonToolbar color="transparent">
            <IonProgressBar value={progress} className="story-progress" color="light" />
            <IonButtons slot="start">
              <IonButton onClick={onClose} color="light">
                <IonIcon slot="icon-only" icon={close} />
              </IonButton>
            </IonButtons>

            <div className="story-user-info">
              <IonAvatar className="story-avatar">
                {currentStory.user.profilePicture ? (
                  <img src={currentStory.user.profilePicture} alt={currentStory.user.username} />
                ) : (
                  <div className="default-avatar">{currentStory.user.username.charAt(0).toUpperCase()}</div>
                )}
              </IonAvatar>
              <div className="user-details">
                <div className="username">{currentStory.user.username}</div>
                <div className="story-meta">
                  <span className="time">
                    <IonIcon icon={timeOutline} />
                    {formatRelativeTime(currentStory.createdAt)}
                  </span>
                  {currentStory.locationName && (
                    <span className="location">
                      <IonIcon icon={locationOutline} />
                      {currentStory.locationName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <IonButtons slot="end">
              {user && currentStory.userId === user.id && (
                <IonButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActionSheet(true);
                  }}
                  color="light"
                >
                  <IonIcon slot="icon-only" icon={ellipsisVertical} />
                </IonButton>
              )}
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <div className="navigation-overlay">
          <div
            className="nav-left"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevStory();
            }}
          >
            <IonIcon icon={chevronBack} />
          </div>
          <div
            className="nav-right"
            onClick={(e) => {
              e.stopPropagation();
              handleNextStory();
            }}
          >
            <IonIcon icon={chevronForward} />
          </div>
        </div>

        <div className="story-image-container">
          {isLoading && (
            <div className="loading-container">
              <IonSpinner name="crescent" color="light" />
            </div>
          )}
          {/* Vérifier si photoData existe avant d'accéder à webPath */}
          {currentStory.photoData && (
            <img src={currentStory.photoData.webPath} alt="Story" className="story-image" onLoad={handleImageLoad} />
          )}
        </div>

        {showReactions && (
          <div className="reactions-container" onClick={(e) => e.stopPropagation()}>
            {REACTIONS.map((reaction, index) => (
              <div key={index} className="reaction-button" onClick={() => handleLikeStory(reaction)}>
                <IonIcon icon={reaction.icon} color={reaction.color} />
                <span>{reaction.label}</span>
              </div>
            ))}
          </div>
        )}

        <IonFooter className="story-footer">
          <div className="story-actions">
            <IonButton
              fill="clear"
              color={likes[currentStory.id] ? "danger" : "light"}
              onClick={(e) => {
                e.stopPropagation();
                setShowReactions(!showReactions);
                if (showReactions) {
                  handleLikeStory();
                }
              }}
            >
              <IonIcon slot="icon-only" icon={likes[currentStory.id] ? heart : heartOutline} />
            </IonButton>
            <IonBadge color="light" className="story-stat">
              {displayViewsCount}
            </IonBadge>
          </div>

          <div className="message-container">
            <IonItem lines="none" className="message-input-item">
              <IonInput
                value={message}
                onIonChange={(e) => setMessage(e.detail.value!)}
                placeholder="Répondre à la story..."
                className="message-input"
                onClick={(e) => e.stopPropagation()}
              />
              <IonButton
                fill="clear"
                disabled={!message.trim()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendMessage();
                }}
              >
                <IonIcon slot="icon-only" icon={send} />
              </IonButton>
            </IonItem>
          </div>
        </IonFooter>
      </div>

      <IonActionSheet
        isOpen={showActionSheet}
        onDidDismiss={() => setShowActionSheet(false)}
        buttons={[
          {
            text: "Supprimer la story",
            role: "destructive",
            handler: handleDeleteStory,
          },
          {
            text: "Annuler",
            role: "cancel",
          },
        ]}
      />

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        position="bottom"
      />
    </>
  );
};

export default StoryViewer;
