import admin from 'firebase-admin';
import { getServerEnv } from './env-validation';

// Simple Firebase Admin initialization for Next.js
let app: admin.app.App | null = null;

export function getFirebaseAdmin() {
  if (app) {
    return app;
  }

  // Check if already initialized
  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    return app;
  }

  const serviceAccountKey = getServerEnv().FIREBASE_SERVICE_ACCOUNT_KEY;

  // Environment validation is handled by getEnv()

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    
    // Convert \n to actual newlines in the private key
    const processedServiceAccount = {
      ...serviceAccount,
      private_key: serviceAccount.private_key.replace(/\\n/g, '\n')
    };

    app = admin.initializeApp({
      credential: admin.credential.cert(processedServiceAccount),
    });

    return app;
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Check your FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
  }
}

export function getAuth() {
  const app = getFirebaseAdmin();
  return admin.auth(app);
}

export function getFirestore() {
  const app = getFirebaseAdmin();
  return admin.firestore(app);
}
