// Export all services from this file for easy importing
export {
  setupConnectivityListeners as setupAuthConnectivityListeners,
  // ... other exports from auth.service
} from './auth.service';

export {
  dataUrlToBlob as cameraDataUrlToBlob,
  getPhotos as cameraGetPhotos,
  // ... other exports from camera.service
} from './camera.service';

export {
  syncPendingDeletions as mediaSyncPendingDeletions,
  syncPendingUploads as mediaSyncPendingUploads,
  // ... other exports from media.service
} from './media.service';

export {
  setupConnectivityListeners as setupChatConnectivityListeners,
  // ... other exports from chat.service
} from './chat.service';

export {
  setupConnectivityListeners as setupLocationConnectivityListeners,
  // ... other exports from location.service
} from './location.service';

export {
  setupConnectivityListeners as setupStorageConnectivityListeners,
  // ... other exports from storage.service
} from './storage.service';

// Export other services normally
export * from './story.service';
export * from './notification.service';
export * from './logger.service';
export * from './error.service';
export * from './app-init.service';
export * from './i18n.service';