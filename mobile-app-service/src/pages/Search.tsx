import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonTitle,
  IonSearchbar,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonButton,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonText,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  useIonRouter,
} from "@ionic/react";
import { personAdd, checkmark, searchOutline, people, arrowForward } from "ionicons/icons";
import { searchUsers, User, followUser, unfollowUser, getCurrentUser } from "../services/auth.service";
import { useAuthContext } from "../contexts/AuthContext";
import "./Search.css";

const Search: React.FC = () => {
  const { user: currentUser, refreshUser } = useAuthContext();
  const router = useIonRouter();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [followingStatus, setFollowingStatus] = useState<{ [key: string]: boolean }>({});
  const [isFollowingLoading, setIsFollowingLoading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadSuggestedUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (currentUser && (suggestedUsers.length > 0 || searchResults.length > 0)) {
      updateFollowingStatus();
    }
  }, [currentUser, suggestedUsers, searchResults]);

  const loadSuggestedUsers = async () => {
    try {
      setIsLoading(true);

      // In a real app, this would be an API call to get suggested users
      // For now, we'll just use the searchUsers function to get some users
      const users = await searchUsers("");

      // Filter out the current user
      const filteredUsers = users.filter((user) => user.id !== currentUser?.id);

      // Limit to 6 users
      const limitedUsers = filteredUsers.slice(0, 6);

      setSuggestedUsers(limitedUsers);

      // Update following status
      if (currentUser) {
        const status: { [key: string]: boolean } = {};

        limitedUsers.forEach((user) => {
          status[user.id] = currentUser.following?.includes(user.id) || false;
        });

        setFollowingStatus((prev) => ({ ...prev, ...status }));
      }
    } catch (error) {
      console.error("Error loading suggested users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim().length === 0) return;

    try {
      setIsSearching(true);

      const users = await searchUsers(searchTerm);

      // Filter out the current user
      const filteredUsers = users.filter((user) => user.id !== currentUser?.id);

      setSearchResults(filteredUsers);

      // Update following status
      if (currentUser) {
        updateFollowingStatus();
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const updateFollowingStatus = () => {
    if (!currentUser || (!suggestedUsers.length && !searchResults.length)) return;

    const users = [...suggestedUsers, ...searchResults];
    const uniqueUsers = [...new Map(users.map((user) => [user.id, user])).values()];

    const status: { [key: string]: boolean } = {};

    uniqueUsers.forEach((user) => {
      status[user.id] = currentUser.following?.includes(user.id) || false;
    });

    setFollowingStatus(status);
  };

  const handleFollowToggle = async (userId: string) => {
    try {
      setIsFollowingLoading((prev) => ({ ...prev, [userId]: true }));

      if (followingStatus[userId]) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }

      // Refresh user data
      await refreshUser();

      // Update following status
      const updatedCurrentUser = await getCurrentUser();

      if (updatedCurrentUser) {
        setFollowingStatus((prev) => ({
          ...prev,
          [userId]: updatedCurrentUser.following?.includes(userId) || false,
        }));
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setIsFollowingLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const renderUserItem = (user: User) => {
    const isFollowing = followingStatus[user.id] || false;
    const isLoading = isFollowingLoading[user.id] || false;

    return (
      <IonItem key={user.id} lines="full" className="user-item">
        <IonAvatar slot="start" onClick={() => router.push(`/app/user/${user.id}`)}>
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={user.username} />
          ) : (
            <div className="default-avatar">{user.username.charAt(0).toUpperCase()}</div>
          )}
        </IonAvatar>

        <IonLabel onClick={() => router.push(`/app/user/${user.id}`)}>
          <h2>{user.username}</h2>
          {user.fullName && <p>{user.fullName}</p>}
        </IonLabel>

        <div slot="end">
          {isLoading ? (
            <IonSpinner name="dots" />
          ) : (
            <IonButton
              fill={isFollowing ? "solid" : "outline"}
              size="small"
              className={`follow-button ${isFollowing ? "following" : ""}`}
              onClick={() => handleFollowToggle(user.id)}
            >
              {isFollowing ? (
                <>
                  <IonIcon icon={checkmark} slot="start" />
                  Following
                </>
              ) : (
                <>
                  <IonIcon icon={personAdd} slot="start" />
                  Follow
                </>
              )}
            </IonButton>
          )}
        </div>
      </IonItem>
    );
  };

  const renderSuggestedUsers = () => {
    if (isLoading) {
      return (
        <div className="spinner-container">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading suggestions...</p>
          </IonText>
        </div>
      );
    }

    if (suggestedUsers.length === 0) {
      return (
        <div className="empty-state">
          <IonIcon className="empty-state-icon" icon={people} />
          <h2 className="empty-state-title">No Suggestions</h2>
          <p className="empty-state-message">We couldn't find any suggested users</p>
        </div>
      );
    }

    return (
      <div className="suggestions-container">
        <div className="suggestions-header">
          <h2>Suggested for you</h2>
          <IonButton fill="clear" size="small" onClick={loadSuggestedUsers}>
            Refresh
          </IonButton>
        </div>

        <IonGrid className="suggestions-grid">
          <IonRow>
            {suggestedUsers.map((user) => (
              <IonCol size="6" key={user.id}>
                <div className="suggestion-card">
                  <div className="suggestion-avatar" onClick={() => router.push(`/app/user/${user.id}`)}>
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.username} />
                    ) : (
                      <div className="default-avatar">{user.username.charAt(0).toUpperCase()}</div>
                    )}
                  </div>

                  <div className="suggestion-username" onClick={() => router.push(`/app/user/${user.id}`)}>
                    <h3>{user.username}</h3>
                  </div>

                  <div className="suggestion-actions">
                    {isFollowingLoading[user.id] ? (
                      <IonSpinner name="dots" />
                    ) : (
                      <IonButton
                        fill={followingStatus[user.id] ? "solid" : "outline"}
                        size="small"
                        className={`follow-button ${followingStatus[user.id] ? "following" : ""}`}
                        onClick={() => handleFollowToggle(user.id)}
                      >
                        {followingStatus[user.id] ? "Following" : "Follow"}
                      </IonButton>
                    )}
                  </div>
                </div>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>
      </div>
    );
  };

  const renderSearchResults = () => {
    if (isSearching) {
      return (
        <div className="spinner-container">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Searching...</p>
          </IonText>
        </div>
      );
    }

    if (searchTerm && searchResults.length === 0) {
      return (
        <div className="empty-state">
          <IonIcon className="empty-state-icon" icon={searchOutline} />
          <h2 className="empty-state-title">No Results</h2>
          <p className="empty-state-message">We couldn't find any users matching "{searchTerm}"</p>
        </div>
      );
    }

    if (searchResults.length > 0) {
      return <IonList className="search-results">{searchResults.map((user) => renderUserItem(user))}</IonList>;
    }

    return null;
  };

  return (
    <IonPage className="search-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Search</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="search-header">
          <IonSearchbar
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value!)}
            placeholder="Search users"
            debounce={500}
            animated
            showClearButton="always"
          />
        </div>

        {searchTerm ? renderSearchResults() : renderSuggestedUsers()}

        <IonInfiniteScroll
          threshold="100px"
          disabled={true} // Disabled for now, would be enabled in a real app
        >
          <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Loading more users..." />
        </IonInfiniteScroll>
      </IonContent>
    </IonPage>
  );
};

export default Search;
