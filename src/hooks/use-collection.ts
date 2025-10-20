
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
        setLoading(true);
        setData(null);
        return;
    }

    const q = firestoreQuery || query(collection(db!, collectionName));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs: T[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as T);
      });
      setData(docs);
      setLoading(false);
    }, (err: any) => {
      if (err.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: (q as any)._query.path.segments.join('/'),
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        // We still set a generic error for the component's internal state
        setError(new Error('You do not have permission to view this data.'));
      } else {
        console.error(err);
        setError(err);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
