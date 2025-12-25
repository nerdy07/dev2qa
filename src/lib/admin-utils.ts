/**
 * Utility functions for admin-related operations
 */

import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import type { Role } from '@/lib/types';
import { hasAdminPermissions, ADMIN_PERMISSION_IDENTIFIERS, ROLES, PERMISSIONS_BY_ROLE } from '@/lib/roles';

/**
 * Calculate if a user should have admin access based on their roles
 * @param userRoles - Array of role names assigned to the user
 * @param allRoles - Map of all available roles from Firestore (name -> Role)
 * @returns true if user has any role with admin permissions
 */
export async function calculateIsAdmin(userRoles: string[]): Promise<boolean> {
  if (!userRoles || userRoles.length === 0) return false;
  
  try {
    const app = await initializeAdminApp();
    const db = getFirestore(app);
    
    // Fetch roles from Firestore to check permissions
    const rolesSnapshot = await db.collection('roles').get();
    const rolesMap = new Map<string, Role>();
    rolesSnapshot.forEach(doc => {
      const role = { id: doc.id, ...doc.data() } as Role;
      rolesMap.set(role.name, role);
    });
    
    // Check if any of the user's roles have admin permissions
    for (const roleName of userRoles) {
      const role = rolesMap.get(roleName);
      if (role && role.permissions && hasAdminPermissions(role.permissions)) {
        return true;
      }
    }
    
    // Also check hardcoded admin roles if not found in custom roles
    const hardcodedAdminRoles = ['admin', 'super admin', 'superadmin', 'hr_admin'];
    if (userRoles.some(r => hardcodedAdminRoles.some(ar => r.toLowerCase().includes(ar.toLowerCase())))) {
      return true;
    }
  } catch (error) {
    console.error('Error calculating admin status:', error);
    return false;
  }
  
  return false;
}

/**
 * Calculate if a user should have project manager access based on their roles
 * A user is a project manager if they have any role with:
 * - projects:create permission
 * - projects:delete permission
 * - projects:update permission
 * - Or the hardcoded 'project_manager' role
 */
export async function calculateIsProjectManager(userRoles: string[]): Promise<boolean> {
  if (!userRoles || userRoles.length === 0) return false;
  
  try {
    const app = await initializeAdminApp();
    const db = getFirestore(app);
    
    // Fetch roles from Firestore to check permissions
    const rolesSnapshot = await db.collection('roles').get();
    const rolesMap = new Map<string, Role>();
    rolesSnapshot.forEach(doc => {
      const role = { id: doc.id, ...doc.data() } as Role;
      rolesMap.set(role.name.toLowerCase(), role);
    });
    
    // Project manager permission identifiers
    const projectManagerPermissions = [
      'projects:create',
      'projects:delete',
      'projects:update',
    ];
    
    // Check if any of the user's roles have project manager permissions
    for (const roleName of userRoles) {
      const normalizedRole = roleName.toLowerCase();
      
      // Check custom roles first
      const customRole = rolesMap.get(normalizedRole);
      if (customRole && customRole.permissions) {
        const hasProjectManagerPerm = customRole.permissions.some(perm => 
          projectManagerPermissions.includes(perm)
        );
        if (hasProjectManagerPerm) {
          return true;
        }
      }
      
      // Check hardcoded project_manager role
      if (normalizedRole === 'project_manager' || 
          normalizedRole === 'project manager' ||
          normalizedRole === 'projectmanager') {
        return true;
      }
      
      // Check hardcoded roles from ROLES enum
      const roleKey = Object.keys(ROLES).find(key => 
        ROLES[key as keyof typeof ROLES].toLowerCase() === normalizedRole
      ) as keyof typeof ROLES | undefined;
      
      if (roleKey && roleKey === 'PROJECT_MANAGER') {
        return true;
      }
      
      // Check hardcoded permissions for this role
      if (PERMISSIONS_BY_ROLE[normalizedRole as keyof typeof PERMISSIONS_BY_ROLE]) {
        const hardcodedPermissions = PERMISSIONS_BY_ROLE[normalizedRole as keyof typeof PERMISSIONS_BY_ROLE];
        const hasProjectManagerPerm = hardcodedPermissions.some(perm => 
          projectManagerPermissions.includes(perm)
        );
        if (hasProjectManagerPerm) {
          return true;
        }
      }
    }
  } catch (error) {
    console.error('Error calculating project manager status:', error);
    return false;
  }
  
  return false;
}

/**
 * Update isAdmin field for all users in the database
 * This is a migration utility to update existing users
 * Run this once after deploying the new isAdmin field logic
 */
export async function updateAllUsersAdminStatus(): Promise<{ updated: number; errors: number }> {
  try {
    const app = await initializeAdminApp();
    const db = getFirestore(app);
    
    // Fetch all roles
    const rolesSnapshot = await db.collection('roles').get();
    const rolesMap = new Map<string, Role>();
    rolesSnapshot.forEach(doc => {
      const role = { id: doc.id, ...doc.data() } as Role;
      rolesMap.set(role.name, role);
    });
    
    // Fetch all users
    const usersSnapshot = await db.collection('users').get();
    let updated = 0;
    let errors = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userRoles = userData.roles && userData.roles.length > 0 
          ? userData.roles 
          : (userData.role ? [userData.role] : []);
        
        const isAdmin = await calculateIsAdmin(userRoles);
        
        // Update user document
        await userDoc.ref.update({ isAdmin });
        updated++;
      } catch (error) {
        console.error(`Error updating user ${userDoc.id}:`, error);
        errors++;
      }
    }
    
    return { updated, errors };
  } catch (error) {
    console.error('Error updating users admin status:', error);
    throw error;
  }
}

