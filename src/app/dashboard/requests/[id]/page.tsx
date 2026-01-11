
'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { BackButton } from '@/components/common/back-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink, ThumbsDown, TriangleAlert, XCircle, Send, Star, User as UserIcon, Calendar, Hash, FolderKanban, Link2, RefreshCw, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter as DialogFooterComponent,
    DialogClose
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, serverTimestamp, query, where, orderBy, getDocs, deleteField, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CertificateRequest, Comment, User } from '@/lib/types';
import { getStatusVariant, getStatusLabel, createStatusHistoryEntry, addStatusHistory } from '@/lib/request-workflow';
import { parseMentions, getMentionedUserIds, getMentionedUserEmails } from '@/lib/comment-mentions';
import { logRequestAction, logCommentAction, logStatusChange } from '@/lib/audit-log';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useDocument } from '@/hooks/use-collection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sendRequestApprovedEmail, sendRequestRejectedEmail, notifyOnNewComment, notifyOnNewRequest } from '@/app/requests/actions';
import { createInAppNotification } from '@/lib/notifications';
import { formatFriendlyId } from '@/lib/id-generator';
import { uploadFile } from '@/lib/storage';
import { Image as ImageIcon, X } from 'lucide-react';

export default function RequestDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, hasPermission } = useAuth();
    const { toast } = useToast();

    const { data: request, loading, error, setData: setRequest } = useDocument<CertificateRequest>('requests', id as string);

    const [rejectionReason, setRejectionReason] = React.useState('');
    const [newComment, setNewComment] = React.useState('');
    const [commentImage, setCommentImage] = React.useState<File | null>(null);
    const [commentImagePreview, setCommentImagePreview] = React.useState<string | null>(null);
    const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);

    const [submissionRating, setSubmissionRating] = React.useState(0);
    const [qaProcessRating, setQaProcessRating] = React.useState(0);
    const [qaProcessFeedback, setQaProcessFeedback] = React.useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);
    const [isResubmitting, setIsResubmitting] = React.useState(false);


    const commentsQuery = React.useMemo(() => {
        if (!id) return null;
        return query(collection(db!, 'comments'), where('requestId', '==', id as string), orderBy('createdAt', 'asc'));
    }, [id]);

    const { data: comments, loading: commentsLoading } = useCollection<Comment>(
        'comments',
        commentsQuery
    );

    // Fetch all users for @mention parsing
    const { data: allUsers } = useCollection<User>('users', null);

    React.useEffect(() => {
        if (request) {
            setSubmissionRating(request.submissionRating || 0);
            setQaProcessRating(request.qaProcessRating || 0);
            setQaProcessFeedback(request.qaProcessFeedback || '');
        }
    }, [request]);

    const handleApprove = async () => {
        if (!request || !user || !db) return;

        try {
            const currentStatus = request.status;
            const requestRequiresCertificate = request.certificateRequired !== false;
            const { generateShortId } = await import('@/lib/id-generator');
            const certShortId = requestRequiresCertificate ? generateShortId('certificate') : null;

            // Create status history entry
            const statusHistoryEntry = createStatusHistoryEntry({
                status: 'approved',
                userId: user.id,
                userName: user.name,
                previousStatus: currentStatus,
                reason: 'Request approved by QA tester',
            });
            const updatedStatusHistory = addStatusHistory(request.statusHistory, statusHistoryEntry);

            let certificateId: string | null = null;
            let issuedCertificate = false;

            await runTransaction(db, async (transaction) => {
                const requestRef = doc(db, 'requests', request.id);
                const requestSnap = await transaction.get(requestRef);

                if (!requestSnap.exists()) {
                    throw new Error('Request not found');
                }

                const requestData = requestSnap.data();

                if (requestData.status !== 'pending') {
                    throw new Error(`Request has already been ${requestData.status}`);
                }

                const shouldIssueCertificate = requestData.certificateRequired !== false;

                if (shouldIssueCertificate) {
                    const certCollection = collection(db, 'certificates');
                    const certDocRef = doc(certCollection);
                    certificateId = certDocRef.id;
                    issuedCertificate = true;

                    transaction.set(certDocRef, {
                        requestId: request.id,
                        requestShortId: requestData.shortId || formatFriendlyId(request.id, 'request'),
                        taskTitle: requestData.taskTitle,
                        associatedTeam: requestData.associatedTeam,
                        associatedProject: requestData.associatedProject,
                        requesterName: requestData.requesterName,
                        qaTesterName: user.name,
                        shortId: certShortId,
                        approvalDate: serverTimestamp(),
                        status: 'valid',
                    });

                    transaction.update(requestRef, {
                        status: 'approved',
                        qaTesterId: user.id,
                        qaTesterName: user.name,
                        updatedAt: serverTimestamp(),
                        certificateId: certificateId,
                        certificateStatus: 'valid',
                        statusHistory: updatedStatusHistory,
                    });
                } else {
                    transaction.update(requestRef, {
                        status: 'approved',
                        qaTesterId: user.id,
                        qaTesterName: user.name,
                        updatedAt: serverTimestamp(),
                        certificateStatus: 'not_required',
                        statusHistory: updatedStatusHistory,
                    });
                }
            });

            // Log approval action to audit log
            await logRequestAction({
                action: 'approve',
                requestId: request.id,
                requestTitle: request.taskTitle,
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                changes: [
                    { field: 'status', oldValue: currentStatus, newValue: 'approved' },
                ],
                metadata: {
                    certificateIssued: issuedCertificate,
                    certificateId: certificateId || undefined,
                },
            });

            // Log status change
            await logStatusChange({
                entityType: 'request',
                entityId: request.id,
                entityName: request.taskTitle,
                oldStatus: currentStatus,
                newStatus: 'approved',
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                reason: 'Request approved by QA tester',
            });

            if (issuedCertificate && certificateId && certShortId) {
                await createInAppNotification({
                    userId: request.requesterId,
                    type: 'general',
                    title: 'Certificate Issued',
                    message: `Your certificate request for "${request.taskTitle}" has been approved. Certificate ${certShortId} has been generated.`,
                    read: false,
                    data: {
                        requestId: request.id,
                        certificateId,
                    },
                });
            } else {
                await createInAppNotification({
                    userId: request.requesterId,
                    type: 'general',
                    title: 'QA Review Approved',
                    message: `QA has approved your request for "${request.taskTitle}". No completion certificate was required.`,
                    read: false,
                    data: {
                        requestId: request.id,
                    },
                });
            }

            // Send email notification asynchronously (don't block on failure)
            sendRequestApprovedEmail({
                recipientEmail: request.requesterEmail,
                requesterName: request.requesterName,
                taskTitle: request.taskTitle,
                requestId: request.id,
                requestShortId: request.shortId,
                certificateId: issuedCertificate ? certificateId ?? undefined : undefined,
                certificateShortId: issuedCertificate && certShortId ? certShortId : undefined,
                certificateRequired: issuedCertificate,
            }).catch((emailError) => {
                console.error('Email notification failed:', emailError);
                toast({
                    title: 'Email Failed',
                    description: emailError instanceof Error ? emailError.message : 'Failed to send notification email',
                    variant: 'destructive'
                });
            });

            toast({
                title: 'Request Approved',
                description: issuedCertificate && certShortId
                    ? `Certificate ${certShortId} for "${request.taskTitle}" has been generated.`
                    : `"${request.taskTitle}" has been approved without issuing a completion certificate.`,
            });

            // Refresh the page data instead of redirecting
            router.refresh();
            // Small delay to ensure state updates
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (e) {
            const error = e as Error;
            console.error("Error approving request: ", error);
            console.error("Error stack: ", error.stack);
            console.error("Error details: ", {
                message: error.message,
                name: error.name,
                cause: (error as any).cause,
            });
            toast({
                title: 'Approval Failed',
                variant: 'destructive',
                description: error.message || 'Failed to approve request. It may have already been processed by another user.'
            });
        }
    }

    const handleReject = async () => {
        if (!request || !user || !db) return;

        if (rejectionReason.trim().length < 10) {
            toast({
                title: 'Reason Required',
                description: 'Please provide a reason for rejection (at least 10 characters).',
                variant: 'destructive'
            });
            return;
        }

        try {
            const currentStatus = request.status;

            // Create status history entry
            const statusHistoryEntry = createStatusHistoryEntry({
                status: 'rejected',
                userId: user.id,
                userName: user.name,
                previousStatus: currentStatus,
                reason: rejectionReason,
            });
            const updatedStatusHistory = addStatusHistory(request.statusHistory, statusHistoryEntry);

            // Use transaction to prevent race conditions
            await runTransaction(db, async (transaction) => {
                const requestRef = doc(db, 'requests', request.id);
                const requestSnap = await transaction.get(requestRef);

                if (!requestSnap.exists()) {
                    throw new Error('Request not found');
                }

                const requestData = requestSnap.data();

                // Check if request is still pending (prevent race condition)
                if (requestData.status !== 'pending') {
                    throw new Error(`Request has already been ${requestData.status}`);
                }

                // Update request status atomically
                transaction.update(requestRef, {
                    status: 'rejected',
                    rejectionReason: rejectionReason,
                    qaTesterId: user.id,
                    qaTesterName: user.name,
                    updatedAt: serverTimestamp(),
                    statusHistory: updatedStatusHistory,
                });
            });

            // Log rejection action to audit log
            await logRequestAction({
                action: 'reject',
                requestId: request.id,
                requestTitle: request.taskTitle,
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                changes: [
                    { field: 'status', oldValue: currentStatus, newValue: 'rejected' },
                    { field: 'rejectionReason', oldValue: undefined, newValue: rejectionReason },
                ],
                metadata: {
                    reason: rejectionReason,
                },
            });

            // Log status change
            await logStatusChange({
                entityType: 'request',
                entityId: request.id,
                entityName: request.taskTitle,
                oldStatus: currentStatus,
                newStatus: 'rejected',
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                reason: rejectionReason,
            });

            // Create in-app notification for requester
            await createInAppNotification({
                userId: request.requesterId,
                type: 'general',
                title: 'Request Rejected',
                message: `Your certificate request for "${request.taskTitle}" has been rejected. Reason: ${rejectionReason}`,
                read: false,
                data: {
                    requestId: request.id,
                },
            });

            // Send email notification after successful transaction
            const emailResult = await sendRequestRejectedEmail({
                recipientEmail: request.requesterEmail,
                requesterName: request.requesterName,
                taskTitle: request.taskTitle,
                reason: rejectionReason,
                rejectorName: user.name,
                requestId: request.id,
                requestShortId: request.shortId,
            });

            toast({
                title: 'Request Rejected',
                description: `Request for "${request.taskTitle}" has been rejected.`,
                variant: 'destructive'
            });
            if (!emailResult.success) {
                toast({ title: 'Email Failed', description: emailResult.error, variant: 'destructive' });
            }
            router.push('/dashboard');
        } catch (e) {
            const error = e as Error;
            console.error("Error rejecting request: ", error);
            toast({
                title: 'Rejection Failed',
                variant: 'destructive',
                description: error.message || 'Failed to reject request. It may have already been processed by another user.'
            });
        }
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast({
                    title: 'Invalid File',
                    description: 'Please upload an image file.',
                    variant: 'destructive',
                });
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: 'File Too Large',
                    description: 'Image must be less than 5MB.',
                    variant: 'destructive',
                });
                return;
            }
            setCommentImage(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setCommentImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setCommentImage(null);
        setCommentImagePreview(null);
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !user || !request || !db) {
            toast({
                title: 'Comment Required',
                description: 'Please enter a comment before posting.',
                variant: 'destructive'
            });
            return;
        }

        setIsSubmittingComment(true);
        try {
            let imageUrl: string | undefined;

            // Upload image if provided
            if (commentImage) {
                const imagePath = `comments/${request.id}/${Date.now()}_${commentImage.name}`;
                imageUrl = await uploadFile(commentImage, imagePath);
            }

            // Parse @mentions from comment text
            const mentions = allUsers ? parseMentions(newComment, allUsers) : [];
            const mentionedUserIds = getMentionedUserIds(newComment, allUsers || []);
            const mentionedUserEmails = getMentionedUserEmails(newComment, allUsers || []);

            const commentData: any = {
                requestId: request.id,
                userId: user.id,
                userName: user.name,
                userRole: user.role,
                text: newComment,
                createdAt: serverTimestamp(),
            };

            // Add mentions if any
            if (mentions.length > 0) {
                commentData.mentions = mentions;
            }

            // Only add imageUrl if it exists (Firestore doesn't accept undefined)
            if (imageUrl) {
                commentData.imageUrl = imageUrl;
            }

            const commentRef = await addDoc(collection(db, 'comments'), commentData);
            const commentId = commentRef.id;

            // Log comment action to audit log
            await logCommentAction({
                action: 'comment',
                requestId: request.id,
                commentId,
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                metadata: {
                    hasMentions: mentions.length > 0,
                    mentionCount: mentions.length,
                },
            });

            // Determine who should be notified based on who commented
            // If requester commented, notify the QA tester (if assigned)
            // If QA/PM commented, notify the requester
            // Also notify any @mentioned users
            let recipientEmail: string | undefined;
            const notifiedUserIds = new Set<string>();

            // Check if current user is the requester (permission-based check)
            const isRequester = user.id === request.requesterId;

            // Check if current user has permission to approve requests (QA/PM)
            const canApproveRequests = hasPermission(ALL_PERMISSIONS.REQUESTS.APPROVE);

            if (isRequester && request.qaTesterId) {
                // Requester commented - notify the assigned QA tester
                const userRef = doc(db, 'users', request.qaTesterId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    recipientEmail = userSnap.data().email;
                    notifiedUserIds.add(request.qaTesterId);
                }
            } else if (canApproveRequests && request.requesterEmail) {
                // QA/PM commented - notify the requester
                recipientEmail = request.requesterEmail;
                notifiedUserIds.add(request.requesterId);
            }

            // Notify @mentioned users
            if (mentionedUserIds.length > 0 && allUsers) {
                for (const mentionedUserId of mentionedUserIds) {
                    if (mentionedUserId === user.id) continue; // Don't notify self

                    const mentionedUser = allUsers.find(u => u.id === mentionedUserId);
                    if (mentionedUser) {
                        // Create in-app notification for mentioned user
                        await createInAppNotification({
                            userId: mentionedUserId,
                            type: 'general',
                            title: 'You were mentioned',
                            message: `${user.name} mentioned you in a comment on "${request.taskTitle}": ${newComment.substring(0, 100)}${newComment.length > 100 ? '...' : ''}`,
                            read: false,
                            data: {
                                requestId: request.id,
                                commentId,
                            },
                        });

                        // Send email notification to mentioned user
                        if (mentionedUser.email && mentionedUser.email !== user.email) {
                            await notifyOnNewComment({
                                recipientEmail: mentionedUser.email,
                                commenterName: user.name,
                                taskTitle: request.taskTitle,
                                commentText: newComment,
                                requestId: request.id,
                                requestShortId: request.shortId,
                            });
                        }

                        // Log mention action
                        await logCommentAction({
                            action: 'mention',
                            requestId: request.id,
                            commentId,
                            userId: user.id,
                            userName: user.name,
                            userEmail: user.email,
                            metadata: {
                                mentionedUserId,
                                mentionedUserName: mentionedUser.name,
                            },
                        });
                    }
                }
            }

            if (recipientEmail && recipientEmail !== user.email && !notifiedUserIds.has(user.id)) {
                // Determine recipient user ID for in-app notification
                let recipientUserId: string | undefined;
                if (isRequester && request.qaTesterId) {
                    recipientUserId = request.qaTesterId;
                } else if (canApproveRequests) {
                    recipientUserId = request.requesterId;
                }

                // Create in-app notification if we have recipient user ID
                if (recipientUserId && !notifiedUserIds.has(recipientUserId)) {
                    await createInAppNotification({
                        userId: recipientUserId,
                        type: 'general',
                        title: 'New Comment',
                        message: `${user.name} commented on "${request.taskTitle}": ${newComment.substring(0, 100)}${newComment.length > 100 ? '...' : ''}`,
                        read: false,
                        data: {
                            requestId: request.id,
                        },
                    });
                }

                // Only send notification if recipient is different from commenter
                await notifyOnNewComment({
                    recipientEmail,
                    commenterName: user.name,
                    taskTitle: request.taskTitle,
                    commentText: newComment,
                    requestId: request.id,
                    requestShortId: request.shortId,
                });
            }

            setNewComment('');
            setCommentImage(null);
            setCommentImagePreview(null);
        } catch (err) {
            const error = err as Error;
            console.error("Error posting comment: ", error);
            toast({
                title: "Comment Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleSetSubmissionRating = async (rating: number) => {
        if (!request || rating === request.submissionRating || !db || !setRequest) return;
        try {
            const requestRef = doc(db, 'requests', request.id);
            await updateDoc(requestRef, { submissionRating: rating });
            setRequest({ ...request, submissionRating: rating });
            toast({
                title: 'Rating Submitted',
                description: 'Thank you for rating the submission quality.',
            });
        } catch (e) {
            const error = e as Error;
            console.error("Error setting submission rating: ", e);
            toast({ title: 'Rating Failed', variant: 'destructive', description: error.message });
        }
    };

    const handlePostQAFeedback = async () => {
        if (!request || !user || !db || !setRequest || qaProcessRating === 0) {
            toast({ title: 'Rating Required', description: 'Please select a star rating before submitting.', variant: 'destructive' });
            return;
        }
        setIsSubmittingFeedback(true);
        try {
            const requestRef = doc(db, 'requests', request.id);
            await updateDoc(requestRef, {
                qaProcessRating: qaProcessRating,
                qaProcessFeedback: qaProcessFeedback
            });
            setRequest({ ...request, qaProcessRating, qaProcessFeedback });
            toast({
                title: 'Feedback Submitted',
                description: 'Thank you for your feedback!',
            });
        } catch (e) {
            const error = e as Error;
            console.error("Error submitting QA feedback: ", e);
            toast({ title: 'Feedback Failed', variant: 'destructive', description: error.message });
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const handleResubmit = async () => {
        if (!request || !user || !db) return;

        setIsResubmitting(true);
        try {
            // Get QA testers to notify (including users with multiple roles)
            const qaUsersQuery = query(collection(db, 'users'), where('role', '==', 'qa_tester'));
            const qaSnapshot = await getDocs(qaUsersQuery);
            let qaUsers = qaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

            // Also get users with qa_tester in their roles array
            const allUsersQuery = query(collection(db, 'users'));
            const allUsersSnapshot = await getDocs(allUsersQuery);
            const allUsersWithQARole = allUsersSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as User))
                .filter(u => {
                    const roles = u.roles && u.roles.length > 0 ? u.roles : (u.role ? [u.role] : []);
                    return roles.includes('qa_tester') && !qaUsers.find(qa => qa.id === u.id);
                });

            qaUsers = [...qaUsers, ...allUsersWithQARole];
            const qaEmails = qaUsers.map(u => u.email);

            // Create status history entry for resubmission
            const statusHistoryEntry = createStatusHistoryEntry({
                status: 'pending',
                userId: user.id,
                userName: user.name,
                previousStatus: request.status,
                reason: 'Request resubmitted after rejection',
            });
            const updatedStatusHistory = addStatusHistory(request.statusHistory, statusHistoryEntry);

            // Update request status back to pending
            const requestRef = doc(db, 'requests', request.id);
            await updateDoc(requestRef, {
                status: 'pending',
                updatedAt: serverTimestamp(),
                statusHistory: updatedStatusHistory,
                // Store previous rejection reason for history
                previousRejectionReason: request.rejectionReason || undefined,
                // Clear previous QA tester info and current rejection reason
                qaTesterId: deleteField(),
                qaTesterName: deleteField(),
                rejectionReason: deleteField(),
            });

            // Log resubmission action to audit log
            await logRequestAction({
                action: 'revise',
                requestId: request.id,
                requestTitle: request.taskTitle,
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                changes: [
                    { field: 'status', oldValue: request.status, newValue: 'pending' },
                ],
                metadata: {
                    previousRejectionReason: request.rejectionReason,
                },
            });

            // Notify QA testers about the resubmission
            await notifyOnNewRequest({
                qaEmails: qaEmails,
                taskTitle: request.taskTitle,
                requesterName: request.requesterName,
                associatedProject: request.associatedProject,
                associatedTeam: request.associatedTeam,
                certificateRequired: request.certificateRequired !== false,
            });

            // Update local state
            setRequest({
                ...request,
                status: 'pending',
                qaTesterId: undefined,
                qaTesterName: undefined,
                rejectionReason: undefined,
            });

            toast({
                title: 'Request Resubmitted',
                description: `Your request "${request.taskTitle}" has been resubmitted and sent to QA testers for review.`,
            });

        } catch (e) {
            const error = e as Error;
            console.error("Error resubmitting request: ", e);
            toast({
                title: 'Resubmission Failed',
                variant: 'destructive',
                description: error.message,
            });
        } finally {
            setIsResubmitting(false);
        }
    };


    const statusVariant = (status: CertificateRequest['status']) => {
        return getStatusVariant(status);
    };

    if (loading) {
        return (
            <>
                <PageHeader title=""><Skeleton className="h-9 w-64" /></PageHeader>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" suppressHydrationWarning>
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-7 w-1/3" />
                                <Skeleton className="h-5 w-1/4" />
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="flex flex-col gap-2">
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-5 w-32" />
                                        </div>
                                    ))}
                                </div>
                                <Separator />
                                <div>
                                    <Skeleton className="h-6 w-24 mb-2" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader><Skeleton className="h-7 w-32" /></CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </>
        )
    }

    if (error || !request) {
        return <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error || "Request not found."}</AlertDescription>
        </Alert>;
    }

    const isActionable = hasPermission(ALL_PERMISSIONS.REQUESTS.APPROVE) && request.status === 'pending';
    const createdAtDate = (request.createdAt as any)?.toDate() || new Date();
    const isCertificateRequired = request.certificateRequired !== false;
    const hasCertificate = request.certificateStatus === 'valid' && !!request.certificateId;
    const certificateNotRequired = request.certificateStatus === 'not_required' || !isCertificateRequired;

    const StarRating = ({ rating, setRating, disabled = false }: { rating: number, setRating?: (r: number) => void, disabled?: boolean }) => {
        return (
            <div className="flex items-center gap-1">
                {[...Array(5)].map((_, index) => {
                    const starValue = index + 1;
                    return (
                        <Star
                            key={starValue}
                            className={cn(
                                'h-6 w-6 transition-colors',
                                starValue <= rating ? 'text-gold fill-gold' : 'text-muted-foreground',
                                !disabled && 'cursor-pointer hover:text-gold'
                            )}
                            onClick={() => !disabled && setRating?.(starValue)}
                        />
                    );
                })}
            </div>
        );
    };

    const DetailItem = ({ icon: Icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) => (
        <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-medium">{children}</span>
            </div>
        </div>
    )


    return (
        <>
            <PageHeader title={request.taskTitle}>
                <BackButton />
            </PageHeader>

            {request.status === 'rejected' && request.rejectionReason && (
                <Alert variant="destructive" className="mb-6">
                    <ThumbsDown className="h-4 w-4" />
                    <AlertTitle>Request Rejected by {request.qaTesterName}</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                        <div>
                            <strong>Reason:</strong> {request.rejectionReason}
                        </div>
                        {user?.id === request.requesterId && (
                            <Button
                                onClick={handleResubmit}
                                disabled={isResubmitting}
                                size="sm"
                                className="ml-4"
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${isResubmitting ? 'animate-spin' : ''}`} />
                                {isResubmitting ? 'Resubmitting...' : 'Resubmit Request'}
                            </Button>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {request.status === 'approved' && (
                <Alert className="mb-6 border-primary text-primary bg-primary/10">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <AlertTitle>Request Approved!</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                        <span>
                            {certificateNotRequired
                                ? `This request was approved by ${request.qaTesterName} without issuing a completion certificate.`
                                : `This request was approved by ${request.qaTesterName}.`}
                        </span>
                        {hasCertificate && (
                            <Button variant="link" asChild className="p-0 h-auto text-primary">
                                <Link href={`/dashboard/certificates/${request.certificateId}`}>View Certificate</Link>
                            </Button>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" suppressHydrationWarning>
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Request Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                                <DetailItem icon={Hash} label="Request ID">
                                    {request.shortId || formatFriendlyId(request.id, 'request')}
                                </DetailItem>
                                <DetailItem icon={Hash} label="Status">
                                    <Badge variant={statusVariant(request.status)} className="capitalize w-fit">{getStatusLabel(request.status)}</Badge>
                                </DetailItem>
                                <DetailItem icon={Info} label="Review Type">
                                    <Badge variant={isCertificateRequired ? 'outline' : 'secondary'} className="w-fit text-xs font-medium">
                                        {isCertificateRequired ? 'Certificate Required' : 'QA Sign-off'}
                                    </Badge>
                                </DetailItem>
                                <DetailItem icon={UserIcon} label="Requester">
                                    {request.requesterName}
                                </DetailItem>
                                <DetailItem icon={Calendar} label="Submitted">
                                    {format(createdAtDate, 'PPP p')} ({formatDistanceToNowStrict(createdAtDate, { addSuffix: true })})
                                </DetailItem>
                                <DetailItem icon={FolderKanban} label="Project">
                                    {request.associatedProject}
                                </DetailItem>
                                <DetailItem icon={UserIcon} label="Team">
                                    {request.associatedTeam}
                                </DetailItem>
                                {request.taskLink && (
                                    <DetailItem icon={Link2} label="Task Link">
                                        <a
                                            href={request.taskLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-primary hover:underline flex items-center gap-1"
                                        >
                                            View Task <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </DetailItem>
                                )}
                            </div>
                            <Separator className="my-6" />
                            <div>
                                <h4 className="font-semibold mb-2 text-base">Description</h4>
                                <p className="text-muted-foreground whitespace-pre-wrap">{request.description}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Comments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {commentsLoading && <p className="text-sm text-muted-foreground">Loading comments...</p>}
                                {!commentsLoading && comments && comments.length > 0 ? (
                                    comments.map(comment => (
                                        <div key={comment.id} className="flex gap-4">
                                            <Avatar>
                                                <AvatarFallback>{comment.userName?.charAt(0) || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold">{comment.userName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {comment.createdAt ? formatDistanceToNowStrict(comment.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                                                    </p>
                                                    <Badge variant="secondary" className='capitalize text-xs'>{comment.userRole.replace('_', ' ')}</Badge>
                                                </div>
                                                <p className="text-muted-foreground whitespace-pre-wrap mt-1">{comment.text}</p>
                                                {comment.imageUrl && (
                                                    <div className="mt-2">
                                                        <a
                                                            href={comment.imageUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-block"
                                                        >
                                                            <img
                                                                src={comment.imageUrl}
                                                                alt="Comment attachment"
                                                                className="max-w-full max-h-64 rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                                                            />
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    !commentsLoading && <p className="text-sm text-muted-foreground">No comments yet. Start the conversation!</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-4 items-start border-t pt-6">
                            <Avatar>
                                <AvatarImage src={user?.photoURL} />
                                <AvatarFallback>{user?.name?.[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                                <Textarea
                                    placeholder="Add a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="min-h-[80px]"
                                />
                                {commentImagePreview && (
                                    <div className="relative inline-block">
                                        <img
                                            src={commentImagePreview}
                                            alt="Preview"
                                            className="max-h-32 rounded-md border"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                            onClick={handleRemoveImage}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <span className="cursor-pointer">
                                                <ImageIcon className="h-4 w-4 mr-2" />
                                                Attach Image
                                            </span>
                                        </Button>
                                    </label>
                                    <Button
                                        onClick={handlePostComment}
                                        disabled={isSubmittingComment || !newComment.trim()}
                                    >
                                        {isSubmittingComment ? "Posting..." : "Post Comment"}
                                        <Send className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">

                    {isActionable && (
                        <Card>
                            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive" className="w-full">
                                            <XCircle className="mr-2 h-4 w-4" /> Reject Request
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Reason for Rejection</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <Label htmlFor="rejection-reason">Provide a mandatory reason for rejecting this request.</Label>
                                            <Textarea
                                                id="rejection-reason"
                                                placeholder="e.g., Testing failed on mobile devices..."
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                className="min-h-[100px]"
                                            />
                                        </div>
                                        <DialogFooterComponent>
                                            <DialogClose asChild>
                                                <Button type="button" variant="outline">Cancel</Button>
                                            </DialogClose>
                                            <Button type="submit" variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
                                        </DialogFooterComponent>
                                    </DialogContent>
                                </Dialog>

                                <Button onClick={handleApprove} className="w-full">
                                    <CheckCircle className="mr-2 h-4 w-4" /> Approve Request
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {user?.id === request.qaTesterId && request.status === 'approved' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Rate Submission Quality</CardTitle>
                                <CardDescription>Optionally, rate the clarity and completeness of this request to help the requester improve.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {request.submissionRating ? (
                                    <div>
                                        <p className="text-sm font-medium mb-2">You rated this submission:</p>
                                        <StarRating rating={request.submissionRating} disabled />
                                    </div>
                                ) : (
                                    <StarRating rating={submissionRating} setRating={handleSetSubmissionRating} />
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {user?.id === request.requesterId && request.status !== 'pending' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Feedback on the QA Process</CardTitle>
                                <CardDescription>Your anonymous feedback helps our QA team improve.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {request.qaProcessRating ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium mb-2">Your rating:</p>
                                            <StarRating rating={request.qaProcessRating} disabled />
                                        </div>
                                        {request.qaProcessFeedback && (
                                            <div>
                                                <p className="text-sm font-medium mb-2">Your feedback:</p>
                                                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md whitespace-pre-wrap">{request.qaProcessFeedback}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <Label>How would you rate the review process?</Label>
                                            <StarRating rating={qaProcessRating} setRating={setQaProcessRating} />
                                        </div>
                                        <div>
                                            <Label htmlFor="qa-feedback-comment">Any additional comments? (Optional)</Label>
                                            <Textarea
                                                id="qa-feedback-comment"
                                                placeholder="e.g., The rejection reason was very clear, thank you!"
                                                value={qaProcessFeedback}
                                                onChange={(e) => setQaProcessFeedback(e.target.value)}
                                                className="min-h-[100px]"
                                            />
                                        </div>
                                        <Button onClick={handlePostQAFeedback} disabled={isSubmittingFeedback || qaProcessRating === 0}>
                                            {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                                        </Button>
                                        {qaProcessRating === 0 && <p className="text-xs text-muted-foreground">Please provide a star rating to submit feedback.</p>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}
