import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kifaruinteractive.longhaulafrica',
  appName: 'Kifaru APK',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#140c08',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
