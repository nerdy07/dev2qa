# Migration Guide: Roles to Permissions

This guide explains how to migrate existing users from the role-based system to the new permission-based system.

## What Changed?

The system has been refactored to use **permissions directly** instead of roles:

- **Before**: Users had `roles: ['qa_tester', 'developer']` → System derived permissions from roles
- **After**: Users have `permissions: ['requests:approve', 'projects:read', ...]` → Permissions are stored directly

## Migration Process

### Step 1: Deploy the Code Changes

Deploy all the updated code to your environment. The system is backward compatible, so existing users with roles will continue to work during the migration period.

### Step 2: Run the Migration

The migration utility will:
1. Read each user's existing roles
2. Convert those roles to permissions (from both custom roles in Firestore and hardcoded roles)
3. Update the user document with a `permissions` array
4. Calculate and update `isAdmin` and `isProjectManager` fields
5. Preserve the original `roles` field for backward compatibility

#### Option A: Using the API Route (Recommended)

1. Get your Firebase Auth token:
   ```bash
   # In your browser console after logging in:
   # Go to your app and open browser console
   # Run: firebase.auth().currentUser.getIdToken().then(console.log)
   ```

2. Call the migration API:
   ```bash
   curl -X POST https://your-app-url/api/migrate-permissions \
     -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
     -H "Content-Type: application/json"
   ```

#### Option B: Using a Script (Alternative)

Create a script file `migrate-users.ts`:

```typescript
import { migrateUsersToPermissions } from './src/lib/migration-utils';

async function runMigration() {
  try {
    const result = await migrateUsersToPermissions();
    console.log('Migration completed:', result);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
```

Then run it:
```bash
npx tsx migrate-users.ts
```

### Step 3: Verify Migration

After migration, verify that:
1. All users have a `permissions` array
2. Users with admin roles have `isAdmin: true`
3. Users with project manager roles have `isProjectManager: true`
4. Permission checks work correctly

Check in Firestore console:
```javascript
// In Firestore console, check a user document:
// Should have: permissions: ['profile:read', 'requests:approve', ...]
// Should have: isAdmin: true/false
// Should have: isProjectManager: true/false
```

## Backward Compatibility

The system maintains backward compatibility:

- **Existing users with roles**: Will continue to work. The auth provider will derive permissions from roles if no `permissions` array exists.
- **New users**: Must have permissions assigned directly (no role fallback).
- **During migration**: Both systems work simultaneously.

## Post-Migration Cleanup (Optional)

After confirming all users are migrated and working correctly, you can:

1. **Remove role fields** (optional, not recommended initially):
   - The `role` and `roles` fields can be kept for historical purposes
   - Or removed after verifying everything works

2. **Update any hardcoded role checks**:
   - Search codebase for `hasRole()` calls
   - Replace with permission checks where appropriate

## Troubleshooting

### Migration fails with "Permission denied"
- Ensure you're authenticated as an admin
- Check Firebase service account permissions

### Some users don't have permissions after migration
- Check the migration logs for errors
- Manually run `convertRolesToPermissions()` for affected users
- Verify roles exist in Firestore or hardcoded roles

### Users can't access features they should
- Check if permissions were correctly converted
- Verify permission names match exactly (case-sensitive)
- Check Firestore rules allow the operation

## Support

If you encounter issues during migration:
1. Check the migration logs for specific user errors
2. Verify roles exist in Firestore
3. Test with a single user first before running full migration
4. The system will continue working with roles during migration

