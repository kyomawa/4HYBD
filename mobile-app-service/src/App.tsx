import React, { useEffect, useState } from "react";
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
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Route, Redirect } from "react-router";
import { camera, image, search, chatbubble, people } from "ionicons/icons";
import { isAuthenticated } from "./services/auth.service";
import { AuthProvider } from "./contexts/AuthContext";
import CameraView from "./components/CameraView";
import PostComposer from "./components/PostComposer";
import { takePicture } from "./services/camera.service";
import { createPost } from "./services/post.service";
import { CameraResultType, CameraSource } from "@capacitor/camera";
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
import PhotoView from "./pages/PhotoView";
import UserProfile from "./pages/UserProfile";

/* Custom CSS */
import "./App.css";

setupIonicReact();

// Protected Route component
const ProtectedRoute: React.FC<{
  component: React.ComponentType<any>;
  exact?: boolean;
  path: string;
}> = ({ component: Component, ...rest }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

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

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthed ? <Component {...props} /> : <Redirect to={{ pathname: "/login", state: { from: props.location } }} />
      }
    />
  );
};

const App: React.FC = () => {
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

      await createPost(capturedImage, caption);

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
            <img src="assets/logo.png" alt="BeUnreal Logo" className="app-logo" />
            <h1>BeUnreal</h1>
            <IonSpinner name="crescent" />
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
          <Route path="/login" component={Login} exact />
          <Route path="/register" component={Register} exact />

          <Route path="/app">
            <IonTabs>
              <IonRouterOutlet>
                <ProtectedRoute path="/app/home" component={Home} exact />
                <ProtectedRoute path="/app/profile" component={Profile} exact />
                <ProtectedRoute path="/app/search" component={Search} exact />
                <ProtectedRoute path="/app/chat" component={Chat} exact />
                <ProtectedRoute path="/app/settings" component={Settings} exact />
                <ProtectedRoute path="/app/conversation/:id" component={Conversation} exact />
                <ProtectedRoute path="/app/edit-profile" component={EditProfile} exact />
                <ProtectedRoute path="/app/photo/:id" component={PhotoView} exact />
                <ProtectedRoute path="/app/user/:id" component={UserProfile} exact />
                <Route exact path="/app">
                  <Redirect to="/app/home" />
                </Route>
              </IonRouterOutlet>

              <IonTabBar slot="bottom" className="app-tab-bar">
                <IonTabButton tab="home" href="/app/home">
                  <IonIcon aria-hidden="true" icon={people} />
                  <IonLabel>Feed</IonLabel>
                </IonTabButton>
                <IonTabButton tab="search" href="/app/search">
                  <IonIcon aria-hidden="true" icon={search} />
                  <IonLabel>Search</IonLabel>
                </IonTabButton>
                <IonTabButton
                  tab="capture"
                  onClick={() => setShowCameraModal(true)}
                  className="capture-tab"
                  disabled={isOffline}
                >
                  <div className="capture-button-wrapper">
                    <IonIcon aria-hidden="true" icon={camera} className="capture-icon" />
                  </div>
                </IonTabButton>
                <IonTabButton tab="chat" href="/app/chat">
                  <IonIcon aria-hidden="true" icon={chatbubble} />
                  <IonLabel>Chat</IonLabel>
                </IonTabButton>
                <IonTabButton tab="profile" href="/app/profile">
                  <IonIcon aria-hidden="true" icon={image} />
                  <IonLabel>Profile</IonLabel>
                </IonTabButton>
              </IonTabBar>
            </IonTabs>

            {/* Camera Modal */}
            <IonModal isOpen={showCameraModal} onDidDismiss={() => setShowCameraModal(false)} className="camera-modal">
              <CameraView onPhotoTaken={handlePhotoTaken} onClose={() => setShowCameraModal(false)} />
            </IonModal>

            {/* Post Composer */}
            <IonModal
              isOpen={showComposer}
              onDidDismiss={() => {
                setShowComposer(false);
                setCapturedImage(null);
              }}
              className="composer-modal"
            >
              <PostComposer
                imageUrl={capturedImage || ""}
                onPublish={handlePublishPost}
                onCancel={() => {
                  setShowComposer(false);
                  setCapturedImage(null);
                }}
              />
            </IonModal>
          </Route>

          <Route exact path="/">
            <Redirect to="/app/home" />
          </Route>
        </IonReactRouter>

        {/* Offline Toast */}
        <IonToast
          isOpen={showOfflineToast}
          onDidDismiss={() => setShowOfflineToast(false)}
          message={offlineToastMessage}
          position="top"
          duration={3000}
          color={isOffline ? "warning" : "success"}
          buttons={[
            {
              text: "OK",
              role: "cancel",
            },
          ]}
        />
      </IonApp>
    </AuthProvider>
  );
};

export default App;
