import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emilycogsdill.blogadmin',
  appName: 'Blog Admin',
  webDir: 'dist',
  server: {
    // For production, the app will call the live API
    androidScheme: 'https',
  },
};

export default config;
