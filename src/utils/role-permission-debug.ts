/**
 * Debug utility for roles and permissions
 * Use this to diagnose role/permission mismatches
 */

import { ALL_PERMISSIONS } from '@/lib/roles';

/**
 * Get all valid permission strings from ALL_PERMISSIONS
 */
export function getAllValidPermissions(): string[] {
  const permissions: string[] = [];
  
  // Flatten ALL_PERMISSIONS object
  Object.values(ALL_PERMISSIONS).forEach(permissionGroup => {
    if (typeof permissionGroup === 'object' && permissionGroup !== null) {
      Object.values(permissionGroup).forEach(permission => {
        if (typeof permission === 'string') {
          permissions.push(permission);
        }
      });
    }
  });
  
  // Add profile:read (default permission)
  permissions.push('profile:read');
  
  return permissions.sort();
}

/**
 * Validate if a permission string is valid
 */
export function isValidPermission(permission: string): boolean {
  const validPermissions = getAllValidPermissions();
  return validPermissions.includes(permission);
}

/**
 * Find invalid permissions in an array
 */
export function findInvalidPermissions(permissions: string[]): string[] {
  const validPermissions = getAllValidPermissions();
  return permissions.filter(perm => !validPermissions.includes(perm));
}

/**
 * Normalize role name for consistent matching
 * - Converts to lowercase
 * - Removes extra spaces
 * - Handles common variations
 */
export function normalizeRoleName(roleName: string): string {
  return roleName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Get role name variations for matching
 */
export function getRoleNameVariations(roleName: string): string[] {
  const normalized = normalizeRoleName(roleName);
  const variations = new Set<string>();
  
  variations.add(normalized);
  variations.add(normalized.replace(/_/g, ''));
  variations.add(normalized.replace(/_/g, ' '));
  variations.add(normalized.replace(/s$/, '')); // singular
  if (!normalized.endsWith('s')) {
    variations.add(normalized + 's'); // plural
  }
  
  return Array.from(variations);
}

/**
 * Debug helper: Log role and permission information
 */
export function debugRolePermissions(userRoles: string[], customRoles: Map<string, any>, userPermissions: string[]) {
  console.group('🔍 Role & Permission Debug Info');
  
  console.log('User Roles:', userRoles);
  console.log('User Permissions:', userPermissions);
  console.log(`Total Permissions: ${userPermissions.length}`);
  
  console.group('Custom Roles from Firestore:');
  customRoles.forEach((role, key) => {
    console.log(`  "${role.name}" (key: "${key}"):`, {
      permissions: role.permissions,
      permissionCount: role.permissions?.length || 0,
      invalidPermissions: findInvalidPermissions(role.permissions || [])
    });
  });
  console.groupEnd();
  
  console.group('Permission Validation:');
  const invalidPermissions = findInvalidPermissions(userPermissions);
  if (invalidPermissions.length > 0) {
    console.warn('⚠ Invalid permissions found:', invalidPermissions);
  } else {
    console.log('✓ All permissions are valid');
  }
  console.groupEnd();
  
  console.groupEnd();
}

