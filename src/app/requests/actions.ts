


'use server';

import { sendEmail } from '@/lib/email';
import { format } from 'date-fns';

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
            subject: `Your Leave Request has been Approved`,
            html: `
                <h1>Hello, ${data.userName},</h1>
                <p>Your leave request for <strong>${format(new Date(data.startDate), 'PPP')}</strong> to <strong>${format(new Date(data.endDate), 'PPP')}</strong> has been approved by ${data.approverName}.</p>
                <p>Your time off has been logged in the system.</p>
            `
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
            subject: `Your Leave Request has been Rejected`,
            html: `
                <h1>Hello, ${data.userName},</h1>
                <p>Your leave request for <strong>${format(new Date(data.startDate), 'PPP')}</strong> to <strong>${format(new Date(data.endDate), 'PPP')}</strong> has been rejected by ${data.rejectorName}.</p>
                <p><strong>Reason:</strong> ${data.reason}</p>
                <p>Please see your manager if you have any questions.</p>
            `
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
            subject: `Your Certificate Request has been Approved!`,
            html: `
                <h1>Congratulations, ${data.requesterName}!</h1>
                <p>Your request for the task "<strong>${data.taskTitle}</strong>" has been approved.</p>
                <p>You can view your certificate by logging into the Dev2QA portal.</p>
                <br>
                <p>Thank you,</p>
                <p>The Dev2QA Team</p>
            `
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
            subject: `Action Required: Your Certificate Request was Rejected`,
            html: `
                <h1>Hello, ${data.requesterName},</h1>
                <p>Your certificate request for the task "<strong>${data.taskTitle}</strong>" has been rejected.</p>
                <p><strong>Reason provided by ${data.rejectorName}:</strong></p>
                <p><em>${data.reason}</em></p>
                <p>Please review the feedback and make the necessary changes. You can view more details and comments by logging into the Dev2QA portal.</p>
                <br>
                <p>Thank you,</p>
                <p>The Dev2QA Team</p>
            `
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
            subject: 'Dev2QA Test Email',
            html: `
                <h1>This is a test email from Dev2QA.</h1>
                <p>If you are seeing this, your email configuration is working correctly.</p>
                <br>
                <p>Thank you,</p>
                <p>The Dev2QA Team</p>
            `
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
            subject: `Welcome to Dev2QA! Your Account is Ready.`,
            html: `
                <h1>Welcome aboard, ${data.name}!</h1>
                <p>An account has been created for you on the Dev2QA platform. You can now log in using the following credentials:</p>
                <ul>
                    <li><strong>Email:</strong> ${data.email}</li>
                    <li><strong>Password:</strong> ${data.password}</li>
                </ul>
                <p>We highly recommend you change your password after your first login.</p>
                <br>
                <p>Best regards,</p>
                <p>The Dev2QA Team</p>
            `
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
            subject: `New Certificate Request: "${data.taskTitle}"`,
            html: `
                <h1>New Request for QA Review</h1>
                <p>A new certificate request has been submitted by <strong>${data.requesterName}</strong> and is ready for review.</p>
                <ul>
                    <li><strong>Task:</strong> ${data.taskTitle}</li>
                    <li><strong>Project:</strong> ${data.associatedProject}</li>
                    <li><strong>Team:</strong> ${data.associatedTeam}</li>
                </ul>
                <p>Please log in to the Dev2QA dashboard to review the details and take action.</p>
            `
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
            subject: `New Comment on Request: "${data.taskTitle}"`,
            html: `
                <h1>New Comment from ${data.commenterName}</h1>
                <p>A new comment was added to the certificate request for "<strong>${data.taskTitle}</strong>".</p>
                <p><strong>Comment:</strong></p>
                <p><em>${data.commentText}</em></p>
                <p>Please log in to the Dev2QA dashboard to view the conversation and reply.</p>
            `
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
            subject: `New Leave Request from ${data.userName}`,
            html: `
                <h1>New Leave Request for Approval</h1>
                <p><strong>${data.userName}</strong> has submitted a new leave request.</p>
                <ul>
                    <li><strong>Type:</strong> ${data.leaveType}</li>
                    <li><strong>Dates:</strong> ${format(new Date(data.startDate), 'PPP')} to ${format(new Date(data.endDate), 'PPP')} (${data.daysCount} days)</li>
                    <li><strong>Reason:</strong> ${data.reason}</li>
                </ul>
                <p>Please log in to the Dev2QA dashboard to review and approve/reject the request.</p>
            `
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
            subject: `You've Received a Bonus!`,
            html: `
                <h1>Congratulations, ${data.userName}!</h1>
                <p>You have been awarded a bonus for: <strong>${data.bonusType}</strong>.</p>
                <p><strong>Notes from management:</strong> ${data.description}</p>
                <p>This will be reflected in your next payroll. Keep up the great work!</p>
            `
        });
        if (!emailResult.success) {
            console.warn(`Bonus for ${data.userName} was issued, but notification failed: ${emailResult.error}`);
        }
        return { success: true };
    } catch (emailError) {
        console.warn(`Bonus for ${data.userName} was issued, a notification email failed to send.`, emailError);
        return { success: false, error: "Database updated, but email failed." };
    }
}

export async function sendInfractionNotification(data: { recipientEmail: string, userName: string, infractionType: string, description: string }) {
    try {
        const emailResult = await sendEmail({
            to: data.recipientEmail,
            subject: `Notification of Recorded Infraction`,
            html: `
                <h1>Hello, ${data.userName},</h1>
                <p>This is a notification that an infraction has been recorded in your performance history: <strong>${data.infractionType}</strong>.</p>
                <p><strong>Notes from management:</strong> ${data.description}</p>
                <p>Please log in to the Dev2QA portal to view your full performance record. If you have any questions, please speak with your manager.</p>
            `
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

export async function notifyOnProjectUpdate(data: { recipientEmails: string[], projectName: string }) {
    try {
        if(data.recipientEmails.length === 0) return { success: true, message: 'No users to notify.' };

        await sendEmail({
            to: data.recipientEmails.join(','),
            subject: `Project Update: "${data.projectName}"`,
            html: `
                <h1>Project Update Notification</h1>
                <p>This is an automated notification to inform you that the project "<strong>${data.projectName}</strong>" has been updated.</p>
                <p>Changes may include updates to project details, task assignments, or task timelines.</p>
                <p>Please log in to the Dev2QA dashboard to review the project and see how these changes may affect your assigned work.</p>
                <br>
                <p>Thank you,</p>
                <p>The Dev2QA Team</p>
            `
        });
        return { success: true };
    } catch (error) {
        const err = error as Error;
        console.error('Error notifying users of project update:', err);
        return { success: false, error: err.message };
    }
}

export async function notifyOnTaskAssignment(data: { recipientEmail: string, assigneeName: string, taskName: string, milestoneName: string, projectName: string }) {
    try {
        await sendEmail({
            to: data.recipientEmail,
            subject: `New Task Assignment: "${data.taskName}"`,
            html: `
                <h1>New Task Assigned to You</h1>
                <p>Hello ${data.assigneeName},</p>
                <p>You have been assigned a new task: <strong>${data.taskName}</strong>.</p>
                <p>Details:</p>
                <ul>
                    <li><strong>Project:</strong> ${data.projectName}</li>
                    <li><strong>Milestone:</strong> ${data.milestoneName}</li>
                </ul>
                <p>Please log in to the Dev2QA dashboard to view the full task details, including the timeline and description.</p>
                <br>
                <p>Thank you,</p>
                <p>The Dev2QA Team</p>
            `
        });
        return { success: true };
    } catch (error) {
        const err = error as Error;
        console.error('Error notifying user of task assignment:', err);
        return { success: false, error: err.message };
    }
}


export async function notifyOnNewDesignRequest(data: { adminEmails: string[], designTitle: string, designerName: string }) {
    try {
        if(data.adminEmails.length === 0) return { success: true, message: 'No admins to notify.' };

        await sendEmail({
            to: data.adminEmails.join(','),
            subject: `New Design for Review: "${data.designTitle}"`,
            html: `
                <h1>New Design for Approval</h1>
                <p>A new design has been submitted by <strong>${data.designerName}</strong> and is ready for review.</p>
                <ul>
                    <li><strong>Design Title:</strong> ${data.designTitle}</li>
                </ul>
                <p>Please log in to the Dev2QA dashboard to review the details and take action.</p>
            `
        });
        return { success: true };
    } catch (error) {
        const err = error as Error;
        console.error('Error notifying admins on new design:', err);
        return { success: false, error: err.message };
    }
}

export async function sendDesignApprovedEmail(data: { recipientEmail: string; designerName: string; designTitle: string; reviewerName: string; }) {
    try {
        await sendEmail({
            to: data.recipientEmail,
            subject: `Your Design has been Approved!`,
            html: `
                <h1>Congratulations, ${data.designerName}!</h1>
                <p>Your design "<strong>${data.designTitle}</strong>" has been approved by ${data.reviewerName}.</p>
                <p>Great work!</p>
                <br>
                <p>Thank you,</p>
                <p>The Dev2QA Team</p>
            `
        });
        return { success: true };
    } catch (emailError) {
         console.warn(`Design approval notification email failed to send to ${data.recipientEmail}.`, emailError);
         return { success: false, error: "Database updated, but email notification failed."};
    }
}

export async function sendDesignRejectedEmail(data: { recipientEmail: string; designerName: string; designTitle: string; comments: string; reviewerName: string; }) {
    try {
        await sendEmail({
            to: data.recipientEmail,
            subject: `Action Required: Your Design was Rejected`,
            html: `
                <h1>Hello, ${data.designerName},</h1>
                <p>Your design for "<strong>${data.designTitle}</strong>" has been rejected.</p>
                <p><strong>Feedback from ${data.reviewerName}:</strong></p>
                <p><em>${data.comments}</em></p>
                <p>Please review the feedback and make the necessary changes. You can view more details by logging into the Dev2QA portal.</p>
                <br>
                <p>Thank you,</p>
                <p>The Dev2QA Team</p>
            `
        });
         return { success: true };
    } catch (emailError) {
        console.warn(`Design rejection notification email failed to send to ${data.recipientEmail}.`, emailError);
        return { success: false, error: "Database updated, but email notification failed."};
    }
}
