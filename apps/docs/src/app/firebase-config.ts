import type { FirebaseOptions } from 'firebase/app';

/**
 * Firebase web configuration is an identifier for the public browser app, not
 * a credential. Keep server/admin credentials out of this repository.
 */
export const FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: 'AIzaSyBsFKWPc4DKpthNYRl6yZGl1bH9t3uiLfA',
  authDomain: 'libregrid.firebaseapp.com',
  projectId: 'libregrid',
  storageBucket: 'libregrid.firebasestorage.app',
  messagingSenderId: '930129144043',
  appId: '1:930129144043:web:6e442460858874e0ffb6ae',
  measurementId: 'G-WH0PZ7X2YJ',
};
