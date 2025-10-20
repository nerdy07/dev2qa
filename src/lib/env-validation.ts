import { z } from 'zod';

// Separate schemas for client (public) and server (private) environments
const publicEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API key is required'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'Firebase auth domain is required'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Firebase project ID is required'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, 'Firebase storage bucket is required'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, 'Firebase messaging sender ID is required'),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase app ID is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const serverEnvSchema = z.object({
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().min(1, 'Firebase service account key is required'),
  BREVO_API_KEY: z.string().min(1, 'Brevo API key is required'),
  BREVO_SENDER_EMAIL: z.string().email('Invalid sender email'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let _publicEnv: PublicEnv | null = null;
let _serverEnv: ServerEnv | null = null;

export function getPublicEnv(): PublicEnv {
  if (_publicEnv) return _publicEnv;

  // Read each var explicitly so Next.js can inline values in client bundles
  const raw: PublicEnv = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as any,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as any,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as any,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as any,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as any,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as any,
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
  };

  // In the browser, these values are inlined at build-time; don't hard-fail here
  if (typeof window !== 'undefined') {
    _publicEnv = {
      NEXT_PUBLIC_FIREBASE_API_KEY: raw.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: raw.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: raw.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: raw.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: raw.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      NEXT_PUBLIC_FIREBASE_APP_ID: raw.NEXT_PUBLIC_FIREBASE_APP_ID || '',
      NODE_ENV: raw.NODE_ENV,
    };
    return _publicEnv;
  }

  // On the server, validate strictly
  const result = publicEnvSchema.safeParse(raw);
  if (result.success) {
    _publicEnv = result.data;
    return _publicEnv;
  }
  const missingVars = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
  throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
}

export function getServerEnv(): ServerEnv {
  if (_serverEnv) return _serverEnv;
  try {
    _serverEnv = serverEnvSchema.parse(process.env);
    return _serverEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

export function isDevelopment(): boolean {
  return (process.env.NODE_ENV || 'development') === 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
