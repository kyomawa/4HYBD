import React, { useState, useEffect } from "react";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonIcon,
  IonSpinner,
  IonText,
  IonInput,
  IonSearchbar,
  IonChip,
  useIonRouter,
  IonBadge,
  IonToast,
} from "@ionic/react";
import { close, people, search, checkmark, personAdd, camera, create } from "ionicons/icons";
import { searchUsers, User } from "../services/auth.service";
import { createGroupConversation } from "../services/chat.service";
import { takePicture } from "../services/camera.service";
import { CameraResultType, CameraSource } from "@capacitor/camera";
import "./GroupChatCreator.css";

interface GroupChatCreatorProps {
  onClose: () => void;
  onSuccess?: (conversationId: string) => void;
}

const GroupChatCreator: React.FC<GroupChatCreatorProps> = ({ onClose, onSuccess }) => {
  const router = useIonRouter();

  const [searchText, setSearchText] = useState<string>("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState<string>("");
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");

  useEffect(() => {
    if (searchText.trim().length > 0) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchText]);

  const handleSearch = async () => {
    if (searchText.trim().length === 0) return;

    try {
      setIsSearching(true);
      const users = await searchUsers(searchText);
      setSearchResults(users);
    } catch (error) {
      console.error("Error searching users:", error);
      setToastMessage("Failed to search users");
      setShowToast(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserSelect = (user: User) => {
    // Check if already selected
    if (selectedUsers.some((selectedUser) => selectedUser.id === user.id)) {
      // Remove from selection
      setSelectedUsers(selectedUsers.filter((selectedUser) => selectedUser.id !== user.id));
    } else {
      // Add to selection
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((user) => user.id !== userId));
  };

  const handleTakeGroupPhoto = async () => {
    try {
      const photo = await takePicture({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 300,
        height: 300,
      });

      if (photo && photo.webPath) {
        setGroupAvatar(photo.webPath);
      }
    } catch (error) {
      console.error("Error taking group photo:", error);
      setToastMessage("Failed to take photo");
      setShowToast(true);
    }
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length < 2) {
      setToastMessage("Select at least 2 users for a group");
      setShowToast(true);
      return;
    }

    if (!groupName.trim()) {
      setToastMessage("Please enter a group name");
      setShowToast(true);
      return;
    }

    try {
      setIsCreating(true);

      // Get user IDs
      const userIds = selectedUsers.map((user) => user.id);

      // Create the group conversation
      const conversation = await createGroupConversation(userIds, groupName, groupAvatar || undefined);

      // Show success message
      setToastMessage("Group created successfully!");
      setShowToast(true);

      // Notify parent of success
      if (onSuccess) {
        onSuccess(conversation.id);
      } else {
        // Navigate to new conversation
        setTimeout(() => {
          router.push(`/app/conversation/${conversation.id}`);
          onClose();
        }, 1000);
      }
    } catch (error) {
      console.error("Error creating group:", error);
      setToastMessage("Failed to create group");
      setShowToast(true);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>
              <IonIcon slot="icon-only" icon={close} />
            </IonButton>
          </IonButtons>
          <IonTitle>New Group Chat</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={handleCreateGroup}
              disabled={isCreating || selectedUsers.length < 2 || !groupName.trim()}
            >
              {isCreating ? <IonSpinner name="dots" /> : "Create"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="group-creator-content">
        <div className="group-info-section">
          <div className="group-avatar-container" onClick={handleTakeGroupPhoto}>
            {groupAvatar ? (
              <img src={groupAvatar} alt="Group Avatar" className="group-avatar" />
            ) : (
              <div className="group-avatar-placeholder">
                <IonIcon icon={camera} />
              </div>
            )}
          </div>

          <div className="group-name-container">
            <IonItem className="group-name-item">
              <IonInput
                value={groupName}
                onIonChange={(e) => setGroupName(e.detail.value!)}
                placeholder="Group name"
                className="group-name-input"
              />
            </IonItem>
          </div>
        </div>

        <div className="selected-users-section">
          <div className="section-header">
            <h2>
              Group Members <IonBadge color="primary">{selectedUsers.length}</IonBadge>
            </h2>
          </div>

          <div className="selected-users-container">
            {selectedUsers.length === 0 ? (
              <IonText color="medium" className="no-users-selected">
                Select users to add to your group
              </IonText>
            ) : (
              <div className="selected-chips">
                {selectedUsers.map((user) => (
                  <IonChip key={user.id} className="user-chip" onClick={() => handleRemoveUser(user.id)}>
                    <IonAvatar>
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.username} />
                      ) : (
                        <div className="default-avatar">{user.username.charAt(0).toUpperCase()}</div>
                      )}
                    </IonAvatar>
                    <IonLabel>{user.username}</IonLabel>
                    <IonIcon icon={close} />
                  </IonChip>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="search-section">
          <div className="section-header">
            <h2>Add People</h2>
          </div>

          <div className="search-container">
            <IonSearchbar
              value={searchText}
              onIonChange={(e) => setSearchText(e.detail.value!)}
              placeholder="Search users"
              debounce={300}
              showCancelButton="never"
              className="user-searchbar"
            />
          </div>

          {isSearching ? (
            <div className="search-loading">
              <IonSpinner name="crescent" />
              <IonText color="medium">Searching users...</IonText>
            </div>
          ) : searchResults.length > 0 ? (
            <IonList className="search-results">
              {searchResults.map((user) => {
                const isSelected = selectedUsers.some((selectedUser) => selectedUser.id === user.id);
                return (
                  <IonItem
                    key={user.id}
                    className={`user-item ${isSelected ? "selected" : ""}`}
                    button
                    onClick={() => handleUserSelect(user)}
                  >
                    <IonAvatar slot="start">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.username} />
                      ) : (
                        <div className="default-avatar">{user.username.charAt(0).toUpperCase()}</div>
                      )}
                    </IonAvatar>
                    <IonLabel>
                      <h2>{user.username}</h2>
                      {user.fullName && <p>{user.fullName}</p>}
                    </IonLabel>
                    {isSelected && <IonIcon icon={checkmark} slot="end" color="primary" className="selected-icon" />}
                  </IonItem>
                );
              })}
            </IonList>
          ) : searchText.trim() !== "" ? (
            <div className="no-results">
              <IonText color="medium">
                <p>No users found for "{searchText}"</p>
              </IonText>
            </div>
          ) : (
            <div className="search-prompt">
              <IonIcon icon={search} />
              <IonText color="medium">
                <p>Search for users to add to your group</p>
              </IonText>
            </div>
          )}
        </div>
      </IonContent>

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

export default GroupChatCreator;
