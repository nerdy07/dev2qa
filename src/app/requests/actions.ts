'use server';

import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendEmail } from '@/lib/email';
import type { CertificateRequest, User, LeaveRequest, Bonus, Infraction, Comment } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';

export async function approveRequestAndSendEmail(request: CertificateRequest, approver: User) {
    if (!request || !approver) {
        return { success: false, error: 'Invalid request or user data.' };
    }

    try {
        // 1. Create Certificate
        const certCollection = collection(db!, 'certificates');
        const certDocRef = await addDoc(certCollection, {
            requestId: request.id,
            taskTitle: request.taskTitle,
            associatedTeam: request.associatedTeam,
            associatedProject: request.associatedProject,
            requesterName: request.requesterName,
            qaTesterName: approver.name,
            approvalDate: serverTimestamp(),
            status: 'valid',
        });

        // 2. Update Request
        const requestRef = doc(db!, 'requests', request.id);
        await updateDoc(requestRef, {
            status: 'approved',
            qaTesterId: approver.id,
            qaTesterName: approver.name,
            updatedAt: serverTimestamp(),
            certificateId: certDocRef.id,
            certificateStatus: 'valid',
        });

        // 3. Send Email Notification
        const emailResult = await sendEmail({
            to: request.requesterEmail,
            subject: `Your Certificate Request has been Approved!`,
            html: `
                <h1>Congratulations, ${request.requesterName}!</h1>
                <p>Your request for the task "<strong>${request.taskTitle}</strong>" has been approved.</p>
                <p>You can view your certificate by logging into the Dev2QA portal.</p>
                <br>
                <p>Thank you,</p>
                <p>The Dev2QA Team</p>
            `
        });

        if (!emailResult.success) {
             // Log the email failure but don't fail the whole operation
            console.warn(`Request ${request.id} was approved, but the notification email failed to send.`, emailResult.error);
        }

        revalidatePath(`/dashboard/requests/${request.id}`);
        revalidatePath('/dashboard');
        
        return { success: true, certificateId: certDocRef.id };

    } catch (error) {
        console.error('Error approving request:', error);
        return { success: false, error: 'An unexpected error occurred during the approval process.' };
    }
}


export async function rejectRequest(request: CertificateRequest, rejector: User, reason: string) {
    if (!request || !rejector || !reason) {
        return { success: false, error: 'Invalid request, user, or reason provided.' };
    }

    try {
        const requestRef = doc(db!, 'requests', request.id);
        await updateDoc(requestRef, {
            status: 'rejected',
            rejectionReason: reason,
            qaTesterId: rejector.id,
            qaTesterName: rejector.name,
            updatedAt: serverTimestamp(),
        });
        
        await sendEmail({
            to: request.requesterEmail,
            subject: `Action Required: Your Certificate Request was Rejected`,
            html: `
                <h1>Hello, ${request.requesterName},</h1>
                <p>Your certificate request for the task "<strong>${request.taskTitle}</strong>" has been rejected.</p>
                <p><strong>Reason provided by ${rejector.name}:</strong></p>
                <p><em>${reason}</em></p>
                <p>Please review the feedback and make the necessary changes. You can view more details and comments by logging into the Dev2QA portal.</p>
                <br>
                <p>Thank you,</p>
                <p>The Dev2QA Team</p>
            `
        });
        
        revalidatePath(`/dashboard/requests/${request.id}`);
        revalidatePath('/dashboard');

        return { success: true };

    } catch (error) {
        console.error('Error rejecting request:', error);
        return { success: false, error: 'An unexpected error occurred during the rejection process.' };
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
                <p>If you are seeing this, your Mailgun configuration is working correctly.</p>
                <br>
                <p>Thank you,</p>
                <p>The Dev2QA Team</p>
            `
        });

        if (emailResult.success) {
            return { success: true };
        } else {
            return { success: false, error: emailResult.error };
        }
    } catch (error) {
        console.error('Error sending test email:', error);
        return { success: false, error: 'An unexpected error occurred while sending the test email.' };
    }
}


export async function sendWelcomeEmail(name: string, email: string) {
    try {
        await sendEmail({
            to: email,
            subject: `Welcome to Dev2QA!`,
            html: `
                <h1>Welcome aboard, ${name}!</h1>
                <p>An account has been created for you on the Dev2QA platform.</p>
                <p>Please contact your administrator to receive your temporary password and get started.</p>
                <br>
                <p>Best regards,</p>
                <p>The Dev2QA Team</p>
            `
        });
        return { success: true };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return { success: false, error: 'Failed to send welcome email.' };
    }
}

export async function notifyOnNewRequest(request: Omit<CertificateRequest, 'id'> & {id:string}) {
    try {
        const qaQuery = query(collection(db!, 'users'), where('role', '==', 'qa_tester'));
        const qaSnapshot = await getDocs(qaQuery);
        const qaEmails = qaSnapshot.docs.map(doc => (doc.data() as User).email);

        if(qaEmails.length === 0) return { success: true, message: 'No QA testers to notify.' };

        await sendEmail({
            to: qaEmails.join(','),
            subject: `New Certificate Request: "${request.taskTitle}"`,
            html: `
                <h1>New Request for QA Review</h1>
                <p>A new certificate request has been submitted by <strong>${request.requesterName}</strong> and is ready for review.</p>
                <ul>
                    <li><strong>Task:</strong> ${request.taskTitle}</li>
                    <li><strong>Project:</strong> ${request.associatedProject}</li>
                    <li><strong>Team:</strong> ${request.associatedTeam}</li>
                </ul>
                <p>Please log in to the Dev2QA dashboard to review the details and take action.</p>
            `
        });
        return { success: true };
    } catch (error) {
        console.error('Error notifying QA testers:', error);
        return { success: false, error: 'Failed to send notification to QA testers.' };
    }
}


export async function notifyOnNewComment(request: CertificateRequest, comment: Omit<Comment, 'id'>) {
    try {
        let recipientEmail: string | undefined;
        let recipientName: string | undefined;

        if (comment.userRole === 'requester' && request.qaTesterId) {
            // Requester commented, notify the assigned QA tester
            const userRef = doc(db!, 'users', request.qaTesterId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const qaTester = userSnap.data() as User;
                recipientEmail = qaTester.email;
                recipientName = qaTester.name;
            }
        } else if (comment.userRole === 'qa_tester' || comment.userRole === 'admin') {
            // QA or Admin commented, notify the requester
            recipientEmail = request.requesterEmail;
            recipientName = request.requesterName;
        }

        if (!recipientEmail || !recipientName) {
            return { success: true, message: 'No recipient for comment notification.' };
        }

        await sendEmail({
            to: recipientEmail,
            subject: `New Comment on Request: "${request.taskTitle}"`,
            html: `
                <h1>New Comment from ${comment.userName}</h1>
                <p>A new comment was added to the certificate request for "<strong>${request.taskTitle}</strong>".</p>
                <p><strong>Comment:</strong></p>
                <p><em>${comment.text}</em></p>
                <p>Please log in to the Dev2QA dashboard to view the conversation and reply.</p>
            `
        });
        return { success: true };
    } catch (error) {
        console.error('Error sending comment notification:', error);
        return { success: false, error: 'Failed to send comment notification.' };
    }
}

// --- Leave Management Actions ---

export async function notifyAdminsOnLeaveRequest(request: Omit<LeaveRequest, 'id'> & {id: string}) {
    try {
        const adminQuery = query(collection(db!, 'users'), where('role', '==', 'admin'));
        const adminSnapshot = await getDocs(adminQuery);
        const adminEmails = adminSnapshot.docs.map(doc => (doc.data() as User).email);

        if(adminEmails.length === 0) return { success: true, message: 'No admins to notify.' };
        
        await sendEmail({
            to: adminEmails.join(','),
            subject: `New Leave Request from ${request.userName}`,
            html: `
                <h1>New Leave Request for Approval</h1>
                <p><strong>${request.userName}</strong> has submitted a new leave request.</p>
                <ul>
                    <li><strong>Type:</strong> ${request.leaveType}</li>
                    <li><strong>Dates:</strong> ${format(request.startDate.toDate(), 'PPP')} to ${format(request.endDate.toDate(), 'PPP')} (${request.daysCount} days)</li>
                    <li><strong>Reason:</strong> ${request.reason}</li>
                </ul>
                <p>Please log in to the Dev2QA dashboard to review and approve/reject the request.</p>
            `
        });
        return { success: true };
    } catch (error) {
        console.error('Error notifying admins of leave request:', error);
        return { success: false, error: 'Failed to send notification to admins.' };
    }
}

export async function approveLeaveRequestAndNotify(requestId: string, approverId: string, approverName: string) {
    try {
        const leaveRequestsCollection = collection(db!, 'leaveRequests');
        const requestRef = doc(leaveRequestsCollection, requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists()) {
            return { success: false, error: 'Leave request not found.' };
        }
        
        await updateDoc(requestRef, {
            status: 'approved',
            reviewedById: approverId,
            reviewedByName: approverName,
            reviewedAt: serverTimestamp(),
        });
        
        const requestData = requestSnap.data() as Omit<LeaveRequest, 'id'>;

        try {
            const usersCollection = collection(db!, 'users');
            const userRef = doc(usersCollection, requestData.userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const user = userSnap.data() as User;
                await sendEmail({
                    to: user.email,
                    subject: `Your Leave Request has been Approved`,
                    html: `
                        <h1>Hello, ${requestData.userName},</h1>
                        <p>Your leave request for <strong>${format(requestData.startDate.toDate(), 'PPP')}</strong> to <strong>${format(requestData.endDate.toDate(), 'PPP')}</strong> has been approved by ${approverName}.</p>
                        <p>Your time off has been logged in the system.</p>
                    `
                });
            }
        } catch (emailError) {
            console.warn(`Leave request ${requestId} approved, but the email notification failed.`, emailError);
        }

        revalidatePath('/dashboard/admin/leave');
        return { success: true };

    } catch (dbError) {
        console.error("Error in approveLeaveRequestAndNotify:", dbError);
        return { success: false, error: 'An unexpected database error occurred during the leave approval process.' };
    }
}

export async function rejectLeaveRequestAndNotify(requestId: string, rejectorId: string, rejectorName: string, reason: string) {
    try {
        const leaveRequestsCollection = collection(db!, 'leaveRequests');
        const requestRef = doc(leaveRequestsCollection, requestId);
        const requestSnap = await getDoc(requestRef);
        
        if (!requestSnap.exists()) {
            return { success: false, error: 'Leave request not found.' };
        }

        await updateDoc(requestRef, {
            status: 'rejected',
            rejectionReason: reason,
            reviewedById: rejectorId,
            reviewedByName: rejectorName,
            reviewedAt: serverTimestamp(),
        });

        const requestData = requestSnap.data() as Omit<LeaveRequest, 'id'>;

        try {
            const usersCollection = collection(db!, 'users');
            const userRef = doc(usersCollection, requestData.userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const user = userSnap.data() as User;
                await sendEmail({
                    to: user.email,
                    subject: `Your Leave Request has been Rejected`,
                    html: `
                        <h1>Hello, ${requestData.userName},</h1>
                        <p>Your leave request for <strong>${format(requestData.startDate.toDate(), 'PPP')}</strong> to <strong>${format(requestData.endDate.toDate(), 'PPP')}</strong> has been rejected by ${rejectorName}.</p>
                        <p><strong>Reason:</strong> ${reason}</p>
                        <p>Please see your manager if you have any questions.</p>
                    `
                });
            }
        } catch (emailError) {
            console.warn(`Leave request ${requestId} was rejected, but the email notification failed.`, emailError);
        }

        revalidatePath('/dashboard/admin/leave');
        return { success: true };

    } catch (dbError) {
        console.error("Error in rejectLeaveRequestAndNotify:", dbError);
        return { success: false, error: 'An unexpected database error occurred during the leave rejection process.' };
    }
}

// --- HR Notifications ---

export async function sendBonusNotification(bonus: Omit<Bonus, 'id'>, recipientEmail: string) {
    try {
        await sendEmail({
            to: recipientEmail,
            subject: `You've Received a Bonus!`,
            html: `
                <h1>Congratulations, ${bonus.userName}!</h1>
                <p>You have been awarded a bonus for: <strong>${bonus.bonusType}</strong>.</p>
                <p><strong>Notes from management:</strong> ${bonus.description}</p>
                <p>This will be reflected in your next payroll. Keep up the great work!</p>
            `
        });
        return { success: true };
    } catch (error) {
        console.error('Error sending bonus notification:', error);
        return { success: false, error: 'Failed to send bonus notification.' };
    }
}

export async function sendInfractionNotification(infraction: Omit<Infraction, 'id'>, recipientEmail: string) {
    try {
        await sendEmail({
            to: recipientEmail,
            subject: `Notification of Recorded Infraction`,
            html: `
                <h1>Hello, ${infraction.userName},</h1>
                <p>This is a notification that an infraction has been recorded in your performance history: <strong>${infraction.infractionType}</strong>.</p>
                <p><strong>Notes from management:</strong> ${infraction.description}</p>
                <p>Please log in to the Dev2QA portal to view your full performance record. If you have any questions, please speak with your manager.</p>
            `
        });
        return { success: true };
    } catch (error) {
        console.error('Error sending infraction notification:', error);
        return { success: false, error: 'Failed to send infraction notification.' };
    }
}
