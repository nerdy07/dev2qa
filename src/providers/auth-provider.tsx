'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User as AuthUser } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

import type { User } from '@/lib/types';
import { auth, db, firebaseInitialized } from '@/lib/firebase';
import { TriangleAlert } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<any>;
  signup: (name: string, email: string, pass: string) => Promise<any>;
  logout: () => void;
  loading: boolean;
  createUser: (name: string, email: string, pass: string, role: 'requester' | 'qa_tester') => Promise<any>;
  updateUser: (uid: string, data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // User is signed in
        const userDocRef = doc(db!, 'users', authUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          setUser({
            id: authUser.uid,
            name: authUser.displayName || userData.name,
            email: authUser.email!,
            role: userData.role,
            photoURL: authUser.photoURL || undefined
          });
        } else {
            // This case might happen if a user is created in Auth but not in Firestore
            console.error("No user document found in Firestore for UID:", authUser.uid);
            setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && firebaseInitialized) {
      const isAuthPage = pathname === '/' || pathname === '/signup';
      if (user && isAuthPage) {
        router.push('/dashboard');
      } else if (!user && !isAuthPage) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);


  const login = (email: string, pass: string) => {
    if (!auth) return Promise.reject(new Error("Firebase not initialized. Check your .env file."));
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const signup = async (name: string, email: string, pass: string) => {
    if (!auth || !db) return Promise.reject(new Error("Firebase not initialized. Check your .env file."));
    
    // Check if any user exists to determine role
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, limit(1));
    const querySnapshot = await getDocs(q);
    const isFirstUser = querySnapshot.empty;
    const role = isFirstUser ? 'admin' : 'requester';

    // Create user in Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName: name });
    
    // Create user document in Firestore
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userDocRef, {
        name,
        email,
        role,
    });

    // Manually set the user in the context so they are logged in immediately
    setUser({
        id: userCredential.user.uid,
        name: name,
        email: email,
        role: role,
        photoURL: undefined
    });

    return userCredential;
  };

  const logout = () => {
    if (!auth) return Promise.reject(new Error("Firebase not initialized. Check your .env file."));
    return signOut(auth);
  };

  const createUser = async (name: string, email: string, pass: string, role: 'requester' | 'qa_tester') => {
    if (!auth || !db) return Promise.reject(new Error("Firebase not initialized. Check your .env file."));
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName: name });
    
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userDocRef, {
        name,
        email,
        role,
    });

    return userCredential;
  };

  const updateUser = async (uid: string, data: Partial<User>) => {
    if (!db) return Promise.reject(new Error("Firebase not initialized. Check your .env file."));
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, data, { merge: true });
  }

  const value = { user, login, signup, logout, loading, createUser, updateUser };

  if (!firebaseInitialized) {
    return <MissingFirebaseConfig />;
  }

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
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
