import React, { useEffect, useState, type ReactNode, type ReactElement } from "react";
import {
  IonApp,
  IonRouterOutlet,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  setupIonicReact,
  IonSpinner,
  IonLoading,
  IonModal,
  IonToast,
  type IonIconCustomEvent,
  type IonTabButtonCustomEvent,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { camera, image, search, chatbubble, people } from "ionicons/icons";
import { isAuthenticated } from "./services/auth.service";
import { AuthProvider } from "./contexts/AuthContext";
import CameraView from "./components/CameraView";
import PostComposer from "./components/PostComposer";
import logoImage from "../assets/logo.png";
import { appInitService } from "./services/app-init.service";
import { logger } from "./services/logger.service";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/* Theme variables */
import "./theme/variables.css";

/* Pages */
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Chat from "./pages/Chat";
import Search from "./pages/Search";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Conversation from "./pages/Conversation";
import EditProfile from "./pages/EditProfile";
import UserProfile from "./pages/UserProfile";

/* Custom CSS */
import "./App.css";

setupIonicReact();

// Protected Route component
const ProtectedRoute: React.FC<{
  component: React.ComponentType<any>;
  path: string;
}> = ({ component: Component, path }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authed = await isAuthenticated();
        setIsAuthed(authed);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthed(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (isChecking) {
    return <IonLoading isOpen={true} message={"Please wait..."} />;
  }

  return isAuthed ? (
    <Component />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

const App: React.FC = (): ReactElement => {
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [showComposer, setShowComposer] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [showOfflineToast, setShowOfflineToast] = useState<boolean>(false);
  const [offlineToastMessage, setOfflineToastMessage] = useState<string>("");

  // Initialize app when component mounts
  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info("Initializing application");
        setIsInitializing(true);
        await appInitService.initialize();
      } catch (error) {
        logger.error("Error initializing app", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // Setup online/offline status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setOfflineToastMessage("You are back online");
      setShowOfflineToast(true);
      logger.info("App is online");
    };

    const handleOffline = () => {
      setIsOffline(true);
      setOfflineToastMessage("You are offline. Some features may be limited.");
      setShowOfflineToast(true);
      logger.warn("App is offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial status
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handlePhotoTaken = (webPath: string) => {
    setCapturedImage(webPath);
    setShowCameraModal(false);
    setShowComposer(true);
  };

  const handlePublishPost = async (caption: string) => {
    try {
      if (!capturedImage) return;

      // Reset states
      setCapturedImage(null);
      setShowComposer(false);

      // Reload feed if needed
      window.location.reload();
    } catch (error) {
      console.error("Error publishing post:", error);
    }
  };

  // Show loading screen while app is initializing
  if (isInitializing) {
    return (
      <IonApp>
        <div className="app-loading-container">
          <div className="app-loading-content">
            <img src="../assets/logo.png" alt="BeUnreal Logo" className="app-logo" />
            <h1>BeUnreal</h1>
            <IonSpinner name="crescent" color="primary" />
            <p>Loading your experience...</p>
          </div>
        </div>
      </IonApp>
    );
  }

  return (
    <AuthProvider>
      <IonApp>
        <IonReactRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/app" element={
              <IonTabs>
                <IonRouterOutlet>
                  <Route path="home" element={<ProtectedRoute component={Home} path="/app/home" />} />
                  <Route path="profile" element={<ProtectedRoute component={Profile} path="/app/profile" />} />
                  <Route path="search" element={<ProtectedRoute component={Search} path="/app/search" />} />
                  <Route path="chat" element={<ProtectedRoute component={Chat} path="/app/chat" />} />
                  <Route path="settings" element={<ProtectedRoute component={Settings} path="/app/settings" />} />
                  <Route path="conversation/:id" element={<ProtectedRoute component={Conversation} path="/app/conversation/:id" />} />
                  <Route path="edit-profile" element={<ProtectedRoute component={EditProfile} path="/app/edit-profile" />} />
                  <Route path="user/:id" element={<ProtectedRoute component={UserProfile} path="/app/user/:id" />} />
                  <Route path="" element={<Navigate to="/app/home" replace />} />
                </IonRouterOutlet>

                <IonTabBar slot="bottom" className="app-tab-bar">
                  <IonTabButton tab="home" href="/app/home">
                    <IonIcon icon={people} />
                    <IonLabel>Feed</IonLabel>
                  </IonTabButton>
                  <IonTabButton tab="search" href="/app/search">
                    <IonIcon icon={search} />
                    <IonLabel>Search</IonLabel>
                  </IonTabButton>
                  <IonTabButton
                    tab="capture"
                    onClick={() => setShowCameraModal(true)}
                    className="capture-tab"
                    disabled={isOffline}
                  >
                    <IonIcon icon={camera} className="capture-icon" />
                  </IonTabButton>
                  <IonTabButton tab="chat" href="/app/chat">
                    <IonIcon icon={chatbubble} />
                    <IonLabel>Chat</IonLabel>
                  </IonTabButton>
                  <IonTabButton tab="profile" href="/app/profile">
                    <IonIcon icon={image} />
                    <IonLabel>Profile</IonLabel>
                  </IonTabButton>
                </IonTabBar>
              </IonTabs>
            } />
          </Routes>

          <IonModal isOpen={showCameraModal} onDidDismiss={() => setShowCameraModal(false)} className="camera-modal">
            <CameraView onPhotoTaken={handlePhotoTaken} onClose={() => setShowCameraModal(false)} />
          </IonModal>

          <IonModal isOpen={showComposer} onDidDismiss={() => setShowComposer(false)} className="composer-modal">
            {capturedImage && (
              <PostComposer
                imageUrl={capturedImage}
                onPublish={handlePublishPost}
                onCancel={() => {
                  setShowComposer(false);
                  setCapturedImage(null);
                }}
              />
            )}
          </IonModal>

          <IonToast
            isOpen={showOfflineToast}
            onDidDismiss={() => setShowOfflineToast(false)}
            message={offlineToastMessage}
            duration={3000}
            position="bottom"
          />
        </IonReactRouter>
      </IonApp>
    </AuthProvider>
  );
};

export default App;
