import { NextResponse } from 'next/server';
import { getAuth, getFirestore } from '@/lib/firebase-admin-simple';
import { sendWelcomeEmail } from '@/app/requests/actions';
import { requireAdmin } from '@/lib/auth-middleware';
import { rateLimit, rateLimitKeyFromRequestHeaders } from '@/lib/rate-limit';
import { sanitizeString } from '@/lib/validation';
import type { User } from '@/lib/types';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['requester', 'qa_tester', 'admin']),
  expertise: z.string().optional(),
  baseSalary: z.number().min(0).optional(),
  annualLeaveEntitlement: z.number().min(0).optional(),
});

async function createUserHandler(request: any) {
  try {
    const adminAuth = getAuth();
    const db = getFirestore();

    const body = await request.json();

    // Basic rate limiting: 10 requests / 60s per uid/ip
    const key = rateLimitKeyFromRequestHeaders(request.headers);
    if (!rateLimit(`create-user:${key}`, { max: 10, windowMs: 60_000 })) {
      return NextResponse.json({ message: 'Too many requests' }, { status: 429 });
    }
    
    // Validate input
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      }, { status: 400 });
    }

    const { name, email, password, role, expertise, baseSalary, annualLeaveEntitlement } = validationResult.data;

    // Sanitize strings defensively
    const safeName = sanitizeString(name);
    const safeExpertise = expertise ? sanitizeString(expertise) : undefined;

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: safeName,
      disabled: false,
    });

    // Create user document in Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const userData: Omit<User, 'id'> = {
        name: safeName,
        email,
        role,
        baseSalary: baseSalary || 0,
        annualLeaveEntitlement: annualLeaveEntitlement ?? 20,
        expertise: role === 'qa_tester' ? (safeExpertise || '') : '',
        disabled: false,
    };
    await userDocRef.set(userData);

    // Send welcome email without waiting for it to complete.
    // If it fails, log it, but don't fail the entire user creation process.
    sendWelcomeEmail({ name, email, password }).then(result => {
      if (!result.success) {
          console.error(`Welcome email failed for ${email}: ${result.error}`);
      }
    });

    return NextResponse.json({ uid: userRecord.uid, message: 'User created successfully' });

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Provide a more specific error message back to the client.
    let errorMessage = error.message || 'An unexpected error occurred during user creation.';
    
    // Customize messages for common Firebase Auth errors
    if (error.code) {
        switch (error.code) {
            case 'auth/email-already-exists':
                errorMessage = 'The email address is already in use by another account.';
                break;
            case 'auth/invalid-password':
                errorMessage = 'The password must be a string with at least 6 characters.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'The email address provided is not a valid email address.';
                break;
        }
    }

    return NextResponse.json({ message: errorMessage, error: error.code || 'UNKNOWN_ERROR' }, { status: 500 });
  }
}

export const POST = requireAdmin(createUserHandler);
