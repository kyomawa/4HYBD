import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.beunreal',
  appName: 'BeUnreal',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    cleartext: true,
    allowNavigation: ['localhost', 'localhost:8100', 'localhost:3000']
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_logo",
      iconColor: "#0044CC"
    }
  }
};

export default config;
