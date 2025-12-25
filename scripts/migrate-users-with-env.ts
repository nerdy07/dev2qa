/**
 * Migration script to convert existing users from roles to permissions
 * This version loads environment variables from .env.local
 * Run this with: npx tsx scripts/migrate-users-with-env.ts
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';

// Try to load .env.local first, then .env
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });
dotenv.config(); // Also try .env as fallback

import { migrateUsersToPermissions } from '../src/lib/migration-utils';

async function main() {
  console.log('🚀 Starting user migration from roles to permissions...\n');
  
  // Check if SERVICE_ACCOUNT_KEY is available
  if (!process.env.SERVICE_ACCOUNT_KEY) {
    console.error('❌ ERROR: SERVICE_ACCOUNT_KEY environment variable is not set.');
    console.error('\nPlease set it in one of these ways:');
    console.error('1. Create a .env.local file with: SERVICE_ACCOUNT_KEY="your-json-key"');
    console.error('2. Set it as an environment variable before running:');
    console.error('   $env:SERVICE_ACCOUNT_KEY="your-json-key"; npx tsx scripts/migrate-users-with-env.ts');
    console.error('\nThe SERVICE_ACCOUNT_KEY should be a JSON string containing your Firebase service account credentials.');
    process.exit(1);
  }
  
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
    
    console.log('\n✨ All users have been migrated to the permission-based system!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

