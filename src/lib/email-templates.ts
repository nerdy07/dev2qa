// Beautiful HTML email templates for Dev2QA system

export const emailStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8fafc;
    }
    .email-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 40px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header .subtitle {
      margin: 8px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px;
    }
    .content h2 {
      color: #2d3748;
      font-size: 24px;
      margin: 0 0 20px 0;
      font-weight: 600;
    }
    .content p {
      margin: 0 0 16px 0;
      font-size: 16px;
      color: #4a5568;
    }
    .info-card {
      background: #f7fafc;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .info-list {
      list-style: none;
      padding: 0;
      margin: 20px 0;
    }
    .info-list li {
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
    }
    .info-list li:last-child {
      border-bottom: none;
    }
    .info-list strong {
      color: #2d3748;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .cta-button:hover {
      opacity: 0.9;
    }
    .footer {
      background: #f8fafc;
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 0;
      color: #718096;
      font-size: 14px;
    }
    .logo {
      width: 40px;
      height: 40px;
      margin: 0 auto 16px;
      background: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #667eea;
      font-size: 18px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-approved {
      background: #c6f6d5;
      color: #22543d;
    }
    .status-rejected {
      background: #fed7d7;
      color: #742a2a;
    }
    .status-pending {
      background: #fef5e7;
      color: #744210;
    }
    .highlight {
      background: #fff5b4;
      padding: 2px 4px;
      border-radius: 4px;
    }
  </style>
`;

export const getEmailTemplate = (title: string, content: string, ctaText?: string, ctaUrl?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Dev2QA</title>
  ${emailStyles}
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">D2Q</div>
      <h1>Dev2QA</h1>
      <p class="subtitle">Certificate Management System</p>
    </div>
    <div class="content">
      ${content}
      ${ctaText && ctaUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>© 2025 Dev2QA. All rights reserved. Powered by echobitstech.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`;

// Welcome Email Template
export const getWelcomeEmailTemplate = (name: string, email: string, password: string) => {
  const content = `
    <h2>🎉 Welcome to Dev2QA!</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>We're excited to have you join the Dev2QA platform! Your account has been successfully created and you're ready to start managing certificates and requests.</p>
    
    <div class="info-card">
      <h3 style="margin-top: 0; color: #2d3748;">Your Login Credentials</h3>
      <ul class="info-list">
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Password:</strong> <span class="highlight">${password}</span></li>
      </ul>
      <p style="margin-bottom: 0; font-size: 14px; color: #718096;">
        ⚠️ For security reasons, please change your password after your first login.
      </p>
    </div>
    
    <p>You can now access the Dev2QA dashboard to:</p>
    <ul>
      <li>Submit certificate requests</li>
      <li>Track your request status</li>
      <li>View your certificates</li>
      <li>Manage your profile</li>
    </ul>
    
    <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
  `;
  
  return getEmailTemplate(
    "Welcome to Dev2QA",
    content,
    "Access Dashboard",
    "http://localhost:9002/dashboard"
  );
};

// Certificate Request Approved Template
export const getRequestApprovedTemplate = (requesterName: string, taskTitle: string) => {
  const content = `
    <h2>✅ Certificate Request Approved!</h2>
    <p>Congratulations <strong>${requesterName}</strong>!</p>
    <p>Great news! Your certificate request has been approved and is now ready for use.</p>
    
    <div class="info-card">
      <h3 style="margin-top: 0; color: #2d3748;">Request Details</h3>
      <ul class="info-list">
        <li><strong>Task:</strong> ${taskTitle}</li>
        <li><strong>Status:</strong> <span class="status-badge status-approved">Approved</span></li>
        <li><strong>Date Approved:</strong> ${new Date().toLocaleDateString()}</li>
      </ul>
    </div>
    
    <p>Your certificate is now available in your dashboard. You can download it and use it for your professional development records.</p>
    
    <p>Keep up the excellent work! 🚀</p>
  `;
  
  return getEmailTemplate(
    "Certificate Request Approved",
    content,
    "View Certificate",
    "http://localhost:9002/dashboard"
  );
};

// Certificate Request Rejected Template
export const getRequestRejectedTemplate = (requesterName: string, taskTitle: string, reason: string, rejectorName: string) => {
  const content = `
    <h2>❌ Certificate Request Needs Revision</h2>
    <p>Hello <strong>${requesterName}</strong>,</p>
    <p>Your certificate request has been reviewed and requires some adjustments before it can be approved.</p>
    
    <div class="info-card">
      <h3 style="margin-top: 0; color: #2d3748;">Request Details</h3>
      <ul class="info-list">
        <li><strong>Task:</strong> ${taskTitle}</li>
        <li><strong>Status:</strong> <span class="status-badge status-rejected">Needs Revision</span></li>
        <li><strong>Reviewed by:</strong> ${rejectorName}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
      </ul>
    </div>
    
    <div style="background: #fef5e7; border-left: 4px solid #f6ad55; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin-top: 0; color: #744210;">Feedback from Reviewer</h3>
      <p style="margin-bottom: 0; font-style: italic; color: #744210;">"${reason}"</p>
    </div>
    
    <p>Please review the feedback above and make the necessary changes. You can resubmit your request once you've addressed the concerns.</p>
  `;
  
  return getEmailTemplate(
    "Certificate Request Needs Revision",
    content,
    "View Request Details",
    "http://localhost:9002/dashboard"
  );
};

// New Request Notification Template
export const getNewRequestNotificationTemplate = (taskTitle: string, requesterName: string, associatedProject: string, associatedTeam: string) => {
  const content = `
    <h2>🔔 New Certificate Request for Review</h2>
    <p>A new certificate request has been submitted and is ready for your review.</p>
    
    <div class="info-card">
      <h3 style="margin-top: 0; color: #2d3748;">Request Information</h3>
      <ul class="info-list">
        <li><strong>Task Title:</strong> ${taskTitle}</li>
        <li><strong>Requester:</strong> ${requesterName}</li>
        <li><strong>Project:</strong> ${associatedProject}</li>
        <li><strong>Team:</strong> ${associatedTeam}</li>
        <li><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</li>
      </ul>
    </div>
    
    <p>Please review the request details and take appropriate action. Your timely review helps maintain our quality standards.</p>
  `;
  
  return getEmailTemplate(
    "New Certificate Request",
    content,
    "Review Request",
    "http://localhost:9002/dashboard"
  );
};

// Leave Request Approved Template
export const getLeaveApprovalTemplate = (userName: string, startDate: string, endDate: string, approverName: string) => {
  const content = `
    <h2>✅ Leave Request Approved</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Your leave request has been approved! Enjoy your time off.</p>
    
    <div class="info-card">
      <h3 style="margin-top: 0; color: #2d3748;">Leave Details</h3>
      <ul class="info-list">
        <li><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</li>
        <li><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</li>
        <li><strong>Status:</strong> <span class="status-badge status-approved">Approved</span></li>
        <li><strong>Approved by:</strong> ${approverName}</li>
      </ul>
    </div>
    
    <p>Your time off has been logged in the system. Have a great break! 🏖️</p>
  `;
  
  return getEmailTemplate(
    "Leave Request Approved",
    content,
    "View Leave Records",
    "http://localhost:9002/dashboard/my-records"
  );
};

// Leave Request Rejected Template
export const getLeaveRejectionTemplate = (userName: string, startDate: string, endDate: string, reason: string, rejectorName: string) => {
  const content = `
    <h2>❌ Leave Request Not Approved</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Unfortunately, your leave request could not be approved at this time.</p>
    
    <div class="info-card">
      <h3 style="margin-top: 0; color: #2d3748;">Request Details</h3>
      <ul class="info-list">
        <li><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</li>
        <li><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</li>
        <li><strong>Status:</strong> <span class="status-badge status-rejected">Not Approved</span></li>
        <li><strong>Reviewed by:</strong> ${rejectorName}</li>
      </ul>
    </div>
    
    <div style="background: #fef5e7; border-left: 4px solid #f6ad55; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin-top: 0; color: #744210;">Reason</h3>
      <p style="margin-bottom: 0; color: #744210;">${reason}</p>
    </div>
    
    <p>Please speak with your manager if you have any questions or would like to discuss alternative arrangements.</p>
  `;
  
  return getEmailTemplate(
    "Leave Request Not Approved",
    content,
    "View Leave Records",
    "http://localhost:9002/dashboard/my-records"
  );
};

// New Leave Request for Admins Template
export const getNewLeaveRequestTemplate = (userName: string, leaveType: string, startDate: string, endDate: string, daysCount: number, reason: string) => {
  const content = `
    <h2>📋 New Leave Request for Approval</h2>
    <p><strong>${userName}</strong> has submitted a new leave request that requires your review.</p>
    
    <div class="info-card">
      <h3 style="margin-top: 0; color: #2d3748;">Request Details</h3>
      <ul class="info-list">
        <li><strong>Employee:</strong> ${userName}</li>
        <li><strong>Leave Type:</strong> ${leaveType}</li>
        <li><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</li>
        <li><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</li>
        <li><strong>Duration:</strong> ${daysCount} days</li>
        <li><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</li>
      </ul>
    </div>
    
    <div style="background: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin-top: 0; color: #2d3748;">Reason</h3>
      <p style="margin-bottom: 0; color: #4a5568;">${reason}</p>
    </div>
    
    <p>Please review this request and take appropriate action as soon as possible.</p>
  `;
  
  return getEmailTemplate(
    "New Leave Request",
    content,
    "Review Leave Request",
    "http://localhost:9002/dashboard/admin/leave"
  );
};

// Bonus Notification Template
export const getBonusNotificationTemplate = (userName: string, bonusType: string, description: string) => {
  const content = `
    <h2>🎉 Congratulations! You've Received a Bonus!</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>We're pleased to inform you that you have been awarded a bonus for your outstanding performance!</p>
    
    <div class="info-card">
      <h3 style="margin-top: 0; color: #2d3748;">Bonus Details</h3>
      <ul class="info-list">
        <li><strong>Type:</strong> ${bonusType}</li>
        <li><strong>Date Awarded:</strong> ${new Date().toLocaleDateString()}</li>
        <li><strong>Status:</strong> <span class="status-badge status-approved">Awarded</span></li>
      </ul>
    </div>
    
    <div style="background: #f0fff4; border-left: 4px solid #68d391; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin-top: 0; color: #22543d;">Notes from Management</h3>
      <p style="margin-bottom: 0; color: #22543d;">${description}</p>
    </div>
    
    <p>This bonus will be reflected in your next payroll. Keep up the excellent work! 💪</p>
  `;
  
  return getEmailTemplate(
    "Bonus Awarded",
    content,
    "View Payroll Records",
    "http://localhost:9002/dashboard/my-records"
  );
};

// Infraction Notification Template
export const getInfractionNotificationTemplate = (userName: string, infractionType: string, description: string) => {
  const content = `
    <h2>⚠️ Performance Notice</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>This is a notification that a performance infraction has been recorded in your employee record.</p>
    
    <div class="info-card">
      <h3 style="margin-top: 0; color: #2d3748;">Infraction Details</h3>
      <ul class="info-list">
        <li><strong>Type:</strong> ${infractionType}</li>
        <li><strong>Date Recorded:</strong> ${new Date().toLocaleDateString()}</li>
        <li><strong>Status:</strong> <span class="status-badge status-rejected">Recorded</span></li>
      </ul>
    </div>
    
    <div style="background: #fef5e7; border-left: 4px solid #f6ad55; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin-top: 0; color: #744210;">Management Notes</h3>
      <p style="margin-bottom: 0; color: #744210;">${description}</p>
    </div>
    
    <p>Please review your performance record and speak with your manager if you have any questions or concerns.</p>
  `;
  
  return getEmailTemplate(
    "Performance Notice",
    content,
    "View Performance Record",
    "http://localhost:9002/dashboard/my-records"
  );
};

// New Comment Notification Template
export const getNewCommentTemplate = (commenterName: string, taskTitle: string, commentText: string) => {
  const content = `
    <h2>💬 New Comment on Your Request</h2>
    <p><strong>${commenterName}</strong> has added a new comment to your certificate request.</p>
    
    <div class="info-card">
      <h3 style="margin-top: 0; color: #2d3748;">Request Details</h3>
      <ul class="info-list">
        <li><strong>Task:</strong> ${taskTitle}</li>
        <li><strong>Commenter:</strong> ${commenterName}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
      </ul>
    </div>
    
    <div style="background: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin-top: 0; color: #2d3748;">Comment</h3>
      <p style="margin-bottom: 0; color: #4a5568; font-style: italic;">"${commentText}"</p>
    </div>
    
    <p>Please log in to view the full conversation and respond if needed.</p>
  `;
  
  return getEmailTemplate(
    "New Comment Added",
    content,
    "View Conversation",
    "http://localhost:9002/dashboard"
  );
};

// Test Email Template
export const getTestEmailTemplate = () => {
  const content = `
    <h2>🧪 Dev2QA System Test</h2>
    <p>This is a test email to verify that your email configuration is working correctly.</p>
    
    <div class="info-card">
      <h3 style="margin-top: 0; color: #2d3748;">System Status</h3>
      <ul class="info-list">
        <li><strong>Email Service:</strong> <span class="status-badge status-approved">Active</span></li>
        <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
        <li><strong>System:</strong> Dev2QA Certificate Management</li>
      </ul>
    </div>
    
    <p>If you're receiving this email, your Dev2QA email notifications are properly configured! 🎉</p>
  `;
  
  return getEmailTemplate(
    "Email System Test",
    content,
    "Access Dashboard",
    "http://localhost:9002/dashboard"
  );
};
