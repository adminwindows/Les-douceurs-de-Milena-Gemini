import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adminwindows.lesdouceursdemilena',
  appName: 'Les Douceurs de Miléna',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
