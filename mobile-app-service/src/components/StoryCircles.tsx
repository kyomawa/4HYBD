import * as React from "react";
import { useState, useEffect, useMemo } from "react";
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

interface UserStoryCircle {
  userId: string;
  username: string;
  latestStory: StoryWithUser;
  storyCount: number;
  hasUnviewedStories: boolean;
}

const StoryCircles: React.FC<StoryCirclesProps> = ({ stories, onStorySelect }) => {
  const { user: currentUser } = useAuthContext();
  
  // Group stories by user
  const groupedStories = useMemo(() => {
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
    return Object.values(groupedStories).map((value: unknown) => {
      const userStories = value as StoryWithUser[];
      // Get the most recent story for the user
      const latestStory = userStories[0];
      // Count how many stories this user has
      const storyCount = userStories.length;
      // Check if user has any unviewed stories
      const hasUnviewedStories = userStories.some(story => !story.viewed);
      
      return {
        userId: latestStory.userId,
        username: latestStory.user.username,
        latestStory,
        storyCount,
        hasUnviewedStories,
      } as UserStoryCircle;
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
        {userStoryCircles.map((circle: UserStoryCircle) => {
          const { userId, username, latestStory, storyCount, hasUnviewedStories } = circle;
          return (
            <div key={userId} className="story-circle-item" onClick={() => onStorySelect(latestStory)}>
              <div className="story-username">
                <p>{username}</p>
              </div>
              <div className={`story-avatar-border ${hasUnviewedStories ? 'unviewed' : 'viewed'}`}> 
                <div className="story-avatar">
                  <div className="default-avatar" style={{ borderRadius: '50%' }}>
                    <span style={{fontSize: '28px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%'}}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/></svg>
                    </span>
                  </div>
                </div>
                {storyCount > 1 && (
                  <span className="story-count-badge" style={{background: hasUnviewedStories ? '#3880ff' : '#dedede', color: 'white'}}>
                    {storyCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}
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
                        <div className="default-avatar">
                          <IonIcon icon={personOutline} />
                        </div>
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