
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import type { User as AuthUser } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

import type { User } from '@/lib/types';
import { auth, db, firebaseInitialized } from '@/lib/firebase';
import { TriangleAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { PERMISSIONS_BY_ROLE } from '@/lib/roles';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => void;
  loading: boolean;
  sendPasswordReset: (email: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          throw error;
        }, 0);
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null;
}


function MissingFirebaseConfig() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8 text-center">
            <div className="w-full max-w-3xl rounded-xl border-2 border-destructive bg-card p-6 shadow-2xl sm:p-8">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <TriangleAlert className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold text-destructive">Firebase Configuration Missing</h1>
                <p className="mt-4 text-card-foreground">
                    Your Firebase environment variables are not set correctly. The application cannot connect to Firebase services without them.
                </p>
                <p className="mt-2 text-muted-foreground">
                    Please create a <code className="bg-muted px-1 py-0.5 rounded-sm">.env</code> file in the project root and add your Firebase configuration.
                </p>
                <div className="mt-6 w-full overflow-x-auto rounded-md bg-muted p-4 text-left text-sm font-mono">
                    <pre className="text-muted-foreground">
{`NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcdef..."`}
                    </pre>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                    You can find these values in your Firebase project settings under "General" > "Your apps" > "Web app". After adding them, you may need to restart the development server.
                </p>
            </div>
        </div>
    );
}

const FullPageSkeleton = () => (
    <div className="flex min-h-screen w-full bg-background">
        <div className="hidden h-screen w-64 flex-col border-r bg-card shadow-sm md:flex">
            <div className="flex h-16 items-center border-b px-6">
                <Skeleton className="h-8 w-32" />
            </div>
            <div className="flex-1 overflow-y-auto">
                <nav className="grid items-start gap-1 px-4 py-4 text-sm font-medium">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                    ))}
                </nav>
            </div>
        </div>
        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
            <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-8">
                    <div className="grid gap-1">
                        <Skeleton className="h-9 w-64" />
                        <Skeleton className="h-5 w-80" />
                    </div>
                </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-[109px] w-full" />
                <Skeleton className="h-[109px] w-full" />
                <Skeleton className="h-[109px] w-full" />
                <Skeleton className="h-[109px] w-full" />
              </div>
              <div className="mt-8">
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="rounded-lg border shadow-sm">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-5 w-32" /></th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell"><Skeleton className="h-5 w-24" /></th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {[...Array(5)].map((_, i) => (
                                    <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle"><Skeleton className="h-5 w-40" /></td>
                                        <td className="p-4 align-middle hidden md:table-cell"><Skeleton className="h-5 w-28" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              </div>
            </div>
        </main>
    </div>
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const userPermissions = useMemo(() => {
    if (!user) return [];
    return PERMISSIONS_BY_ROLE[user.role as keyof typeof PERMISSIONS_BY_ROLE] || [];
  }, [user]);

  const hasPermission = (permission: string) => {
    return userPermissions.includes(permission);
  };

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        try {
            if (authUser) {
                const userDocRef = doc(db, 'users', authUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
                    if (userData.disabled) {
                        await signOut(auth);
                        setUser(null);
                    } else {
                        const userWithToken: User = {
                            id: authUser.uid,
                            name: authUser.displayName || userData.name,
                            email: authUser.email!,
                            role: userData.role,
                            photoURL: authUser.photoURL || undefined,
                            expertise: userData.expertise,
                            baseSalary: userData.baseSalary,
                            annualLeaveEntitlement: userData.annualLeaveEntitlement,
                            disabled: userData.disabled,
                        };
                        setUser(userWithToken);
                    }
                } else {
                    console.warn(`User ${authUser.uid} is authenticated but has no Firestore document. Logging out.`);
                    await signOut(auth);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Error during authentication state change:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && firebaseInitialized) {
      const isAuthPage = pathname === '/';
      const isSignupPage = pathname === '/signup'; 
      const isPublicPage = isAuthPage || isSignupPage;

      if (user && isPublicPage) {
        router.push('/dashboard');
      } else if (!user && !isPublicPage) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router, firebaseInitialized]);


  const login = (email: string, pass: string) => {
    if (!auth) return Promise.reject(new Error("Firebase not initialized. Check your .env file."));
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = () => {
    if (!auth) return Promise.reject(new Error("Firebase not initialized. Check your .env file."));
    return signOut(auth);
  };
  
  const sendPasswordReset = async (email: string) => {
    if (!auth) throw new Error("Firebase not initialized. Check your .env file.");
    await sendPasswordResetEmail(auth, email);
  }

  const value = { user, login, logout, loading, sendPasswordReset, hasPermission };

  if (!firebaseInitialized) {
    return <MissingFirebaseConfig />;
  }

  if (loading) {
    return <FullPageSkeleton />;
  }

  return (
    <AuthContext.Provider value={value}>
      <FirebaseErrorListener />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
