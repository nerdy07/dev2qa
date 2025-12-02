'use server';

import { sendEmail } from '@/lib/email';
import { wrapEmailContent, emailButton } from '@/lib/email-template';
import { format } from 'date-fns';

export async function sendRequestApprovedEmail(data: { recipientEmail: string; requesterName: string; taskTitle: string; requestId: string; requestShortId?: string; certificateId?: string; certificateShortId?: string; certificateRequired?: boolean }) {
    try {
        const { getAbsoluteUrl } = await import('@/lib/email-template');
        const requiresCertificate = data.certificateRequired !== false;
        const linkPath = requiresCertificate && data.certificateId
            ? `/dashboard/certificates/${data.certificateId}`
            : `/dashboard/requests/${data.requestId}`;
        const linkUrl = getAbsoluteUrl(linkPath);
        const buttonText = requiresCertificate && data.certificateId ? 'View Certificate' : 'View Request';
        
        const displayRequestId = data.requestShortId || `REQ-${data.requestId.slice(0, 6)}`;
        const displayCertId = data.certificateShortId || (requiresCertificate && data.certificateId ? `CERT-${data.certificateId.slice(0, 6)}` : '');
        
        const content = `
            <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Congratulations, ${data.requesterName}!</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
                Your request <strong>${displayRequestId}</strong> for the task "<strong>${data.taskTitle}</strong>" has been approved.
            </p>
            <p style="font-size: 16px; margin-bottom: 20px;">
                ${
                    requiresCertificate && data.certificateId
                        ? `Your certificate ${displayCertId} is ready!`
                        : 'A QA reviewer has signed off on your task (no completion certificate was required).'
                }
            </p>
            ${emailButton(linkUrl, buttonText)}
        `;
        
        await sendEmail({
            to: data.recipientEmail,
            subject: requiresCertificate ? `Your Certificate Request has been Approved!` : `Your Task Has Been Approved by QA`,
            html: wrapEmailContent(content, requiresCertificate ? 'Certificate Request Approved' : 'QA Review Approved')
        });
        return { success: true };
    } catch (emailError) {
         console.warn(`Request approval notification email failed to send to ${data.recipientEmail}.`, emailError);
         return { success: false, error: "Database updated, but email notification failed."};
    }
}


export async function sendRequestRejectedEmail(data: { recipientEmail: string; requesterName: string; taskTitle: string; reason: string; rejectorName: string; requestId: string; requestShortId?: string }) {
    try {
        const { getAbsoluteUrl } = await import('@/lib/email-template');
        const requestUrl = getAbsoluteUrl(`/dashboard/requests/${data.requestId}`);
        
        const displayRequestId = data.requestShortId || `REQ-${data.requestId.slice(0, 6)}`;
        
        const content = `
            <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Hello, ${data.requesterName},</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
                Your certificate request <strong>${displayRequestId}</strong> for the task "<strong>${data.taskTitle}</strong>" has been rejected.
            </p>
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="font-size: 16px; margin: 0 0 10px 0;">
                    <strong>Reason provided by ${data.rejectorName}:</strong>
                </p>
                <p style="font-size: 15px; margin: 0; color: #7f1d1d;">
                    <em>${data.reason}</em>
                </p>
            </div>
            <p style="font-size: 16px; margin-bottom: 20px;">
                Please review the feedback and make the necessary changes. You can view more details and comments by clicking the button below.
            </p>
            ${emailButton(requestUrl, 'View Request Details & Reply')}
        `;
        
        await sendEmail({
            to: data.recipientEmail,
            subject: `Action Required: Your Certificate Request was Rejected`,
            html: wrapEmailContent(content, 'Certificate Request Rejected')
        });
         return { success: true };
    } catch (emailError) {
        console.warn(`Request rejection notification email failed to send to ${data.recipientEmail}.`, emailError);
        return { success: false, error: "Database updated, but email notification failed."};
    }
}



export async function sendWelcomeEmail(data: { name: string, email: string, password?: string }) {
    try {
        const { getAbsoluteUrl } = await import('@/lib/email-template');
        const loginUrl = getAbsoluteUrl('/');
        
        const content = `
            <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Welcome aboard, ${data.name}!</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
                An account has been created for you on the Dev2QA platform. You can now log in using the following credentials:
            </p>
            <div style="background-color: #f0f5fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin-bottom: 10px; font-size: 15px;">
                        <strong>Email:</strong> ${data.email}
                    </li>
                    ${data.password ? `
                    <li style="margin-bottom: 10px; font-size: 15px;">
                        <strong>Password:</strong> <code style="background-color: #fff; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${data.password}</code>
                    </li>
                    ` : ''}
                </ul>
            </div>
            <p style="font-size: 16px; margin-bottom: 20px; color: #dc2626;">
                <strong>⚠ Important:</strong> We highly recommend you change your password after your first login.
            </p>
            ${emailButton(loginUrl, 'Log In to Dev2QA')}
        `;
        
        await sendEmail({
            to: data.email,
            subject: `Welcome to Dev2QA! Your Account is Ready.`,
            html: wrapEmailContent(content, 'Welcome to Dev2QA')
        });
        return { success: true };
    } catch (error) {
        console.warn(`Welcome email failed to send to ${data.email}.`, error);
        return { success: false, error: 'Email notification failed.' };
    }
}

export async function sendLeaveApprovalEmail(data: {
    recipientEmail: string, 
    userName: string, 
    startDate: string,
    endDate: string,
    approverName: string
}) {
    try {
        const content = `
            <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Hello, ${data.userName},</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
                Your leave request for <strong>${format(new Date(data.startDate), 'PPP')}</strong> to <strong>${format(new Date(data.endDate), 'PPP')}</strong> has been approved by ${data.approverName}.
            </p>
            <p style="font-size: 16px;">
                Your time off has been logged in the system.
            </p>
        `;
        
        await sendEmail({
            to: data.recipientEmail,
            subject: `Your Leave Request has been Approved`,
            html: wrapEmailContent(content, 'Leave Request Approved')
        });
        return { success: true };
    } catch (error) {
        console.warn(`Leave request approval email failed to send for ${data.userName}.`, error);
        return { success: false, error: 'DB update successful, but email failed.' };
    }
}

export async function sendLeaveRejectionEmail(data: {
    recipientEmail: string,
    userName: string,
    startDate: string,
    endDate: string,
    reason: string,
    rejectorName: string
}) {
    try {
        const content = `
            <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Hello, ${data.userName},</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
                Your leave request for <strong>${format(new Date(data.startDate), 'PPP')}</strong> to <strong>${format(new Date(data.endDate), 'PPP')}</strong> has been rejected by ${data.rejectorName}.
            </p>
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="font-size: 16px; margin: 0 0 10px 0;">
                    <strong>Reason:</strong>
                </p>
                <p style="font-size: 15px; margin: 0; color: #7f1d1d;">
                    <em>${data.reason}</em>
                </p>
            </div>
        `;
        
        await sendEmail({
            to: data.recipientEmail,
            subject: `Your Leave Request has been Rejected`,
            html: wrapEmailContent(content, 'Leave Request Rejected')
        });
        return { success: true };
    } catch (error) {
        console.warn(`Leave request rejection email failed to send for ${data.userName}.`, error);
        return { success: false, error: 'DB update successful, but email failed.' };
    }
}

export async function notifyOnNewRequest(data: {
    qaEmails: string[];
    taskTitle: string;
    requesterName: string;
    associatedProject: string;
    associatedTeam: string;
    certificateRequired?: boolean;
}) {
    try {
        const { getAbsoluteUrl } = await import('@/lib/email-template');
        const dashboardUrl = getAbsoluteUrl('/dashboard');
        const requiresCertificate = data.certificateRequired !== false;
        
        const content = `
            <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">${requiresCertificate ? 'New Certificate Request' : 'New QA Sign-off Request'}</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>${data.requesterName}</strong> has submitted a ${requiresCertificate ? 'certificate' : 'QA sign-off'} request for the task "<strong>${data.taskTitle}</strong>".
            </p>
            <div style="background-color: #f0f5fa; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Project:</strong> ${data.associatedProject}</p>
                <p style="margin: 5px 0;"><strong>Team:</strong> ${data.associatedTeam}</p>
            </div>
            <p style="font-size: 16px; margin-bottom: 20px;">
                Please review and process this request at your earliest convenience.
            </p>
            ${emailButton(dashboardUrl, 'View Request in Dashboard')}
        `;
        
        const emailPromises = data.qaEmails.map(email => 
            sendEmail({
                to: email,
                subject: `${requiresCertificate ? 'New Certificate Request' : 'QA Sign-off Needed'}: ${data.taskTitle}`,
                html: wrapEmailContent(content, requiresCertificate ? 'New Certificate Request' : 'New QA Sign-off Request')
            })
        );
        
        await Promise.all(emailPromises);
        return { success: true };
    } catch (error) {
        console.warn('Failed to send notification emails to QA testers.', error);
        return { success: false, error: 'Email notification failed.' };
    }
}

export async function notifyOnPendingRequestReminder(data: {
    qaEmails: string[];
    requests: Array<{
        requestId: string;
        shortId?: string;
        taskTitle: string;
        requesterName: string;
        associatedProject: string;
        associatedTeam: string;
        certificateRequired?: boolean;
        createdAt: string;
    }>;
}) {
    if (!data.qaEmails || data.qaEmails.length === 0) {
        return { success: false, error: 'No QA recipients found.' };
    }

    if (!data.requests || data.requests.length === 0) {
        return { success: false, error: 'No pending requests to notify about.' };
    }

    try {
        const { getAbsoluteUrl } = await import('@/lib/email-template');
        const dashboardUrl = getAbsoluteUrl('/dashboard/requests');

        const listItems = data.requests.map((request) => {
            const displayId = request.shortId || `REQ-${request.requestId.slice(0, 6)}`;
            const submittedOn = format(new Date(request.createdAt), 'PPP');
            const tag = request.certificateRequired !== false ? 'Certificate' : 'QA Sign-off';

            return `
                <li style="margin-bottom: 12px;">
                    <strong>${displayId}</strong> &mdash; ${request.taskTitle}<br/>
                    <span style="color: #4b5563;">Submitted by ${request.requesterName} on ${submittedOn}</span><br/>
                    <span style="color: #6b7280; font-size: 13px;">Project: ${request.associatedProject} &bull; Team: ${request.associatedTeam} &bull; Type: ${tag}</span>
                </li>
            `;
        }).join('');

        const content = `
            <h1 style="color: #dc2626; margin-top: 0; font-size: 24px;">Pending Requests Need Attention</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
                The following ${data.requests.length === 1 ? 'request has' : `${data.requests.length} requests have`} been waiting for approval for over 3 days. Please review and take action.
            </p>
            <ul style="padding-left: 20px; color: #111827; font-size: 15px;">
                ${listItems}
            </ul>
            ${emailButton(dashboardUrl, 'Review Pending Requests')}
            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                This is an automated reminder. Once a request is approved or rejected, reminders will stop.
            </p>
        `;

        await Promise.all(
            data.qaEmails.map((email) =>
                sendEmail({
                    to: email,
                    subject: `Follow-up: ${data.requests.length} pending request${data.requests.length === 1 ? '' : 's'} need approval`,
                    html: wrapEmailContent(content, 'Pending Requests Reminder'),
                })
            )
        );

        return { success: true };
    } catch (error) {
        console.warn('Failed to send pending request reminder emails.', error);
        return { success: false, error: 'Reminder emails failed.' };
    }
}

export async function notifyOnNewComment(data: {
    recipientEmail: string;
    commenterName: string;
    taskTitle: string;
    commentText: string;
    requestId: string;
}) {
    try {
        const { getAbsoluteUrl } = await import('@/lib/email-template');
        const requestUrl = getAbsoluteUrl(`/dashboard/requests/${data.requestId}`);
        
        const content = `
            <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">New Comment on Request</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>${data.commenterName}</strong> has added a comment on the request for "<strong>${data.taskTitle}</strong>".
            </p>
            <div style="background-color: #f0f5fa; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-style: italic;">${data.commentText}</p>
            </div>
            ${emailButton(requestUrl, 'View Request & Reply')}
        `;
        
        await sendEmail({
            to: data.recipientEmail,
            subject: `New Comment: ${data.taskTitle}`,
            html: wrapEmailContent(content, 'New Comment')
        });
        return { success: true };
    } catch (error) {
        console.warn(`Failed to send comment notification email to ${data.recipientEmail}.`, error);
        return { success: false, error: 'Email notification failed.' };
    }
}

export async function sendLeaderboardTopUserEmail(data: {
  recipientEmail: string;
  userName: string;
  topUserName: string;
  leaderboardType: 'qa' | 'requester';
  isNewTop: boolean;
}) {
  try {
    const { getAbsoluteUrl } = await import('@/lib/email-template');
    const leaderboardUrl = getAbsoluteUrl('/dashboard/leaderboards');
    
    const leaderboardTypeName = data.leaderboardType === 'qa' ? 'QA Tester' : 'Requester';
    const emoji = data.isNewTop ? '🎉' : '👑';
    
    const content = `
      <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">${emoji} Leaderboard Update</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        ${data.isNewTop 
          ? `<strong>${data.topUserName}</strong> is now the top ${leaderboardTypeName}! 🎉`
          : `<strong>${data.topUserName}</strong> is the top ${leaderboardTypeName}! 👑`
        }
      </p>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Check out the leaderboard to see all the top performers and show your support!
      </p>
      ${emailButton(leaderboardUrl, 'View Leaderboard')}
    `;
    
    await sendEmail({
      to: data.recipientEmail,
      subject: data.isNewTop 
        ? `🎉 New Top ${leaderboardTypeName}: ${data.topUserName}!`
        : `👑 Top ${leaderboardTypeName}: ${data.topUserName}`,
      html: wrapEmailContent(content, 'Leaderboard Update')
    });
    return { success: true };
  } catch (error) {
    console.warn(`Leaderboard notification email failed to send to ${data.recipientEmail}.`, error);
    return { success: false, error: 'Email notification failed.' };
  }
}

export async function sendDesignApprovedEmail(data: {
  recipientEmail: string;
  designerName: string;
  designTitle: string;
  reviewerName: string;
}) {
  try {
    const { getAbsoluteUrl } = await import('@/lib/email-template');
    const dashboardUrl = getAbsoluteUrl('/dashboard/admin/design-approvals');
    
    const content = `
      <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Congratulations, ${data.designerName}!</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Your design request "<strong>${data.designTitle}</strong>" has been approved by ${data.reviewerName}.
      </p>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Great work! Your design has been reviewed and accepted.
      </p>
      ${emailButton(dashboardUrl, 'View Design Requests')}
    `;
    
    await sendEmail({
      to: data.recipientEmail,
      subject: `Design Approved: ${data.designTitle}`,
      html: wrapEmailContent(content, 'Design Approved')
    });
    return { success: true };
  } catch (error) {
    console.warn(`Design approval email failed to send to ${data.recipientEmail}.`, error);
    return { success: false, error: 'Email notification failed.' };
  }
}

export async function sendDesignRejectedEmail(data: {
  recipientEmail: string;
  designerName: string;
  designTitle: string;
  comments: string;
  reviewerName: string;
}) {
  try {
    const { getAbsoluteUrl } = await import('@/lib/email-template');
    const dashboardUrl = getAbsoluteUrl('/dashboard/admin/design-approvals');
    
    const content = `
      <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Hello, ${data.designerName},</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Your design request "<strong>${data.designTitle}</strong>" has been reviewed by ${data.reviewerName} and requires revisions.
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="font-size: 16px; margin: 0 0 10px 0;">
          <strong>Review Comments:</strong>
        </p>
        <p style="font-size: 15px; margin: 0; color: #7f1d1d;">
          <em>${data.comments}</em>
        </p>
      </div>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Please review the feedback and make the necessary changes.
      </p>
      ${emailButton(dashboardUrl, 'View Design Requests')}
    `;
    
    await sendEmail({
      to: data.recipientEmail,
      subject: `Design Rejected: ${data.designTitle}`,
      html: wrapEmailContent(content, 'Design Rejected')
    });
    return { success: true };
  } catch (error) {
    console.warn(`Design rejection email failed to send to ${data.recipientEmail}.`, error);
    return { success: false, error: 'Email notification failed.' };
  }
}

export async function notifyOnNewDesignRequest(data: {
  adminEmails: string[];
  designTitle: string;
  designerName: string;
}) {
  try {
    const { getAbsoluteUrl } = await import('@/lib/email-template');
    const dashboardUrl = getAbsoluteUrl('/dashboard/admin/design-approvals');
    
    const content = `
      <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">New Design Request</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        <strong>${data.designerName}</strong> has submitted a new design request: "<strong>${data.designTitle}</strong>".
      </p>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Please review and process this request at your earliest convenience.
      </p>
      ${emailButton(dashboardUrl, 'Review Design Request')}
    `;
    
    const emailPromises = data.adminEmails.map(email =>
      sendEmail({
        to: email,
        subject: `New Design Request: ${data.designTitle}`,
        html: wrapEmailContent(content, 'New Design Request')
      })
    );
    
    await Promise.all(emailPromises);
    return { success: true };
  } catch (error) {
    console.warn('Failed to send notification emails to admins for new design request.', error);
    return { success: false, error: 'Email notification failed.' };
  }
}

export async function sendBonusNotification(data: {
  recipientEmail: string;
  userName: string;
  bonusType: string;
  description: string;
}) {
  try {
    const { getAbsoluteUrl } = await import('@/lib/email-template');
    const dashboardUrl = getAbsoluteUrl('/dashboard');
    
    const content = `
      <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Bonus Awarded, ${data.userName}!</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        You have been awarded a <strong>${data.bonusType}</strong> bonus.
      </p>
      <div style="background-color: #f0f5fa; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; font-size: 15px;">
          <strong>Details:</strong> ${data.description}
        </p>
      </div>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Congratulations on your achievement!
      </p>
      ${emailButton(dashboardUrl, 'View Dashboard')}
    `;
    
    await sendEmail({
      to: data.recipientEmail,
      subject: `Bonus Awarded: ${data.bonusType}`,
      html: wrapEmailContent(content, 'Bonus Awarded')
    });
    return { success: true };
  } catch (error) {
    console.warn(`Bonus notification email failed to send to ${data.recipientEmail}.`, error);
    return { success: false, error: 'Email notification failed.' };
  }
}

export async function sendInfractionNotification(data: {
  recipientEmail: string;
  userName: string;
  infractionType: string;
  description: string;
}) {
  try {
    const { getAbsoluteUrl } = await import('@/lib/email-template');
    const dashboardUrl = getAbsoluteUrl('/dashboard');
    
    const content = `
      <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Infraction Notice, ${data.userName}</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        An infraction has been recorded for you: <strong>${data.infractionType}</strong>.
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 15px; color: #7f1d1d;">
          <strong>Details:</strong> ${data.description}
        </p>
      </div>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Please review this notice and take appropriate action.
      </p>
      ${emailButton(dashboardUrl, 'View Dashboard')}
    `;
    
    await sendEmail({
      to: data.recipientEmail,
      subject: `Infraction Notice: ${data.infractionType}`,
      html: wrapEmailContent(content, 'Infraction Notice')
    });
    return { success: true };
  } catch (error) {
    console.warn(`Infraction notification email failed to send to ${data.recipientEmail}.`, error);
    return { success: false, error: 'Email notification failed.' };
  }
}

export async function notifyOnProjectUpdate(data: {
  projectName: string;
  recipientEmails: string[];
}) {
  try {
    const { getAbsoluteUrl } = await import('@/lib/email-template');
    const dashboardUrl = getAbsoluteUrl('/dashboard');
    
    const content = `
      <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Project Updated</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        The project "<strong>${data.projectName}</strong>" has been updated.
      </p>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Please check the dashboard for the latest changes.
      </p>
      ${emailButton(dashboardUrl, 'View Project')}
    `;
    
    const emailPromises = data.recipientEmails.map(email =>
      sendEmail({
        to: email,
        subject: `Project Updated: ${data.projectName}`,
        html: wrapEmailContent(content, 'Project Updated')
      })
    );
    
    await Promise.all(emailPromises);
    return { success: true };
  } catch (error) {
    console.warn('Failed to send notification emails for project update.', error);
    return { success: false, error: 'Email notification failed.' };
  }
}

export async function notifyOnTaskAssignment(data: {
  recipientEmail: string;
  assigneeName: string;
  taskName: string;
  milestoneName: string;
  projectName: string;
}) {
  try {
    const { getAbsoluteUrl } = await import('@/lib/email-template');
    const dashboardUrl = getAbsoluteUrl('/dashboard/my-work');
    
    const content = `
      <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">New Task Assigned, ${data.assigneeName}!</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        You have been assigned a new task: "<strong>${data.taskName}</strong>".
      </p>
      <div style="background-color: #f0f5fa; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Project:</strong> ${data.projectName}</p>
        <p style="margin: 5px 0;"><strong>Milestone:</strong> ${data.milestoneName}</p>
        <p style="margin: 5px 0;"><strong>Task:</strong> ${data.taskName}</p>
      </div>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Please review the task details and start working on it.
      </p>
      ${emailButton(dashboardUrl, 'View My Tasks')}
    `;
    
    await sendEmail({
      to: data.recipientEmail,
      subject: `New Task Assigned: ${data.taskName}`,
      html: wrapEmailContent(content, 'New Task Assigned')
    });
    return { success: true };
  } catch (error) {
    console.warn(`Task assignment notification email failed to send to ${data.recipientEmail}.`, error);
    return { success: false, error: 'Email notification failed.' };
  }
}

export async function sendInvoiceEmail(data: {
  recipientEmail: string;
  clientName: string;
  invoiceNumber: string;
  invoiceId: string;
  totalAmount: number;
  currency: string;
  dueDate: string;
  invoiceUrl: string;
}) {
  try {
    const { getAbsoluteUrl } = await import('@/lib/email-template');
    const publicInvoiceUrl = getAbsoluteUrl(`/invoices/${data.invoiceId}`);
    const pdfUrl = getAbsoluteUrl(`/api/invoices/${data.invoiceId}/pdf`);
    
    const content = `
      <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Invoice ${data.invoiceNumber}</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Hello ${data.clientName},
      </p>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Please find attached your invoice <strong>${data.invoiceNumber}</strong> for your review.
      </p>
      <div style="background-color: #f0f5fa; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: data.currency,
        }).format(data.totalAmount)}</p>
        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${format(new Date(data.dueDate), 'PPP')}</p>
      </div>
      <p style="font-size: 16px; margin-bottom: 20px;">
        You can view and download the invoice PDF using the links below.
      </p>
      <div style="margin: 20px 0;">
        ${emailButton(publicInvoiceUrl, 'View Invoice Online')}
      </div>
      <p style="font-size: 14px; margin-top: 20px; color: #6b7280;">
        <a href="${pdfUrl}" style="color: #2563eb; text-decoration: none;">Download PDF Invoice</a>
      </p>
      <p style="font-size: 14px; margin-top: 20px; color: #6b7280;">
        If you have any questions about this invoice, please don't hesitate to contact us.
      </p>
    `;
    
    await sendEmail({
      to: data.recipientEmail,
      subject: `Invoice ${data.invoiceNumber} from Dev2QA`,
      html: wrapEmailContent(content, 'Invoice')
    });
    return { success: true };
  } catch (error: any) {
    console.warn(`Invoice email failed to send to ${data.recipientEmail}.`, error);
    return { success: false, error: 'Failed to send invoice email.' };
  }
}

export async function notifyAdminsOnLeaveRequest(data: {
  adminEmails: string[];
  userName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
}) {
  try {
    const { getAbsoluteUrl } = await import('@/lib/email-template');
    const dashboardUrl = getAbsoluteUrl('/dashboard/admin/leave');
    
    const content = `
      <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">New Leave Request</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        <strong>${data.userName}</strong> has submitted a new leave request.
      </p>
      <div style="background-color: #f0f5fa; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Employee:</strong> ${data.userName}</p>
        <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${data.leaveType}</p>
        <p style="margin: 5px 0;"><strong>Start Date:</strong> ${format(new Date(data.startDate), 'PPP')}</p>
        <p style="margin: 5px 0;"><strong>End Date:</strong> ${format(new Date(data.endDate), 'PPP')}</p>
      </div>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Please review and process this request at your earliest convenience.
      </p>
      ${emailButton(dashboardUrl, 'Review Leave Request')}
    `;
    
    const emailPromises = data.adminEmails.map(email =>
      sendEmail({
        to: email,
        subject: `New Leave Request from ${data.userName}`,
        html: wrapEmailContent(content, 'New Leave Request')
      })
    );
    
    await Promise.all(emailPromises);
    return { success: true };
  } catch (error) {
    console.warn('Failed to send notification emails to admins for leave request.', error);
    return { success: false, error: 'Email notification failed.' };
  }
}