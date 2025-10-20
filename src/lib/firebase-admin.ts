import admin from 'firebase-admin';

// This file provides a centralized way to initialize the Firebase Admin SDK.
// It ensures that the SDK is initialized only once, which is crucial for serverless environments.

// IMPORTANT: For this to work, you must set the FIREBASE_SERVICE_ACCOUNT_KEY
// environment variable. This variable should contain the entire JSON content
// of your Firebase service account key file.

// To get your service account key:
// 1. Go to your Firebase project settings.
// 2. Navigate to the "Service accounts" tab.
// 3. Click "Generate new private key".
// 4. A JSON file will be downloaded. Copy the contents of this file.
// 5. Set the contents as the value for the FIREBASE_SERVICE_ACCOUNT_KEY environment variable.

let app: admin.app.App | null = null;

export async function initializeAdminApp() {
  // Check if already initialized
  if (app) {
    return app;
  }
  
  // Check if any app is already initialized
  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    return app;
  }
  
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('Firebase service account key is not set in environment variables. Please set FIREBASE_SERVICE_ACCOUNT_KEY.');
  }

  try {
    console.log('Parsing service account key...');
    const serviceAccount = JSON.parse(serviceAccountKey);
    console.log('Service account parsed successfully');
    
    // Convert \n to actual newlines in the private key
    const processedServiceAccount = {
      ...serviceAccount,
      private_key: serviceAccount.private_key.replace(/\\n/g, '\n')
    };
    
    console.log('Initializing Firebase Admin app...');
    app = admin.initializeApp({
      credential: admin.credential.cert(processedServiceAccount),
    });
    
    console.log('Firebase Admin app initialized successfully');
    return app;
  } catch (error: any) {
    console.error('Error initializing Firebase Admin SDK:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    throw new Error('Failed to initialize Firebase Admin SDK. Check your FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
  }
}

export function getAdminApp() {
  if (!app) {
    throw new Error('Firebase Admin app not initialized. Call initializeAdminApp() first.');
  }
  return app;
}
