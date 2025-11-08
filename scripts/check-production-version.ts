/**
 * Script to check production code version and compare with local code
 * Run with: npx tsx scripts/check-production-version.ts
 */

import { initializeAdminApp } from '../src/lib/firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

async function checkProductionVersion() {
  try {
    console.log('🔍 Checking production code version...\n');
    
    // Check local auth-provider for key features
    const authProviderPath = join(process.cwd(), 'src/providers/auth-provider.tsx');
    const authProviderCode = readFileSync(authProviderPath, 'utf-8');
    
    console.log('📋 Local Code Features Check:\n');
    
    const features = {
      'Waits for user auth before loading roles': authProviderCode.includes('if (!user && loading)'),
      'Has 10-second timeout for roles loading': authProviderCode.includes('10000') && authProviderCode.includes('timeout'),
      'Uses requestAnimationFrame for state updates': authProviderCode.includes('requestAnimationFrame'),
      'Has permissionsReady check': authProviderCode.includes('permissionsReady'),
      'Waits for user before loading roles': authProviderCode.includes('if (!user)') && authProviderCode.includes('setRolesLoading(false)'),
    };
    
    Object.entries(features).forEach(([feature, present]) => {
      console.log(`${present ? '✅' : '❌'} ${feature}`);
    });
    
    console.log('\n📝 Production Code Analysis:');
    console.log('   To verify production code, check:');
    console.log('   1. Browser console logs for role loading messages');
    console.log('   2. Network tab for Firestore requests to /roles collection');
    console.log('   3. Check if roles collection query succeeds');
    
    console.log('\n💡 If production shows "Available custom roles in Firestore: none":');
    console.log('   - Check browser console for errors');
    console.log('   - Verify roles collection has data (run check-production-roles.ts)');
    console.log('   - Check if production code has latest fixes');
    
  } catch (error: any) {
    console.error('❌ Error checking version:', error.message);
    process.exit(1);
  }
}

checkProductionVersion();

