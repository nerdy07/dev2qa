/**
 * Migration script to convert existing users from roles to permissions
 * Run this with: npx tsx scripts/migrate-users.ts
 */

import { migrateUsersToPermissions } from '../src/lib/migration-utils';

async function main() {
  console.log('🚀 Starting user migration from roles to permissions...\n');
  
  try {
    const result = await migrateUsersToPermissions();
    
    console.log('\n✅ Migration completed successfully!');
    console.log(`\nSummary:`);
    console.log(`  Total users: ${result.total}`);
    console.log(`  Migrated: ${result.migrated}`);
    console.log(`  Skipped (already migrated): ${result.skipped}`);
    console.log(`  Errors: ${result.errors}`);
    
    if (result.errorDetails.length > 0) {
      console.log(`\n⚠️  Error details:`);
      result.errorDetails.forEach(({ userId, error }) => {
        console.log(`  - User ${userId}: ${error}`);
      });
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

