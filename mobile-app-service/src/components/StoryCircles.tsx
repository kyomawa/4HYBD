import React, { useState, useEffect } from "react";
import {
  IonAvatar,
  IonIcon,
  IonText,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonCardSubtitle,
  IonItem,
  IonLabel,
  IonButton,
  IonSpinner,
} from "@ionic/react";
import {
  personOutline,
  timeOutline,
  locationOutline,
  eyeOutline,
  heartOutline,
  chatbubbleOutline,
  heart,
} from "ionicons/icons";
import { StoryWithUser } from "../services/story.service";
import { useAuthContext } from "../contexts/AuthContext";
import "./StoryCircles.css";

interface StoryCirclesProps {
  stories: StoryWithUser[];
  onStorySelect: (story: StoryWithUser) => void;
}

const StoryCircles: React.FC<StoryCirclesProps> = ({ stories, onStorySelect }) => {
  const { user: currentUser } = useAuthContext();
  
  // Group stories by user
  const groupedStories = React.useMemo(() => {
    const grouped: Record<string, StoryWithUser[]> = {};
    
    stories.forEach(story => {
      if (!grouped[story.userId]) {
        grouped[story.userId] = [];
      }
      grouped[story.userId].push(story);
    });
    
    // For each user, sort their stories by creation time (newest first)
    Object.keys(grouped).forEach(userId => {
      grouped[userId].sort((a, b) => b.createdAt - a.createdAt);
    });
    
    return grouped;
  }, [stories]);
  
  // Get user story circles - one circle per user with their latest story
  const userStoryCircles = React.useMemo(() => {
    return Object.values(groupedStories).map(userStories => {
      // Get the most recent story for the user
      const latestStory = userStories[0];
      // Count how many stories this user has
      const storyCount = userStories.length;
      // Check if user has any unviewed stories
      const hasUnviewedStories = userStories.some(story => !story.viewed);
      
      return {
        userId: latestStory.userId,
        username: latestStory.user.username,
        profilePicture: latestStory.user.profilePicture,
        latestStory,
        storyCount,
        hasUnviewedStories,
      };
    });
  }, [groupedStories]);
  
  // Calculate time since story creation
  const formatTimeSince = (timestamp: number): string => {
    const now = Date.now();
    const diffSeconds = Math.floor((now - timestamp) / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s`;
    }
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };
  
  return (
    <div className="story-circles-container">
      {/* Horizontal scrollable story circles */}
      <div className="story-circles-scrollable">
        {userStoryCircles.map(({ userId, username, profilePicture, latestStory, storyCount, hasUnviewedStories }) => (
          <div key={userId} className="story-circle-item" onClick={() => onStorySelect(latestStory)}>
            <div className={`story-avatar-border ${hasUnviewedStories ? 'unviewed' : 'viewed'}`}>
              <IonAvatar className="story-avatar">
                {profilePicture ? (
                  <img src={profilePicture} alt={username} />
                ) : (
                  <div className="default-avatar">
                    <IonIcon icon={personOutline} />
                  </div>
                )}
              </IonAvatar>
              {storyCount > 1 && (
                <IonBadge className="story-count-badge" color={hasUnviewedStories ? "primary" : "medium"}>
                  {storyCount}
                </IonBadge>
              )}
            </div>
            <IonText className="story-username">
              <p>{username}</p>
            </IonText>
          </div>
        ))}
      </div>
      
      {/* Story cards (larger previews) */}
      <div className="story-cards-container">
        <IonGrid>
          <IonRow>
            {stories.map((story) => (
              <IonCol size="12" sizeMd="6" key={story.id}>
                <IonCard className="story-card" onClick={() => onStorySelect(story)}>
                  <IonCardHeader>
                    <IonItem lines="none" className="story-card-user">
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
                        <p className="story-time">
                          <IonIcon icon={timeOutline} />
                          {formatTimeSince(story.createdAt)} ago
                        </p>
                      </IonLabel>
                      {!story.viewed ? (
                        <IonBadge color="primary" slot="end">New</IonBadge>
                      ) : null}
                    </IonItem>
                  </IonCardHeader>
                  
                  <div className="story-card-image-container">
                    <img 
                      src={story.mediaUrl} 
                      alt="Story" 
                      className="story-card-image"
                      onError={(e) => {
                        // Handle image loading error
                        (e.target as HTMLImageElement).src = 'assets/image-placeholder.png';
                      }} 
                    />
                    
                    <div className="story-card-overlay">
                      <div className="story-card-stats">
                        <div className="story-stat">
                          <IonIcon icon={eyeOutline} />
                          <span>{story.views.length}</span>
                        </div>
                        
                        {story.location && (
                          <div className="story-location">
                            <IonIcon icon={locationOutline} />
                            <span>{story.locationName || "Nearby"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {story.caption && (
                    <IonCardContent>
                      <p className="story-caption">{story.caption}</p>
                    </IonCardContent>
                  )}
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>
      </div>
    </div>
  );
};

export default StoryCircles;