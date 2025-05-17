import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { APP_CONFIG, AppMode, DEFAULT_APP_MODE } from "../config";
import { Logger } from "./logger.service";
import { syncPendingUserUpdates, syncPendingSocialActions, isAuthenticated } from "./auth.service";
import { syncPendingUploads, syncPendingDeletions } from "./media.service";
import { syncPendingStories } from "./story.service";
import { syncPendingLocationUpdates } from "./location.service";
import { initNotifications } from "./notification.service";

// Key for app initialization
const APP_INITIALIZED_KEY = "app_initialized";
const APP_MODE_KEY = "app_mode";
const APP_VERSION_KEY = "app_version";
const CURRENT_APP_VERSION = "1.0.0";

/**
 * Service responsable de l'initialisation et de la configuration de l'application
 */
class AppInitService {
  private static instance: AppInitService;
  private logger = new Logger("AppInitService");
  private isInitialized = false;
  private appMode: AppMode = DEFAULT_APP_MODE;

  private constructor() {}

  /**
   * Obtenir l'instance du service (Singleton)
   */
  public static getInstance(): AppInitService {
    if (!AppInitService.instance) {
      AppInitService.instance = new AppInitService();
    }
    return AppInitService.instance;
  }

  /**
   * Initialiser l'application
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      this.logger.info("Initializing application");

      // Vérifier si l'application a déjà été initialisée
      const wasInitialized = await this.checkIfInitialized();

      // Charger le mode d'application
      await this.loadAppMode();

      // Initialiser les services nécessaires
      await this.initializeServices();

      // Synchroniser les données si connecté
      if (navigator.onLine) {
        await this.syncOfflineData();
      }

      // Si première initialisation, effectuer des actions supplémentaires
      if (!wasInitialized) {
        await this.firstTimeInitialization();
      }

      // Vérifier les mises à jour de l'application
      await this.checkForUpdates();

      // Configurer les écouteurs d'événements
      this.setupEventListeners();

      this.isInitialized = true;
      await Preferences.set({
        key: APP_INITIALIZED_KEY,
        value: "true",
      });

      this.logger.info("Application initialized successfully");
      return true;
    } catch (error) {
      this.logger.error("Failed to initialize application", error);
      return false;
    }
  }

  /**
   * Vérifier si l'application a déjà été initialisée
   */
  private async checkIfInitialized(): Promise<boolean> {
    const result = await Preferences.get({ key: APP_INITIALIZED_KEY });
    return result.value === "true";
  }

  /**
   * Charger le mode d'application (online, offline, hybrid)
   */
  private async loadAppMode(): Promise<void> {
    const result = await Preferences.get({ key: APP_MODE_KEY });

    if (result.value) {
      this.appMode = result.value as AppMode;
    } else {
      this.appMode = DEFAULT_APP_MODE;
      await Preferences.set({
        key: APP_MODE_KEY,
        value: this.appMode,
      });
    }

    this.logger.info(`App mode set to: ${this.appMode}`);
  }

  /**
   * Obtenir le mode d'application actuel
   */
  public getAppMode(): AppMode {
    return this.appMode;
  }

  /**
   * Définir le mode d'application
   */
  public async setAppMode(mode: AppMode): Promise<void> {
    this.appMode = mode;
    await Preferences.set({
      key: APP_MODE_KEY,
      value: mode,
    });
    this.logger.info(`App mode changed to: ${mode}`);
  }

  /**
   * Initialiser les services nécessaires
   */
  private async initializeServices(): Promise<void> {
    // Initialiser les notifications
    await initNotifications();

    // Autres initialisations de services si nécessaire
  }

  /**
   * Synchroniser les données offline avec le backend
   */
  private async syncOfflineData(): Promise<void> {
    try {
      this.logger.info("Syncing offline data with backend");

      // Vérifier si l'utilisateur est authentifié
      const isUserAuthenticated = await isAuthenticated();

      if (!isUserAuthenticated) {
        this.logger.info("User not authenticated, skipping data sync");
        return;
      }

      // Synchroniser les données utilisateur
      await syncPendingUserUpdates();

      // Synchroniser les actions sociales (follow/unfollow)
      await syncPendingSocialActions();

      // Synchroniser les médias
      await syncPendingUploads();
      await syncPendingDeletions();

      // Synchroniser les stories
      await syncPendingStories();

      // Synchroniser les données de localisation
      await syncPendingLocationUpdates();

      this.logger.info("Offline data sync completed");
    } catch (error) {
      this.logger.error("Error syncing offline data", error);
    }
  }

  /**
   * Actions à effectuer lors de la première initialisation de l'application
   */
  private async firstTimeInitialization(): Promise<void> {
    this.logger.info("Performing first-time initialization");

    // Définir les paramètres par défaut
    await Preferences.set({
      key: "app_first_run",
      value: "false",
    });

    // Sauvegarder la version actuelle de l'application
    await Preferences.set({
      key: APP_VERSION_KEY,
      value: CURRENT_APP_VERSION,
    });
  }

  /**
   * Vérifier les mises à jour de l'application
   */
  private async checkForUpdates(): Promise<void> {
    const result = await Preferences.get({ key: APP_VERSION_KEY });
    const previousVersion = result.value;

    if (previousVersion && previousVersion !== CURRENT_APP_VERSION) {
      this.logger.info(`Updating from version ${previousVersion} to ${CURRENT_APP_VERSION}`);

      // Effectuer des migrations de données si nécessaire

      // Mettre à jour la version
      await Preferences.set({
        key: APP_VERSION_KEY,
        value: CURRENT_APP_VERSION,
      });
    }
  }

  /**
   * Configurer les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Écouteur de mise en arrière-plan de l'application
    if (Capacitor.isNativePlatform()) {
      // En cas de mise en arrière-plan, on peut sauvegarder des données, etc.
      document.addEventListener("pause", () => {
        this.logger.info("Application paused");
        // Sauvegarder des données ou effectuer d'autres actions
      });

      // En cas de remise au premier plan, on peut rafraîchir des données, etc.
      document.addEventListener("resume", async () => {
        this.logger.info("Application resumed");

        // Synchroniser les données si connecté
        if (navigator.onLine) {
          await this.syncOfflineData();
        }
      });
    }

    // Écouteur de changement de connectivité
    window.addEventListener("online", async () => {
      this.logger.info("Device is online");
      await this.syncOfflineData();
    });

    window.addEventListener("offline", () => {
      this.logger.info("Device is offline");
      // Peut-être afficher une notification à l'utilisateur
    });
  }
}

export const appInitService = AppInitService.getInstance();
