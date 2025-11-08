
import * as admin from 'firebase-admin';

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

let app: admin.app.App | undefined;

export async function initializeAdminApp(): Promise<admin.app.App> {
  // Return existing app if already initialized
  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    return app;
  }
  
  const serviceAccountKey = process.env.SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('Firebase service account key is not set in environment variables. Please set SERVICE_ACCOUNT_KEY.');
  }

  try {
    let serviceAccount;
    
    // Handle both JSON string and already parsed object
    if (typeof serviceAccountKey === 'string') {
      serviceAccount = JSON.parse(serviceAccountKey);
    } else {
      serviceAccount = serviceAccountKey;
    }
    
    // Ensure private_key has proper newlines for PEM format
    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      let privateKey = serviceAccount.private_key;
      
      // After JSON.parse(), escaped newlines in the JSON string become literal "\n"
      // We need to convert these to actual newline characters for PEM format
      // Check for literal backslash-n sequence (not actual newline)
      if (privateKey.includes('\\n') && !privateKey.includes('\n')) {
        // Replace literal \n with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // Verify it's a valid PEM format (starts with -----BEGIN)
      const trimmedKey = privateKey.trim();
      if (!trimmedKey.startsWith('-----BEGIN')) {
        throw new Error('Invalid private key format. The private_key must be in PEM format starting with "-----BEGIN". Make sure your SERVICE_ACCOUNT_KEY contains a properly formatted private key.');
      }
      
      serviceAccount.private_key = privateKey;
    }
    
    // Initialize the default Firebase Admin app
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    // Verify the app was initialized successfully
    if (!app) {
      throw new Error('Failed to initialize Firebase Admin app. The app object is undefined.');
    }

    return app;

  } catch (error: any) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    
    // Provide more specific error messages
    if (error.message.includes('Unexpected token') || error.message.includes('JSON')) {
      throw new Error('Invalid SERVICE_ACCOUNT_KEY format. Please ensure it contains valid JSON. Make sure the entire JSON object is set as the value.');
    } else if (error.message.includes('ENOENT')) {
      throw new Error('SERVICE_ACCOUNT_KEY file not found. Please check the file path.');
    } else if (error.message.includes('PEM') || error.message.includes('private key')) {
      throw new Error('Invalid private key format in SERVICE_ACCOUNT_KEY. Ensure the private_key field contains proper PEM-formatted key with \\n for line breaks.');
    } else {
      throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
    }
  }
}
