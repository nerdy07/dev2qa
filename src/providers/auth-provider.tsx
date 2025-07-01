'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User as AuthUser } from 'firebase/auth';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

import type { User } from '@/lib/types';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => void;
  loading: boolean;
  createUser: (name: string, email: string, pass: string, role: 'requester' | 'qa_tester') => Promise<any>;
  updateUser: (uid: string, data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // User is signed in
        const userDocRef = doc(db, 'users', authUser.uid);
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
    if (!loading) {
      const isAuthPage = pathname === '/';
      if (user && isAuthPage) {
        router.push('/dashboard');
      } else if (!user && !isAuthPage) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);


  const login = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = () => {
    return signOut(auth);
  };

  const createUser = async (name: string, email: string, pass: string, role: 'requester' | 'qa_tester') => {
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
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, data, { merge: true });
  }

  const value = { user, login, logout, loading, createUser, updateUser };

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
