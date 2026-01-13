import admin from 'firebase-admin';

// This file provides a centralized way to initialize the Firebase Admin SDK.
// It ensures that the SDK is initialized only once, which is crucial for serverless environments.

// IMPORTANT: For this to work, you must set the SERVICE_ACCOUNT_KEY
// environment variable. This variable should contain the entire JSON content
// of your Firebase service account key file.

// To get your service account key:
// 1. Go to your Firebase project settings.
// 2. Navigate to the "Service accounts" tab.
// 3. Click "Generate new private key".
// 4. A JSON file will be downloaded. Copy the contents of this file.
// 5. Set the contents as the value for the SERVICE_ACCOUNT_KEY environment variable.

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

  // Try both variable names
  const serviceAccountKey = process.env.SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    // Log available env vars for debugging (carefully)
    const availableKeys = Object.keys(process.env).filter(k => k.includes('FIREBASE') || k.includes('SERVICE'));
    console.error('[FIREBASE ADMIN] Service account key not found. Available env vars:', availableKeys);
    throw new Error('Firebase service account key is not set in environment variables. Please set SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_KEY.');
  }

  // Log that we found the key (but don't log the actual key for security)
  const keyLength = serviceAccountKey.length;
  const keyPreview = serviceAccountKey.substring(0, 50) + '...';
  console.log(`[FIREBASE ADMIN] Found service account key (length: ${keyLength}, preview: ${keyPreview})`);

  try {
    console.log('[FIREBASE ADMIN] Parsing service account key...');
    const serviceAccount = JSON.parse(serviceAccountKey);
    console.log('[FIREBASE ADMIN] Service account parsed successfully. Project ID:', serviceAccount.project_id);

    // Validate required fields
    if (!serviceAccount.private_key) {
      throw new Error('Service account key is missing the private_key field');
    }
    if (!serviceAccount.client_email) {
      throw new Error('Service account key is missing the client_email field');
    }
    if (!serviceAccount.project_id) {
      throw new Error('Service account key is missing the project_id field');
    }

    // Convert \n to actual newlines in the private key
    // Handle both escaped newlines (\\n) and actual newlines
    let privateKey = serviceAccount.private_key;
    if (typeof privateKey === 'string') {
      // If it contains escaped newlines, convert them
      if (privateKey.includes('\\n') && !privateKey.includes('\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      // Ensure the private key starts and ends correctly
      if (!privateKey.includes('BEGIN PRIVATE KEY')) {
        console.warn('[FIREBASE ADMIN] Warning: Private key format may be incorrect');
      }
    }

    const processedServiceAccount = {
      ...serviceAccount,
      private_key: privateKey
    };

    console.log('[FIREBASE ADMIN] Initializing Firebase Admin app...');
    app = admin.initializeApp({
      credential: admin.credential.cert(processedServiceAccount),
    });

    console.log('[FIREBASE ADMIN] Firebase Admin app initialized successfully');
    return app;
  } catch (error: any) {
    console.error('[FIREBASE ADMIN] Error initializing Firebase Admin SDK:', error);
    
    // Provide more specific error messages
    if (error instanceof SyntaxError) {
      console.error('[FIREBASE ADMIN] JSON Parse Error: The service account key is not valid JSON. Check for proper escaping and formatting.');
      throw new Error('Service account key is not valid JSON. Please check the format and ensure it\'s properly escaped.');
    }
    
    if (error.message?.includes('private_key')) {
      console.error('[FIREBASE ADMIN] Private key error: Check that the private key is properly formatted with newlines.');
      throw new Error('Service account private key format is invalid. Ensure newlines are properly escaped as \\n.');
    }

    console.error('[FIREBASE ADMIN] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      // Don't log full stack in production
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message || 'Unknown error'}`);
  }
}

export function getAdminApp() {
  if (!app) {
    throw new Error('Firebase Admin app not initialized. Call initializeAdminApp() first.');
  }
  return app;
}
