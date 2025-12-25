# Production Reset Script

This script will reset your Firebase database for production deployment.

## ⚠️ WARNING

**This is a DESTRUCTIVE operation** that will:
- Delete ALL users except the 3 production users specified
- Delete ALL data from collections (requests, certificates, transactions, etc.)
- Reset the database to a clean state

## Production Users

The script will keep and configure these 3 users:

1. **Admin**
   - Email: `Sshuaibu@echobitstech.com`
   - Password: `Passw0rd!`

2. **QA Tester**
   - Email: `Aneesa.shuaibu@echobitstech.com`
   - Password: `12345678`

3. **Requester**
   - Email: `Shuaibusalim@gmail.com`
   - Password: `123456789`

## Prerequisites

1. Make sure `SERVICE_ACCOUNT_KEY` environment variable is set
2. Ensure you have Node.js installed
3. Firebase Admin SDK should be configured

## Setting SERVICE_ACCOUNT_KEY

You need to set the `SERVICE_ACCOUNT_KEY` environment variable with your Firebase service account JSON.

### Option 1: Using .env file (Recommended)

Create a `.env` file in the project root:

```
SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}
```

**Note**: The entire JSON object should be on one line, or properly escaped.

### Option 2: Set as environment variable

**Windows PowerShell:**
```powershell
$env:SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
node scripts/reset-for-production.js
```

**Windows CMD:**
```cmd
set SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}
node scripts/reset-for-production.js
```

**Linux/Mac:**
```bash
export SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
node scripts/reset-for-production.js
```

## Usage

### Using Node.js

```bash
node scripts/reset-for-production.js
```

The script will automatically load `.env` file if it exists.

### Option 2: Using TypeScript (if tsx is installed)

```bash
npx tsx scripts/reset-for-production.ts
```

## What Gets Deleted

The following collections will be completely cleared:
- `requests`
- `certificates`
- `transactions`
- `bonuses`
- `infractions`
- `comments`
- `designs`
- `projects`
- `teams`
- `roles` (will be recreated with defaults)

## What Gets Created/Updated

1. **Users**: The 3 production users will be created or updated with new passwords
2. **Roles**: Default roles (admin, qa_tester, requester) will be recreated

## Safety

- The script will ask you to confirm before proceeding (in a future version)
- It preserves the 3 production users
- It recreates essential roles and permissions

## Example Output

```
🚀 Starting Production Reset...

⚠️  WARNING: This will delete ALL data except production users!

📦 Clearing all collections...
  ✓ Deleted 150 documents from 'requests'
  ✓ Deleted 50 documents from 'certificates'
  ...

🗑️  Deleting all users...
  ✓ Deleted user: test@example.com
  ⊙ Keeping user: Sshuaibu@echobitstech.com
  ...

👥 Setting up production users...
  ✓ Created user: Sshuaibu@echobitstech.com
  ✓ Updated Firestore document for: Sshuaibu@echobitstech.com
  ...

📋 Recreating default roles...
  ✓ Updated role: admin
  ✓ Updated role: qa_tester
  ✓ Updated role: requester

✅ Production reset completed successfully!

Production users:
  - Admin (admin): Sshuaibu@echobitstech.com
  - QA (qa_tester): Aneesa.shuaibu@echobitstech.com
  - Requester (requester): Shuaibusalim@gmail.com

🎉 All done!
```

