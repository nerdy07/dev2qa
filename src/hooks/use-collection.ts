
'use client';
import { useState, useEffect } from 'react';
import { db, firebaseInitialized } from '@/lib/firebase';
import { collection, onSnapshot, query, type Query, doc } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export function useCollection<T>(collectionName: string, firestoreQuery?: Query | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firebaseInitialized) {
        setLoading(false);
        // AuthProvider will show a config error, so we don't need to do anything here.
        return;
    }

    if (firestoreQuery === null) {
        setLoading(false);
        setData(null);
        setError(null);
        return;
    }

    // Use a stable query reference
    const q = firestoreQuery || query(collection(db!, collectionName));
    
    // Don't reset loading state if we already have data
    // This prevents flickering when the query is recreated but we already have data
    // The onSnapshot callback will update the data immediately when new documents are added
    setError(null);
    
    let isMounted = true;
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!isMounted) return;
      
      const docs: T[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as T);
      });
      setData(docs);
      setLoading(false);
      setError(null); // Clear any previous errors on success
    }, (err: any) => {
      if (!isMounted) return;
      
      if (err.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: (q as any)._query?.path?.segments?.join('/') || collectionName,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        // Set error but DON'T clear existing data - keep what was loaded
        // This prevents files from disappearing when permission errors occur
        setError(new Error('You do not have permission to view this data.'));
        // Use functional update to access current state value
        setData(currentData => {
          // Only set empty data if we don't have any data yet
          if (currentData === null) {
            return [];
          }
          // Keep existing data to prevent files from disappearing
          return currentData;
        });
        setLoading(false);
        console.warn('Permission denied for collection:', collectionName, 'but keeping existing data');
      } else {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [collectionName, firestoreQuery]);

  return { data, loading, error, setData };
}

export function useDocument<T>(collectionName: string, docId: string) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
  
    useEffect(() => {
      if (!firebaseInitialized) {
          setLoading(false);
          return;
      }

      if (!docId) {
        setLoading(false);
        setData(null);
        return;
      }
      const docRef = doc(db!, collectionName, docId);
      
      const unsubscribe = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          setData({ id: doc.id, ...doc.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      }, (err: any) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
          setError(new Error('You do not have permission to view this document.'));
        } else {
          console.error(err);
          setError(err);
        }
        setLoading(false);
      });
  
      return () => unsubscribe();
    }, [collectionName, docId]);
  
    return { data, loading, error, setData };
}
