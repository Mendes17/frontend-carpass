import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carpass.app',
  appName: 'CarPass App',
  webDir: 'dist/carpass-web/browser',
  server: {
    androidScheme: 'http'
  }
};

export default config;
