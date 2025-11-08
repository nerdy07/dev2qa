# Dev2QA Testing Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Authentication & Session Management](#authentication--session-management)
4. [Testing Scenarios by Role](#testing-scenarios-by-role)
5. [API Endpoints](#api-endpoints)
6. [Setup Instructions](#setup-instructions)
7. [Common Issues & Troubleshooting](#common-issues--troubleshooting)

---

## Project Overview

**Dev2QA** is a comprehensive Quality Assurance and Project Management platform built with Next.js, Firebase, and TypeScript. The application manages certificate requests, design approvals, team management, and HR operations.

### Key Features
- **Certificate Request System**: Submit, review, and approve QA certificates
- **Design Approval Workflow**: Manage design submissions and approvals
- **Team & Project Management**: Organize teams and track project progress
- **HR Management**: Handle leave requests, bonuses, infractions, and payroll
- **Role-based Access Control**: Granular permissions for different user types
- **Real-time Notifications**: Email notifications for various actions

### Technology Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Email Service**: Brevo (formerly Sendinblue)
- **UI Components**: shadcn/ui
- **State Management**: React Context API

---

## User Roles & Permissions

### Available Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Admin** | Full system access | All permissions, user management, system configuration |
| **QA Tester** | Quality assurance specialist | Review/approve requests, rate submissions, manage certificates |
| **Requester** | Submit certificate requests | Create requests, view own records, leave requests |
| **Developer** | Software developer | Create requests, view projects, submit designs |
| **Manager** | Team/project manager | View teams, projects, all requests, team oversight |
| **HR Admin** | Human resources administrator | User management, payroll, leave management, bonuses |
| **Project Manager** | Project oversight | Create/manage projects, assign tasks, view insights |
| **Senior QA** | Senior quality assurance | Approve/reject requests, manage certificates, approve designs |

### Permission Categories

#### Admin Section
- `admin:read` - Access admin dashboard
- `users:create/read/update/delete` - User management
- `roles:manage` - Role and permission management
- `teams:create/read/update/delete` - Team management
- `projects:create/read/update/delete` - Project management
- `payroll:read` - Payroll access
- `leave:manage` - Leave management
- `infractions:manage` - Infraction management
- `bonuses:manage` - Bonus management

#### QA & Request Section
- `requests:create/read_all/read_own/approve/reject` - Request management
- `certificates:read/revoke` - Certificate management
- `designs:create/read_own/read_all/approve` - Design management
- `leaderboards:read` - Performance tracking
- `records:read_own` - Personal records
- `leave:request` - Leave requests

---

## Authentication & Session Management

### Authentication Flow
1. **Login**: Users authenticate via Firebase Auth with email/password
2. **Session Persistence**: Firebase automatically handles token refresh
3. **Role Validation**: User role is fetched from Firestore on login
4. **Permission Checking**: Real-time permission validation for UI elements

### Session Features
- **Automatic Token Refresh**: Firebase handles token renewal automatically
- **Persistent Sessions**: Users stay logged in across browser sessions
- **Role-based Redirects**: Automatic redirection based on user role
- **Permission Guards**: UI elements hidden based on user permissions

### Security Features
- **Firebase Security Rules**: Database access controlled by Firestore rules
- **Role-based Access**: API endpoints protected by role validation
- **User Disabling**: Admins can disable user accounts
- **Permission Validation**: Frontend and backend permission checks

---

## Testing Scenarios by Role

### 1. Admin Testing

#### Setup
- Create admin user with full permissions
- Access admin dashboard

#### Test Cases

**User Management**
1. **Create User**
   - Navigate to Admin → Users
   - Click "Add User"
   - Fill form with valid data
   - Select appropriate role
   - Verify user creation success
   - Check email notification sent

2. **Edit User**
   - Find user in users list
   - Click edit button
   - Modify user details
   - Save changes
   - Verify updates reflected

3. **Disable User**
   - Edit user account
   - Toggle disabled status
   - Verify user cannot login
   - Check user appears as disabled in list

**Team Management**
1. **Create Team**
   - Navigate to Admin → Teams
   - Create new team with name and description
   - Assign team lead
   - Verify team appears in list

2. **Project Management**
   - Create new project
   - Add project details and milestones
   - Assign team members
   - Verify project tracking

**HR Functions**
1. **Leave Management**
   - View pending leave requests
   - Approve/reject requests
   - Check leave balances

2. **Bonus Management**
   - Add bonus for user
   - Specify amount and reason
   - Verify bonus appears in user record

3. **Infraction Management**
   - Record infraction
   - Set deduction percentage
   - Verify infraction appears in user record

### 2. QA Tester Testing

#### Setup
- Create QA tester user
- Ensure proper permissions assigned

#### Test Cases

**Request Review**
1. **View Pending Requests**
   - Navigate to dashboard
   - View list of pending requests
   - Click on request to view details

2. **Approve Request**
   - Open request details
   - Review submission
   - Click "Approve" button
   - Verify certificate generated
   - Check email notification sent

3. **Reject Request**
   - Open request details
   - Click "Reject" button
   - Provide rejection reason
   - Confirm rejection
   - Verify request status updated
   - Check email notification sent

**Rating & Feedback**
1. **Rate Submission**
   - After approving request
   - Rate submission quality (1-5 stars)
   - Submit rating
   - Verify rating saved

2. **View Certificates**
   - Navigate to certificates section
   - View approved certificates
   - Check certificate details

### 3. Requester Testing

#### Setup
- Create requester user
- Ensure basic permissions

#### Test Cases

**Submit Request**
1. **Create New Request**
   - Navigate to "New Request"
   - Fill in task title (min 5 characters)
   - Select team and project
   - Add description (min 10 characters)
   - Optionally add task link
   - Submit request
   - Verify request appears in "My Records"

2. **View Request Status**
   - Navigate to "My Records"
   - View submitted requests
   - Check status (pending/approved/rejected)
   - View request details

3. **Add Comments**
   - Open request details
   - Add comment
   - Submit comment
   - Verify comment appears

4. **Rate QA Process**
   - For approved requests
   - Rate QA process (1-5 stars)
   - Add feedback text
   - Submit rating

**Design Submissions**
1. **Submit Design**
   - Navigate to "New Design"
   - Fill design title
   - Add Figma URL
   - Add description
   - Submit design
   - Verify design appears in submissions

### 4. Developer Testing

#### Setup
- Create developer user
- Assign to team and project

#### Test Cases

**Project Access**
1. **View Assigned Projects**
   - Navigate to dashboard
   - View assigned projects
   - Check project details and milestones

2. **Submit Certificate Request**
   - Create request for completed task
   - Select appropriate project
   - Add task details
   - Submit for QA review

**Design Management**
1. **Submit Design**
   - Create design submission
   - Add Figma link
   - Submit for approval
   - Track approval status

### 5. Manager Testing

#### Setup
- Create manager user
- Assign team management permissions

#### Test Cases

**Team Oversight**
1. **View Team Performance**
   - Access team dashboard
   - View team member activities
   - Check project progress

2. **Project Management**
   - View assigned projects
   - Track project milestones
   - Monitor team workload

### 6. HR Admin Testing

#### Setup
- Create HR admin user
- Assign HR permissions

#### Test Cases

**Leave Management**
1. **Review Leave Requests**
   - Navigate to leave management
   - View pending requests
   - Approve/reject with reason
   - Check leave balances

**Payroll Management**
1. **View Payroll Data**
   - Access payroll section
   - View employee salary information
   - Check bonus and deduction calculations

**User Management**
1. **Update User Information**
   - Edit user profiles
   - Update salary information
   - Modify leave entitlements

---

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/reset-password` - Password reset

### User Management
- `GET /api/users` - List all users (Admin only)
- `POST /api/users` - Create new user (Admin only)
- `PATCH /api/users/[uid]` - Update user (Admin/HR only)
- `DELETE /api/users/[uid]` - Delete user (Admin only)

### Request Management
- `GET /api/requests` - List requests
- `POST /api/requests` - Create request
- `PATCH /api/requests/[id]` - Update request status
- `POST /api/requests/[id]/comments` - Add comment

### Email Notifications
- `POST /api/email-preview` - Preview email templates
- `POST /api/send-test-email` - Send test email

---

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project
- Brevo account for email services

### Environment Variables
Create `.env.local` file with:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side)
SERVICE_ACCOUNT_KEY=your_service_account_json

# Email Service (Brevo)
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_sender_email
BREVO_SENDER_NAME=Dev2QA Team
```

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd dev2qa
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create Firebase project
   - Enable Authentication, Firestore, Storage
   - Configure security rules
   - Generate service account key

4. **Setup Brevo**
   - Create Brevo account
   - Generate API key
   - Configure sender email

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Initial Setup**
   - Create first admin user
   - Configure roles and permissions
   - Set up teams and projects

### Database Setup

1. **Firestore Collections**
   - `users` - User profiles and roles
   - `requests` - Certificate requests
   - `certificates` - Approved certificates
   - `teams` - Team information
   - `projects` - Project data
   - `comments` - Request comments
   - `designs` - Design submissions
   - `leaveRequests` - Leave management
   - `infractions` - User infractions
   - `bonuses` - User bonuses

2. **Security Rules**
   - Configure Firestore rules for role-based access
   - Set up storage rules for file uploads

---

## Common Issues & Troubleshooting

### Authentication Issues

**Problem**: User cannot login
- **Check**: Firebase Auth configuration
- **Verify**: User account is not disabled
- **Solution**: Check Firebase console for auth errors

**Problem**: Session expires unexpectedly
- **Check**: Firebase token refresh settings
- **Verify**: Network connectivity
- **Solution**: Clear browser cache and cookies

### Permission Issues

**Problem**: User cannot access certain features
- **Check**: User role assignment
- **Verify**: Permission configuration
- **Solution**: Update user role in admin panel

### Email Issues

**Problem**: Emails not sending
- **Check**: Brevo API configuration
- **Verify**: API key and sender email
- **Solution**: Test email configuration in admin panel

### Database Issues

**Problem**: Data not loading
- **Check**: Firestore security rules
- **Verify**: User permissions
- **Solution**: Review Firestore rules configuration

### Performance Issues

**Problem**: Slow loading times
- **Check**: Network connectivity
- **Verify**: Firebase quota limits
- **Solution**: Optimize queries and implement pagination

---

## Testing Checklist

### Pre-Testing Setup
- [ ] All environment variables configured
- [ ] Firebase project properly set up
- [ ] Brevo email service configured
- [ ] Test users created for each role
- [ ] Database security rules configured

### Functional Testing
- [ ] User authentication works
- [ ] Role-based access control functions
- [ ] All user roles can perform expected actions
- [ ] Email notifications send correctly
- [ ] Data persistence works across sessions

### Security Testing
- [ ] Users cannot access unauthorized features
- [ ] API endpoints protected by role validation
- [ ] Database queries respect security rules
- [ ] User sessions expire appropriately

### Performance Testing
- [ ] Application loads within acceptable time
- [ ] Database queries perform efficiently
- [ ] Email sending doesn't block UI
- [ ] Large datasets handled properly

---

## Contact & Support

For technical issues or questions:
- Check Firebase console for error logs
- Review browser developer tools for client-side errors
- Verify environment configuration
- Test with different user roles and permissions

---

*This documentation should be updated as new features are added or existing functionality is modified.*
