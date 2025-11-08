/**
 * Migration utility to seed infraction and bonus types from constants to Firestore
 * Run this once to migrate existing constants to Firestore
 */

import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { INFRACTION_TYPES, BONUS_TYPES } from '@/lib/constants';

export async function migrateTypesToFirestore() {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    // Get existing types
    const infractionTypesSnapshot = await getDocs(collection(db, 'infractionTypes'));
    const bonusTypesSnapshot = await getDocs(collection(db, 'bonusTypes'));

    // Get existing names to avoid duplicates
    const existingInfractionNames = new Set(
      infractionTypesSnapshot.docs.map(doc => doc.data().name)
    );
    const existingBonusNames = new Set(
      bonusTypesSnapshot.docs.map(doc => doc.data().name)
    );

    let infractionCount = 0;
    let bonusCount = 0;

    // Migrate infraction types (only add missing ones)
    for (const type of INFRACTION_TYPES) {
      if (!existingInfractionNames.has(type.name)) {
        const typeRef = doc(collection(db, 'infractionTypes'));
        await setDoc(typeRef, {
          name: type.name,
          deduction: type.deduction,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        infractionCount++;
      }
    }

    // Migrate bonus types (only add missing ones)
    for (const type of BONUS_TYPES) {
      if (!existingBonusNames.has(type.name)) {
        const typeRef = doc(collection(db, 'bonusTypes'));
        await setDoc(typeRef, {
          name: type.name,
          amount: type.amount,
          currency: type.currency,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        bonusCount++;
      }
    }

    const messages: string[] = [];
    if (infractionCount > 0) {
      messages.push(`Migrated ${infractionCount} infraction types`);
    }
    if (bonusCount > 0) {
      messages.push(`Migrated ${bonusCount} bonus types`);
    }
    if (infractionCount === 0 && bonusCount === 0) {
      messages.push('All types already exist in Firestore. No migration needed.');
    }

    return { 
      success: true, 
      message: messages.join('. ') + '.',
      infractionCount,
      bonusCount,
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: (error as Error).message };
  }
}

