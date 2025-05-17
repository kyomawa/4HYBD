import React, { useState, useEffect } from "react";
import { IonModal, IonAvatar, IonIcon, IonSpinner, IonText } from "@ionic/react";
import { add } from "ionicons/icons";
import { StoryWithUser, getFeedStories, getNearbyStories } from "../services/story.service";
import { useAuthContext } from "../contexts/AuthContext";
import StoryViewer from "./StoryViewer";
import StoryCreator from "./StoryCreator";
import "./StoryCircles.css";

interface StoryCirclesProps {
  onCreateStory?: () => void;
  showCreateButton?: boolean;
  type?: "feed" | "nearby";
  maxDistance?: number;
}

interface GroupedStory {
  userId: string;
  username: string;
  profilePicture?: string;
  stories: StoryWithUser[];
  viewed: boolean;
  locationName?: string;
  createdAt: number;
}

const StoryCircles: React.FC<StoryCirclesProps> = ({
  onCreateStory,
  showCreateButton = true,
  type = "feed",
  maxDistance = 20,
}) => {
  const { user } = useAuthContext();
  const [stories, setStories] = useState<StoryWithUser[]>([]);
  const [groupedStories, setGroupedStories] = useState<GroupedStory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState<boolean>(false);
  const [showStoryCreator, setShowStoryCreator] = useState<boolean>(false);
  const [isCreatingStory, setIsCreatingStory] = useState<boolean>(false);

  useEffect(() => {
    loadStories();
  }, [type, maxDistance]);

  // Grouper les stories par utilisateur
  useEffect(() => {
    if (stories.length > 0) {
      const grouped: GroupedStory[] = [];
      const userMap: Record<string, number> = {};

      stories.forEach(story => {
        if (userMap[story.userId] !== undefined) {
          // Ajouter à un groupe existant
          const groupIndex = userMap[story.userId];
          grouped[groupIndex].stories.push(story);
          
          // Mettre à jour le statut "vu" et la date de création
          if (!story.viewed) {
            grouped[groupIndex].viewed = false;
          }
          if (story.createdAt > grouped[groupIndex].createdAt) {
            grouped[groupIndex].createdAt = story.createdAt;
          }
        } else {
          // Créer un nouveau groupe
          userMap[story.userId] = grouped.length;
          grouped.push({
            userId: story.userId,
            username: story.user.username,
            profilePicture: story.user.profilePicture,
            stories: [story],
            viewed: story.viewed,
            locationName: story.locationName,
            createdAt: story.createdAt
          });
        }
      });

      // Trier par date (plus récentes en premier)
      grouped.sort((a, b) => b.createdAt - a.createdAt);
      setGroupedStories(grouped);
    } else {
      setGroupedStories([]);
    }
  }, [stories]);

  const loadStories = async () => {
    try {
      setIsLoading(true);

      let storyData: StoryWithUser[] = [];

      if (type === "feed") {
        storyData = await getFeedStories();
      } else if (type === "nearby") {
        storyData = await getNearbyStories(maxDistance);
      }

      setStories(storyData);
    } catch (error) {
      console.error("Error loading stories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoryClick = (index: number) => {
    // Trouver l'index de départ dans la liste plate des stories
    let flatIndex = 0;
    for (let i = 0; i < index; i++) {
      flatIndex += groupedStories[i].stories.length;
    }
    
    setSelectedStoryIndex(flatIndex);
    setShowStoryViewer(true);
  };

  const handleStoryClose = () => {
    setShowStoryViewer(false);
    setSelectedStoryIndex(null);
  };

  const handleStoryDelete = (storyId: string) => {
    setStories((prevStories) => prevStories.filter((story) => story.id !== storyId));
  };

  const handleCreateStory = () => {
    if (onCreateStory) {
      onCreateStory();
      return;
    }

    setIsCreatingStory(true);
    setShowStoryCreator(true);
  };

  const handleStoryCreated = () => {
    setShowStoryCreator(false);
    setIsCreatingStory(false);
    loadStories(); // Reload stories after creation
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      return "now";
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h`;
    } else {
      return `${Math.floor(diffHours / 24)}d`;
    }
  };

  // Aplatir les stories pour la visionneuse
  const getFlatStories = () => {
    const flattened: StoryWithUser[] = [];
    groupedStories.forEach(group => {
      flattened.push(...group.stories);
    });
    return flattened;
  };

  return (
    <div className="story-circles-container">
      {isLoading ? (
        <div className="story-loading">
          <IonSpinner name="dots" />
        </div>
      ) : groupedStories.length === 0 && !showCreateButton ? (
        <div className="no-stories">
          <IonText color="medium">
            <p>No stories available</p>
          </IonText>
        </div>
      ) : (
        <div className="stories-scroll">
          {showCreateButton && (
            <div className="story-circle create-story">
              <div
                className={`circle-avatar create-button ${isCreatingStory ? "loading" : ""}`}
                onClick={isCreatingStory ? undefined : handleCreateStory}
              >
                {isCreatingStory ? 
                  <IonSpinner name="crescent" /> : 
                  <div className="create-button-icon">
                    <IonIcon icon={add} />
                  </div>
                }
              </div>
              <div className="username">Your story</div>
            </div>
          )}

          {groupedStories.map((group, index) => (
            <div
              key={group.userId + index}
              className={`story-circle ${group.viewed ? "viewed" : "unviewed"}`}
              onClick={() => handleStoryClick(index)}
            >
              <div className="circle-avatar">
                {group.profilePicture ? (
                  <img src={group.profilePicture} alt={group.username} />
                ) : (
                  <div className="default-avatar">{group.username.charAt(0).toUpperCase()}</div>
                )}
              </div>
              <div className="username">
                {group.username}
                {type === "nearby" && group.locationName && (
                  <div className="location-tag">{group.locationName}</div>
                )}
                <div className="time-tag">{formatTime(group.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Story Viewer Modal */}
      <IonModal
        isOpen={showStoryViewer}
        onDidDismiss={handleStoryClose}
        backdropDismiss={false}
        className="story-modal"
      >
        {selectedStoryIndex !== null && stories.length > 0 && (
          <StoryViewer
            stories={getFlatStories()}
            initialIndex={selectedStoryIndex}
            onClose={handleStoryClose}
            onDelete={handleStoryDelete}
          />
        )}
      </IonModal>

      {/* Story Creator Modal */}
      <IonModal
        isOpen={showStoryCreator}
        onDidDismiss={() => {
          setShowStoryCreator(false);
          setIsCreatingStory(false);
        }}
        backdropDismiss={false}
        className="story-creator-modal"
      >
        <StoryCreator 
          onClose={() => {
            setShowStoryCreator(false);
            setIsCreatingStory(false);
          }}
          onSuccess={handleStoryCreated}
        />
      </IonModal>
    </div>
  );
};

export default StoryCircles;