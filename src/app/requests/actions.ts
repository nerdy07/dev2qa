'use server';

import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendEmail } from '@/lib/email';
import type { CertificateRequest, User } from '@/lib/types';
import { revalidatePath } from 'next/cache';

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
        
        // Optionally send a rejection email here in the future
        
        revalidatePath(`/dashboard/requests/${request.id}`);
        revalidatePath('/dashboard');

        return { success: true };

    } catch (error) {
        console.error('Error rejecting request:', error);
        return { success: false, error: 'An unexpected error occurred during the rejection process.' };
    }
}
