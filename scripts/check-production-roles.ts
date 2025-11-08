/**
 * Script to check the roles collection in production Firestore
 * Run with: npx tsx scripts/check-production-roles.ts
 */

import { initializeAdminApp } from '../src/lib/firebase-admin';

async function checkProductionRoles() {
  try {
    console.log('🔍 Checking production Firestore roles collection...\n');
    
    const app = await initializeAdminApp();
    const db = app.firestore();
    
    // Query the roles collection
    const rolesSnapshot = await db.collection('roles').get();
    
    console.log(`📊 Found ${rolesSnapshot.size} role(s) in production:\n`);
    
    if (rolesSnapshot.empty) {
      console.log('⚠️  WARNING: The roles collection is EMPTY in production!');
      console.log('   This explains why "Available custom roles in Firestore: none" is shown.\n');
      console.log('   You need to create role documents in Firestore for the system to work properly.');
      return;
    }
    
    // Display each role
    rolesSnapshot.forEach((doc) => {
      const role = doc.data();
      console.log(`📋 Role: ${role.name || doc.id}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Description: ${role.description || 'N/A'}`);
      console.log(`   Permissions: ${role.permissions?.length || 0} permission(s)`);
      if (role.permissions && role.permissions.length > 0) {
        console.log(`   Sample permissions: ${role.permissions.slice(0, 3).join(', ')}${role.permissions.length > 3 ? '...' : ''}`);
      }
      console.log('');
    });
    
    // Summary
    console.log(`✅ Roles collection is accessible and contains ${rolesSnapshot.size} role(s).`);
    console.log('\n💡 If production code still shows "none", the issue is likely:');
    console.log('   1. Production code hasn\'t been updated with latest fixes');
    console.log('   2. There\'s a timing issue with role loading');
    console.log('   3. The onSnapshot listener is failing silently');
    
  } catch (error: any) {
    console.error('❌ Error checking roles collection:', error.message);
    if (error.message.includes('permission')) {
      console.error('\n💡 This might be a permissions issue. Check:');
      console.error('   1. SERVICE_ACCOUNT_KEY is set correctly');
      console.error('   2. Service account has Firestore read permissions');
    }
    process.exit(1);
  }
}

checkProductionRoles();

