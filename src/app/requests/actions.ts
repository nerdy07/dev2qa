
'use server';

import { sendEmail } from '@/lib/email';
import { format } from 'date-fns';
import {
  getWelcomeEmailTemplate,
  getRequestApprovedTemplate,
  getRequestRejectedTemplate,
  getNewRequestNotificationTemplate,
  getLeaveApprovalTemplate,
  getLeaveRejectionTemplate,
  getNewLeaveRequestTemplate,
  getBonusNotificationTemplate,
  getInfractionNotificationTemplate,
  getNewCommentTemplate,
  getTestEmailTemplate
} from '@/lib/email-templates';

export async function sendLeaveApprovalEmail(data: {
    recipientEmail: string, 
    userName: string, 
    startDate: string,
    endDate: string,
    approverName: string
}) {
    try {
        await sendEmail({
            to: data.recipientEmail,
            subject: `✅ Your Leave Request has been Approved - Dev2QA`,
            html: getLeaveApprovalTemplate(data.userName, data.startDate, data.endDate, data.approverName)
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
        await sendEmail({
            to: data.recipientEmail,
            subject: `❌ Your Leave Request was not Approved - Dev2QA`,
            html: getLeaveRejectionTemplate(data.userName, data.startDate, data.endDate, data.reason, data.rejectorName)
        });
        return { success: true };
    } catch (error) {
        console.warn(`Leave request rejection email failed to send for ${data.userName}.`, error);
        return { success: false, error: 'DB update successful, but email failed.' };
    }
}


export async function sendRequestApprovedEmail(data: { recipientEmail: string; requesterName: string; taskTitle: string }) {
    try {
        await sendEmail({
            to: data.recipientEmail,
            subject: `✅ Your Certificate Request has been Approved! - Dev2QA`,
            html: getRequestApprovedTemplate(data.requesterName, data.taskTitle)
        });
        return { success: true };
    } catch (emailError) {
         console.warn(`Request approval notification email failed to send to ${data.recipientEmail}.`, emailError);
         return { success: false, error: "Database updated, but email notification failed."};
    }
}


export async function sendRequestRejectedEmail(data: { recipientEmail: string; requesterName: string; taskTitle: string; reason: string; rejectorName: string; }) {
    try {
        await sendEmail({
            to: data.recipientEmail,
            subject: `❌ Action Required: Your Certificate Request Needs Revision - Dev2QA`,
            html: getRequestRejectedTemplate(data.requesterName, data.taskTitle, data.reason, data.rejectorName)
        });
         return { success: true };
    } catch (emailError) {
        console.warn(`Request rejection notification email failed to send to ${data.recipientEmail}.`, emailError);
        return { success: false, error: "Database updated, but email notification failed."};
    }
}

export async function sendTestEmail(email: string) {
    if (!email) {
        return { success: false, error: 'No email address provided.' };
    }

    try {
        const emailResult = await sendEmail({
            to: email,
            subject: '🧪 Dev2QA Email System Test',
            html: getTestEmailTemplate()
        });

        return emailResult;
    } catch (error) {
        const err = error as Error;
        console.error('Error sending test email:', err);
        return { success: false, error: err.message };
    }
}


export async function sendWelcomeEmail(data: { name: string, email: string, password?: string }) {
    try {
        await sendEmail({
            to: data.email,
            subject: `🎉 Welcome to Dev2QA! Your Account is Ready`,
            html: getWelcomeEmailTemplate(data.name, data.email, data.password || '')
        });
        return { success: true };
    } catch (error) {
        const err = error as Error;
        console.error('Error sending welcome email:', err);
        return { success: false, error: err.message };
    }
}

export async function notifyOnNewRequest(data: { qaEmails: string[], taskTitle: string, requesterName: string, associatedProject: string, associatedTeam: string}) {
    try {
        if(data.qaEmails.length === 0) return { success: true, message: 'No QA testers to notify.' };

        await sendEmail({
            to: data.qaEmails.join(','),
            subject: `🔔 New Certificate Request: "${data.taskTitle}" - Dev2QA`,
            html: getNewRequestNotificationTemplate(data.taskTitle, data.requesterName, data.associatedProject, data.associatedTeam)
        });
        return { success: true };
    } catch (error) {
        const err = error as Error;
        console.error('Error notifying QA testers:', err);
        return { success: false, error: err.message };
    }
}

export async function notifyOnNewComment(data: { recipientEmail: string, commenterName: string, taskTitle: string, commentText: string }) {
    try {
        if (!data.recipientEmail) {
            return { success: true, message: 'No recipient for comment notification.' };
        }

        await sendEmail({
            to: data.recipientEmail,
            subject: `💬 New Comment on Request: "${data.taskTitle}" - Dev2QA`,
            html: getNewCommentTemplate(data.commenterName, data.taskTitle, data.commentText)
        });
        return { success: true };
    } catch (error) {
        const err = error as Error;
        console.error('Error sending comment notification:', err);
        return { success: false, error: err.message };
    }
}

export async function notifyAdminsOnLeaveRequest(data: { adminEmails: string[], userName: string, leaveType: string, startDate: string, endDate: string, daysCount: number, reason: string }) {
    try {
        if(data.adminEmails.length === 0) {
             console.warn("New leave request submitted, but no admin users found to notify.");
             return { success: true, message: 'No admins to notify.' };
        }
        
        await sendEmail({
            to: data.adminEmails.join(','),
            subject: `📋 New Leave Request from ${data.userName} - Dev2QA`,
            html: getNewLeaveRequestTemplate(data.userName, data.leaveType, data.startDate, data.endDate, data.daysCount, data.reason)
        });
        return { success: true };
    } catch (error) {
        const err = error as Error;
        console.error('Error notifying admins of leave request:', err);
        return { success: false, error: err.message };
    }
}

export async function sendBonusNotification(data: { recipientEmail: string, userName: string, bonusType: string, description: string }) {
    try {
        const emailResult = await sendEmail({
            to: data.recipientEmail,
            subject: `🎉 You've Received a Bonus! - Dev2QA`,
            html: getBonusNotificationTemplate(data.userName, data.bonusType, data.description)
        });
        if (!emailResult.success) {
            console.warn(`Bonus for ${data.userName} was issued, but notification failed: ${emailResult.error}`);
        }
        return { success: true };
    } catch (emailError) {
        console.warn(`Bonus for ${data.userName} was issued, but the notification email failed to send.`, emailError);
        return { success: false, error: "Database updated, but email failed." };
    }
}

export async function sendInfractionNotification(data: { recipientEmail: string, userName: string, infractionType: string, description: string }) {
    try {
        const emailResult = await sendEmail({
            to: data.recipientEmail,
            subject: `⚠️ Performance Notice - Dev2QA`,
            html: getInfractionNotificationTemplate(data.userName, data.infractionType, data.description)
        });
        if (!emailResult.success) {
             console.warn(`Infraction for ${data.userName} was issued, but notification failed: ${emailResult.error}`);
        }
        return { success: true };
    } catch (emailError) {
        console.warn(`Infraction for ${data.userName} was issued, a notification email failed to send.`, emailError);
        return { success: false, error: "Database updated, but email failed." };
    }
}
