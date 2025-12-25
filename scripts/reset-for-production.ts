/**
 * Production Reset Script
 * 
 * This script will:
 * 1. Delete all users except the 3 specified production users
 * 2. Delete all data from collections (requests, certificates, transactions, etc.)
 * 3. Recreate the 3 users with specified credentials
 * 
 * WARNING: This is a destructive operation. Use only for production setup.
 * 
 * Run with: npx tsx scripts/reset-for-production.ts
 */

import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Production users to keep
const PRODUCTION_USERS = [
  {
    email: 'Sshuaibu@echobitstech.com',
    password: 'Passw0rd!',
    name: 'Admin',
    role: 'admin',
    baseSalary: 0, // Set to 0 if not included in payroll
    annualLeaveEntitlement: 20,
  },
  {
    email: 'Aneesa.shuaibu@echobitstech.com',
    password: '12345678',
    name: 'QA',
    role: 'qa_tester',
    baseSalary: 0,
    annualLeaveEntitlement: 20,
  },
  {
    email: 'Shuaibusalim@gmail.com',
    password: '123456789',
    name: 'Requester',
    role: 'requester',
    baseSalary: 0,
    annualLeaveEntitlement: 20,
  },
];

// Collections to clear (all data will be deleted)
const COLLECTIONS_TO_CLEAR = [
  'requests',
  'certificates',
  'transactions',
  'bonuses',
  'infractions',
  'comments',
  'designs',
  'projects',
  'teams',
  'roles', // We'll recreate default roles after
];

async function initializeFirebase() {
  if (admin.apps.length > 0) {
    return;
  }

  const serviceAccountKey = process.env.SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  let serviceAccount;
  if (typeof serviceAccountKey === 'string') {
    serviceAccount = JSON.parse(serviceAccountKey);
  } else {
    serviceAccount = serviceAccountKey;
  }

  // Handle private key formatting
  if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
    let privateKey = serviceAccount.private_key;
    if (privateKey.includes('\\n') && !privateKey.includes('\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    serviceAccount.private_key = privateKey;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function deleteCollection(db: admin.firestore.Firestore, collectionPath: string) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`  ✓ Collection '${collectionPath}' is already empty`);
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  console.log(`  ✓ Deleted ${snapshot.size} documents from '${collectionPath}'`);
}

async function deleteAllUsers(adminAuth: admin.auth.Auth) {
  console.log('\n🗑️  Deleting all users...');
  
  const users = await adminAuth.listUsers();
  let deletedCount = 0;
  
  for (const user of users.users) {
    // Check if this user should be kept
    const shouldKeep = PRODUCTION_USERS.some(
      prodUser => prodUser.email.toLowerCase() === user.email?.toLowerCase()
    );

    if (!shouldKeep) {
      try {
        await adminAuth.deleteUser(user.uid);
        deletedCount++;
        console.log(`  ✓ Deleted user: ${user.email}`);
      } catch (error: any) {
        console.error(`  ✗ Failed to delete user ${user.email}: ${error.message}`);
      }
    } else {
      console.log(`  ⊙ Keeping user: ${user.email}`);
    }
  }

  console.log(`\n✓ Deleted ${deletedCount} users`);
}

async function updateOrCreateUser(
  adminAuth: admin.auth.Auth,
  db: admin.firestore.Firestore,
  userData: typeof PRODUCTION_USERS[0]
) {
  try {
    let userRecord;
    
    // Try to get existing user
    try {
      userRecord = await adminAuth.getUserByEmail(userData.email);
      console.log(`  ⊙ User exists: ${userData.email}`);
      
      // Update existing user
      await adminAuth.updateUser(userRecord.uid, {
        email: userData.email,
        displayName: userData.name,
        password: userData.password,
        disabled: false,
      });
      console.log(`  ✓ Updated user: ${userData.email}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        userRecord = await adminAuth.createUser({
          email: userData.email,
          password: userData.password,
          displayName: userData.name,
          disabled: false,
        });
        console.log(`  ✓ Created user: ${userData.email}`);
      } else {
        throw error;
      }
    }

    // Update Firestore document
    const userDocRef = db.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      name: userData.name,
      email: userData.email,
      role: userData.role,
      baseSalary: userData.baseSalary,
      annualLeaveEntitlement: userData.annualLeaveEntitlement,
      disabled: false,
    }, { merge: true });

    console.log(`  ✓ Updated Firestore document for: ${userData.email}`);
  } catch (error: any) {
    console.error(`  ✗ Error processing user ${userData.email}: ${error.message}`);
    throw error;
  }
}

async function recreateDefaultRoles(db: admin.firestore.Firestore) {
  console.log('\n📋 Recreating default roles...');
  
  const defaultRoles = [
    {
      name: 'admin',
      permissions: [
        'dashboard:read',
        'users:create',
        'users:read',
        'users:update',
        'users:delete',
        'requests:read_all',
        'requests:update',
        'requests:delete',
        'certificates:create',
        'certificates:read',
        'certificates:update',
        'certificates:delete',
        'bonuses:manage',
        'infractions:manage',
        'payroll:read',
        'expenses:create',
        'expenses:read',
        'expenses:update',
        'expenses:delete',
        'leave_management:manage',
        'designs:create',
        'designs:read',
        'designs:update',
        'designs:delete',
        'projects:manage',
        'teams:manage',
      ],
    },
    {
      name: 'qa_tester',
      permissions: [
        'dashboard:read',
        'requests:read',
        'requests:update',
        'certificates:create',
        'certificates:read',
        'leave_management:read',
      ],
    },
    {
      name: 'requester',
      permissions: [
        'dashboard:read',
        'requests:create',
        'requests:read',
        'certificates:read',
        'leave_management:create',
        'leave_management:read',
      ],
    },
  ];

  const rolesRef = db.collection('roles');
  
  for (const role of defaultRoles) {
    // Find existing role or create new
    const snapshot = await rolesRef.where('name', '==', role.name).limit(1).get();
    
    if (!snapshot.empty) {
      // Update existing role
      await snapshot.docs[0].ref.update({
        permissions: role.permissions,
      });
      console.log(`  ✓ Updated role: ${role.name}`);
    } else {
      // Create new role
      await rolesRef.add({
        name: role.name,
        permissions: role.permissions,
      });
      console.log(`  ✓ Created role: ${role.name}`);
    }
  }
}

async function main() {
  console.log('🚀 Starting Production Reset...\n');
  console.log('⚠️  WARNING: This will delete ALL data except production users!\n');

  try {
    await initializeFirebase();
    const adminAuth = getAuth();
    const db = getFirestore();

    // Step 1: Delete all data from collections
    console.log('📦 Clearing all collections...');
    for (const collection of COLLECTIONS_TO_CLEAR) {
      await deleteCollection(db, collection);
    }

    // Step 2: Delete all users except production users
    await deleteAllUsers(adminAuth);

    // Step 3: Create/Update production users
    console.log('\n👥 Setting up production users...');
    for (const userData of PRODUCTION_USERS) {
      await updateOrCreateUser(adminAuth, db, userData);
    }

    // Step 4: Recreate default roles
    await recreateDefaultRoles(db);

    console.log('\n✅ Production reset completed successfully!');
    console.log('\nProduction users:');
    PRODUCTION_USERS.forEach(user => {
      console.log(`  - ${user.name} (${user.role}): ${user.email}`);
    });

  } catch (error: any) {
    console.error('\n❌ Error during reset:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { main };

