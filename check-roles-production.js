// Script to check roles collection in production Firestore
const admin = require('firebase-admin');

// Initialize Firebase Admin
// Note: This requires SERVICE_ACCOUNT_KEY environment variable
async function checkRoles() {
  try {
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY || '{}');
    
    if (!serviceAccount.project_id) {
      console.error('SERVICE_ACCOUNT_KEY environment variable not set or invalid');
      process.exit(1);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    const db = admin.firestore();
    const rolesSnapshot = await db.collection('roles').get();

    console.log(`\n=== Roles Collection Check ===`);
    console.log(`Total roles found: ${rolesSnapshot.size}\n`);

    if (rolesSnapshot.empty) {
      console.log('⚠️  WARNING: Roles collection is EMPTY!');
      console.log('This explains why "Available custom roles in Firestore: none" appears in console.\n');
    } else {
      console.log('Roles in Firestore:');
      rolesSnapshot.forEach((doc) => {
        const role = doc.data();
        console.log(`\n  - ${doc.id}:`);
        console.log(`    Name: ${role.name || 'N/A'}`);
        console.log(`    Description: ${role.description || 'N/A'}`);
        console.log(`    Permissions: ${role.permissions?.length || 0} permission(s)`);
        if (role.permissions && role.permissions.length > 0) {
          console.log(`    Sample permissions: ${role.permissions.slice(0, 3).join(', ')}${role.permissions.length > 3 ? '...' : ''}`);
        }
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking roles:', error);
    process.exit(1);
  }
}

checkRoles();

