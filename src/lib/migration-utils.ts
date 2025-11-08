/**
 * Migration utilities for converting roles to permissions
 */

import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import type { User, Role } from '@/lib/types';
import { PERMISSIONS_BY_ROLE, ROLES, ADMIN_PERMISSION_IDENTIFIERS } from '@/lib/roles';

/**
 * Convert a user's roles to permissions array
 * This function derives permissions from roles (both custom and hardcoded)
 */
export async function convertRolesToPermissions(userRoles: string[]): Promise<string[]> {
  if (!userRoles || userRoles.length === 0) {
    return ['profile:read']; // Default permission for all users
  }

  const app = await initializeAdminApp();
  const db = getFirestore(app);
  
  // Fetch all custom roles from Firestore
  const rolesSnapshot = await db.collection('roles').get();
  const customRolesMap = new Map<string, Role>();
  rolesSnapshot.forEach(doc => {
    const role = { id: doc.id, ...doc.data() } as Role;
    customRolesMap.set(role.name.toLowerCase(), role);
  });

  const allPermissions = new Set<string>();
  
  // All users get profile:read by default
  allPermissions.add('profile:read');

  // Convert each role to permissions
  for (const roleName of userRoles) {
    if (!roleName || typeof roleName !== 'string') continue;
    
    const normalizedRole = roleName.toLowerCase();
    
    // 1. Check custom roles from Firestore first
    const customRole = customRolesMap.get(normalizedRole);
    if (customRole && customRole.permissions && Array.isArray(customRole.permissions)) {
      customRole.permissions.forEach(perm => {
        if (perm && typeof perm === 'string' && perm.trim()) {
          allPermissions.add(perm.trim());
        }
      });
      continue; // Found custom role, skip hardcoded check
    }
    
    // 2. Check hardcoded roles
    const roleKey = Object.keys(ROLES).find(key => 
      ROLES[key as keyof typeof ROLES].toLowerCase() === normalizedRole
    ) as keyof typeof ROLES | undefined;
    
    if (roleKey) {
      const roleValue = ROLES[roleKey];
      const hardcodedPermissions = PERMISSIONS_BY_ROLE[roleValue as keyof typeof PERMISSIONS_BY_ROLE];
      if (hardcodedPermissions) {
        hardcodedPermissions.forEach(perm => allPermissions.add(perm));
        continue;
      }
    }
    
    // 3. Try direct match in PERMISSIONS_BY_ROLE
    if (PERMISSIONS_BY_ROLE[normalizedRole as keyof typeof PERMISSIONS_BY_ROLE]) {
      PERMISSIONS_BY_ROLE[normalizedRole as keyof typeof PERMISSIONS_BY_ROLE].forEach(perm => allPermissions.add(perm));
    }
  }

  return Array.from(allPermissions).sort();
}

/**
 * Migrate all existing users from roles to permissions
 * This function:
 * 1. Reads each user's roles
 * 2. Converts roles to permissions
 * 3. Updates the user document with permissions array
 * 4. Preserves roles for backward compatibility
 */
export async function migrateUsersToPermissions(): Promise<{
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ userId: string; error: string }>;
}> {
  const app = await initializeAdminApp();
  const db = getFirestore(app);
  
  console.log('Starting migration: Converting user roles to permissions...');
  
  const usersSnapshot = await db.collection('users').get();
  const total = usersSnapshot.size;
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: Array<{ userId: string; error: string }> = [];

  for (const userDoc of usersSnapshot.docs) {
    try {
      const userData = userDoc.data();
      
      // Skip if user already has permissions array (already migrated)
      if (userData.permissions && Array.isArray(userData.permissions) && userData.permissions.length > 0) {
        console.log(`User ${userDoc.id} (${userData.email}) already has permissions, skipping...`);
        skipped++;
        continue;
      }

      // Get user roles
      const userRoles = userData.roles && userData.roles.length > 0 
        ? userData.roles 
        : (userData.role ? [userData.role] : []);

      if (userRoles.length === 0) {
        // User has no roles, give them default permissions
        const defaultPermissions = ['profile:read'];
        await userDoc.ref.update({
          permissions: defaultPermissions,
          isAdmin: false,
          isProjectManager: false,
        });
        console.log(`User ${userDoc.id} (${userData.email}) had no roles, assigned default permissions`);
        migrated++;
        continue;
      }

      // Convert roles to permissions
      const permissions = await convertRolesToPermissions(userRoles);
      
      // Calculate isAdmin and isProjectManager from permissions
      const isAdmin = permissions.some(perm => ADMIN_PERMISSION_IDENTIFIERS.includes(perm as any));
      const isProjectManager = permissions.some(perm => 
        perm === 'projects:create' || perm === 'projects:delete' || perm === 'projects:update'
      );

      // Update user document with permissions
      // Keep roles for backward compatibility during transition
      await userDoc.ref.update({
        permissions: permissions,
        isAdmin: isAdmin,
        isProjectManager: isProjectManager,
        // Keep existing roles - don't delete them yet for backward compatibility
      });

      console.log(`✓ Migrated user ${userDoc.id} (${userData.email}): ${userRoles.join(', ')} -> ${permissions.length} permissions`);
      migrated++;
    } catch (error: any) {
      errors++;
      const errorMsg = error.message || 'Unknown error';
      errorDetails.push({ userId: userDoc.id, error: errorMsg });
      console.error(`✗ Error migrating user ${userDoc.id}:`, errorMsg);
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`Total users: ${total}`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (already migrated): ${skipped}`);
  console.log(`Errors: ${errors}`);
  if (errorDetails.length > 0) {
    console.log(`\nError details:`);
    errorDetails.forEach(({ userId, error }) => {
      console.log(`  - ${userId}: ${error}`);
    });
  }

  return {
    total,
    migrated,
    skipped,
    errors,
    errorDetails,
  };
}

