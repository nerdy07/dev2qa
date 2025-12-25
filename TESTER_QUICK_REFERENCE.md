# Dev2QA Tester Quick Reference Guide

## 🚀 Quick Start

### Test User Accounts
Create these test accounts for comprehensive testing:

| Role | Email | Password | Key Permissions |
|------|-------|----------|-----------------|
| Admin | admin@test.com | Test123! | Full system access |
| QA Tester | qa@test.com | Test123! | Review/approve requests |
| Requester | requester@test.com | Test123! | Submit requests |
| Developer | dev@test.com | Test123! | Create requests, submit designs |
| Manager | manager@test.com | Test123! | View teams, projects |
| HR Admin | hr@test.com | Test123! | User management, payroll |

## 🧪 Essential Test Scenarios

### 1. Authentication Flow
```
1. Login with valid credentials → Should redirect to dashboard
2. Login with invalid credentials → Should show error
3. Logout → Should redirect to login page
4. Access protected route without login → Should redirect to login
```

### 2. Role-Based Access
```
✅ Admin: Can access all sections
✅ QA Tester: Can review requests, cannot access admin
✅ Requester: Can create requests, cannot access admin
✅ Developer: Can create requests and designs
✅ Manager: Can view teams and projects
✅ HR Admin: Can manage users and payroll
```

### 3. Certificate Request Flow
```
1. Requester creates request
2. QA Tester reviews request
3. QA Tester approves/rejects
4. If approved: Certificate generated
5. Email notifications sent
6. Request status updated
```

### 4. Design Approval Flow
```
1. Developer submits design
2. Admin/Senior QA reviews
3. Admin/Senior QA approves/rejects
4. Email notifications sent
5. Design status updated
```

## 🔍 Critical Test Points

### Authentication & Session
- [ ] Login works with valid credentials
- [ ] Session persists across browser refresh
- [ ] Logout clears session properly
- [ ] Invalid login shows appropriate error
- [ ] Disabled users cannot login

### User Management (Admin Only)
- [ ] Create new user with valid data
- [ ] Edit existing user information
- [ ] Disable/enable user accounts
- [ ] Assign roles correctly
- [ ] Delete users (with confirmation)

### Request Management
- [ ] Submit request with all required fields
- [ ] View request details
- [ ] Add comments to requests
- [ ] Approve/reject requests (QA only)
- [ ] Rate submissions and QA process

### Email Notifications
- [ ] New request notifications sent to QA
- [ ] Approval/rejection emails sent to requester
- [ ] Leave request notifications sent to admins
- [ ] Design approval notifications sent

### Permission Testing
- [ ] Users only see features they have access to
- [ ] API endpoints respect role permissions
- [ ] UI elements hidden based on permissions
- [ ] Unauthorized access attempts blocked

## 🐛 Common Issues to Test

### UI/UX Issues
- [ ] Forms validate input correctly
- [ ] Error messages are clear and helpful
- [ ] Loading states display properly
- [ ] Responsive design works on mobile
- [ ] Navigation is intuitive

### Data Issues
- [ ] Data persists after page refresh
- [ ] Real-time updates work correctly
- [ ] Search and filtering functions properly
- [ ] Pagination works for large datasets

### Performance Issues
- [ ] Pages load within 3 seconds
- [ ] Large lists don't cause browser freeze
- [ ] Email sending doesn't block UI
- [ ] Database queries are efficient

## 📱 Cross-Browser Testing

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers

## 🔒 Security Testing

### Authentication Security
- [ ] Password requirements enforced
- [ ] Session timeout works
- [ ] CSRF protection active
- [ ] XSS prevention working

### Authorization Security
- [ ] Role-based access enforced
- [ ] API endpoints protected
- [ ] Database queries secured
- [ ] File upload restrictions

## 📊 Test Data Setup

### Required Test Data
1. **Teams**: Create 2-3 test teams
2. **Projects**: Create 2-3 test projects
3. **Users**: Create users for each role
4. **Requests**: Submit test requests
5. **Designs**: Submit test designs

### Sample Test Data
```
Team: "Frontend Team", "Backend Team", "QA Team"
Project: "Website Redesign", "Mobile App", "API Development"
Request: "Login Page Testing", "Payment Integration", "User Dashboard"
Design: "Homepage Mockup", "Mobile Wireframes", "Admin Panel Design"
```

## 🚨 Error Scenarios to Test

### Network Issues
- [ ] Offline mode handling
- [ ] Slow network performance
- [ ] Network timeout scenarios
- [ ] Connection loss recovery

### Data Validation
- [ ] Required field validation
- [ ] Email format validation
- [ ] Password strength requirements
- [ ] File upload restrictions

### Edge Cases
- [ ] Empty data states
- [ ] Maximum data limits
- [ ] Special characters in input
- [ ] Very long text inputs

## 📝 Bug Reporting Template

When reporting bugs, include:

```
**Bug Title**: Brief description
**Severity**: Critical/High/Medium/Low
**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Result**: What should happen
**Actual Result**: What actually happens
**Browser/Device**: Chrome on Windows 10
**Screenshots**: If applicable
**Additional Notes**: Any other relevant information
```

## ✅ Testing Checklist

### Pre-Testing
- [ ] Environment configured correctly
- [ ] Test data created
- [ ] All user accounts set up
- [ ] Email service working

### During Testing
- [ ] Test each user role thoroughly
- [ ] Verify all permissions work correctly
- [ ] Check email notifications
- [ ] Test on different browsers
- [ ] Test mobile responsiveness

### Post-Testing
- [ ] Document any bugs found
- [ ] Verify fixes work correctly
- [ ] Update test data if needed
- [ ] Clean up test data

## 🎯 Success Criteria

The application is ready for production when:
- [ ] All user roles can perform their intended functions
- [ ] Authentication and authorization work correctly
- [ ] Email notifications send reliably
- [ ] No critical bugs remain
- [ ] Performance is acceptable
- [ ] Security requirements are met
- [ ] UI/UX is intuitive and responsive

---

*Keep this guide handy during testing sessions for quick reference!*
