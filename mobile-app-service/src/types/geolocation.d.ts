declare module "@capacitor/geolocation" {
  interface GeolocationPlugin {
    getCurrentPosition(options?: any): Promise<Position>;
    watchPosition(options: any, callback: Function): Promise<string>;
    clearWatch(options: { id: string }): Promise<void>;
    checkPermissions(): Promise<PermissionStatus>;
    requestPermissions(): Promise<PermissionStatus>;
  }

  interface Position {
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude: number | null;
      altitudeAccuracy: number | null;
      heading: number | null;
      speed: number | null;
    };
    timestamp: number;
  }

  interface PermissionStatus {
    location: PermissionState;
  }

  type PermissionState = "granted" | "denied" | "prompt";

  const Geolocation: GeolocationPlugin;
  export { Geolocation, Position, PermissionStatus, PermissionState };
}
