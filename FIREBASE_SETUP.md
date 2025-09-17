# Firebase Admin SDK Setup

## Error Fix: Service Account Key Not Set

You're getting this error because the Firebase service account key is not set in your environment variables.

## Solution

1. **Get your Firebase Service Account Key:**
   - Go to your Firebase project console
   - Navigate to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

2. **Set the Environment Variable:**
   Create a `.env.local` file in your project root with:
   ```
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}
   ```
   
   Replace the entire JSON content from the downloaded file as the value.

3. **Alternative: Set in your deployment environment:**
   - For Vercel: Add `FIREBASE_SERVICE_ACCOUNT_KEY` in your project settings
   - For other platforms: Set the environment variable in your hosting platform

## Important Notes

- The JSON should be on a single line (no line breaks)
- Make sure to escape any quotes properly
- Never commit the actual service account key to version control
- The `.env.local` file should be in your `.gitignore`

## Verification

After setting the environment variable, restart your development server:
```bash
npm run dev
```

The error should be resolved and your Firebase Admin SDK should initialize properly.

