'use server';

import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendEmail } from '@/lib/email';
import type { CertificateRequest, User, LeaveRequest, Bonus, Infraction, Comment } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { getAuth } from 'firebase-admin/auth';
import { headers } from 'next/headers';
import { auth } from '@/lib/firebase';
import { getApps } from 'firebase/app';


export async function checkMyRole(): Promise<{ success: boolean; role?: string; error?: string; }> {
    if (!auth?.currentUser) {
        return { success: false, error: "Not authenticated. Could not get current user." };
    }
    const userId = auth.currentUser.uid;

    try {
        const userRef = doc(db!, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return { success: false, error: `User document not found in Firestore for your user ID (${userId}).` };
        }

        const userData = userSnap.data();
        return { success: true, role: userData.role || 'No role specified' };

    } catch (error) {
        const err = error as Error;
        console.error("Diagnostic check failed:", err);
        return { success: false, error: err.message || "An unknown error occurred." };
    }
}


export async function approveRequestAndSendEmail(request: CertificateRequest, approver: User) {
    if (!request || !approver) {
        return { success: false, error: 'Invalid request or user data.' };
    }

    try {
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

        const requestRef = doc(db!, 'requests', request.id);
        await updateDoc(requestRef, {
            status: 'approved',
            qaTesterId: approver.id,
            qaTesterName: approver.name,
            updatedAt: serverTimestamp(),
            certificateId: certDocRef.id,
            certificateStatus: 'valid',
        });

        try {
            await sendEmail({
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
        } catch (emailError) {
             console.warn(`Request ${request.id} was approved, but the notification email failed to send.`, emailError);
        }

        revalidatePath(`/dashboard/requests/${request.id}`);
        revalidatePath('/dashboard');
        
        return { success: true, certificateId: certDocRef.id };

    } catch (error) {
        const err = error as Error;
        console.error('Error approving request:', err);
        return { success: false, error: err.message || 'An unexpected error occurred during the approval process.' };
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
        
        try {
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
        } catch (emailError) {
            console.warn(`Request ${request.id} was rejected, but the email failed.`, emailError);
        }
        
        revalidatePath(`/dashboard/requests/${request.id}`);
        revalidatePath('/dashboard');

        return { success: true };

    } catch (error) {
        const err = error as Error;
        console.error('Error rejecting request:', err);
        return { success: false, error: err.message || 'An unexpected error occurred during the rejection process.' };
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
        const err = error as Error;
        console.error('Error sending test email:', err);
        return { success: false, error: err.message || 'An unexpected error occurred while sending the test email.' };
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
        const err = error as Error;
        console.error('Error sending welcome email:', err);
        return { success: false, error: err.message || 'Failed to send welcome email.' };
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
        const err = error as Error;
        console.error('Error notifying QA testers:', err);
        return { success: false, error: err.message || 'Failed to send notification to QA testers.' };
    }
}


export async function notifyOnNewComment(request: CertificateRequest, comment: Omit<Comment, 'id'>) {
    try {
        let recipientEmail: string | undefined;
        let recipientName: string | undefined;

        if (comment.userRole === 'requester' && request.qaTesterId) {
            const userRef = doc(db!, 'users', request.qaTesterId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const qaTester = userSnap.data() as User;
                recipientEmail = qaTester.email;
                recipientName = qaTester.name;
            }
        } else if (comment.userRole === 'qa_tester' || comment.userRole === 'admin') {
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
        const err = error as Error;
        console.error('Error sending comment notification:', err);
        return { success: false, error: err.message || 'Failed to send comment notification.' };
    }
}

export async function approveLeaveRequestAndNotify(requestId: string, approverId: string, approverName: string) {
    try {
        const approverRef = doc(db!, 'users', approverId);
        const approverSnap = await getDoc(approverRef);

        if (!approverSnap.exists() || approverSnap.data()?.role !== 'admin') {
            throw new Error(`Action denied. The user '${approverName}' does not have admin privileges.`);
        }

        const leaveRequestRef = doc(db!, 'leaveRequests', requestId);
        await updateDoc(leaveRequestRef, {
            status: 'approved',
            reviewedById: approverId,
            reviewedByName: approverName,
            reviewedAt: serverTimestamp(),
        });
        
        const requestSnap = await getDoc(leaveRequestRef);
        const requestData = requestSnap.data() as LeaveRequest;
        
        const userRef = doc(db!, 'users', requestData.userId);
        const userSnap = await getDoc(userRef);
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

        revalidatePath('/dashboard/admin/leave');
        return { success: true };

    } catch (error) {
        const err = error as Error;
        console.error("Error in approveLeaveRequestAndNotify:", err);

        if (err.message.includes('permission-denied') || err.message.includes('Permissions')) {
             return { success: false, error: 'Database permission denied. Ensure the admin user has the correct "admin" role in their Firestore user document and that security rules are published.' };
        }
        
        return { success: false, error: err.message };
    }
}

export async function rejectLeaveRequestAndNotify(requestId: string, rejectorId: string, rejectorName: string, reason: string) {
    try {
        const rejectorRef = doc(db!, 'users', rejectorId);
        const rejectorSnap = await getDoc(rejectorRef);

        if (!rejectorSnap.exists() || rejectorSnap.data()?.role !== 'admin') {
             throw new Error(`Action denied. The user '${rejectorName}' does not have admin privileges.`);
        }

        const leaveRequestRef = doc(db!, 'leaveRequests', requestId);
        await updateDoc(leaveRequestRef, {
            status: 'rejected',
            rejectionReason: reason,
            reviewedById: rejectorId,
            reviewedByName: rejectorName,
            reviewedAt: serverTimestamp(),
        });

        const requestSnap = await getDoc(leaveRequestRef);
        const requestData = requestSnap.data() as LeaveRequest;
       
        const userRef = doc(db!, 'users', requestData.userId);
        const userSnap = await getDoc(userRef);
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

        revalidatePath('/dashboard/admin/leave');
        return { success: true };

    } catch (error) {
        const err = error as Error;
        console.error("Error in rejectLeaveRequestAndNotify:", err);
        return { success: false, error: err.message };
    }
}

export async function notifyAdminsOnLeaveRequest(request: Omit<LeaveRequest, 'id'> & {id: string}) {
    try {
        const adminQuery = query(collection(db!, 'users'), where('role', '==', 'admin'));
        const adminSnapshot = await getDocs(adminQuery);
        const adminEmails = adminSnapshot.docs.map(doc => (doc.data() as User).email);

        if(adminEmails.length === 0) {
             console.warn("New leave request submitted, but no admin users found to notify.");
             return { success: true, message: 'No admins to notify.' };
        }
        
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
        const err = error as Error;
        console.error('Error notifying admins of leave request:', err);
        return { success: false, error: err.message || 'Failed to send notification to admins.' };
    }
}

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
    } catch (emailError) {
        console.warn(`Bonus for ${bonus.userName} was issued, but the notification email failed to send.`, emailError);
        // Do not rethrow; the primary action (issuing bonus) succeeded.
        return { success: true, message: "Bonus issued, but notification failed." };
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
    } catch (emailError) {
        console.warn(`Infraction for ${infraction.userName} was issued, but the notification email failed to send.`, emailError);
        // Do not rethrow; the primary action (issuing infraction) succeeded.
        return { success: true, message: "Infraction issued, but notification failed." };
    }
}
