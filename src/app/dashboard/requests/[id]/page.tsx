'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink, ThumbsDown, TriangleAlert, XCircle, Send, Star, User as UserIcon, Calendar, Hash, FolderKanban, Link2, Mail, Loader2 } from 'lucide-react';
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
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CertificateRequest, Comment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection } from '@/hooks/use-collection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { approveRequestAndSendEmail, rejectRequest, sendTestEmail } from '@/app/requests/actions';

export default function RequestDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [request, setRequest] = React.useState<CertificateRequest | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [newComment, setNewComment] = React.useState('');
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);

  const [submissionRating, setSubmissionRating] = React.useState(0);
  const [qaProcessRating, setQaProcessRating] = React.useState(0);
  const [qaProcessFeedback, setQaProcessFeedback] = React.useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);
  const [isSendingTest, setIsSendingTest] = React.useState(false);


  const commentsQuery = React.useMemo(() => {
    if (!id) return undefined;
    return query(collection(db!, 'comments'), where('requestId', '==', id as string), orderBy('createdAt', 'asc'));
  }, [id]);

  const { data: comments, loading: commentsLoading } = useCollection<Comment>(
    'comments',
    commentsQuery
  );

  React.useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
        try {
            const docRef = doc(db!, 'requests', id as string);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const reqData = { id: docSnap.id, ...docSnap.data() } as CertificateRequest
                setRequest(reqData);
                setSubmissionRating(reqData.submissionRating || 0);
                setQaProcessRating(reqData.qaProcessRating || 0);
                setQaProcessFeedback(reqData.qaProcessFeedback || '');
            } else {
                setError("Request not found.");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to fetch request details.");
        } finally {
            setLoading(false);
        }
    }

    fetchRequest();
  }, [id]);

  const handleApprove = async () => {
    if (!request || !user) return;
    
    const result = await approveRequestAndSendEmail(request, user);

    if (result.success) {
        toast({
            title: 'Request Approved',
            description: `Certificate for "${request.taskTitle}" has been generated.`,
        });
        router.push('/dashboard');
    } else {
        console.error("Error approving request: ", result.error);
        toast({ title: 'Approval Failed', variant: 'destructive', description: result.error });
    }
  }
  
  const handleReject = async () => {
    if (!request || !user) return;

    if (rejectionReason.trim().length < 10) {
        toast({
            title: 'Reason Required',
            description: 'Please provide a reason for rejection (at least 10 characters).',
            variant: 'destructive'
        });
        return;
    }

    const result = await rejectRequest(request, user, rejectionReason);

    if (result.success) {
        toast({
            title: 'Request Rejected',
            description: `Request for "${request.taskTitle}" has been rejected.`,
            variant: 'destructive'
        });
        router.push('/dashboard');
    } else {
        console.error("Error rejecting request: ", result.error);
        toast({ title: 'Rejection Failed', variant: 'destructive', description: result.error });
    }
  }

  const handlePostComment = async () => {
    if (!newComment.trim() || !user || !request) return;

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db!, 'comments'), {
        requestId: request.id,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        text: newComment,
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (error) {
      console.error("Error posting comment: ", error);
      toast({
        title: "Comment Failed",
        description: "Could not post your comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSetSubmissionRating = async (rating: number) => {
    if (!request || rating === request.submissionRating) return;
    try {
        const requestRef = doc(db!, 'requests', request.id);
        await updateDoc(requestRef, { submissionRating: rating });
        // Optimistically update local state
        setRequest(prev => prev ? {...prev, submissionRating: rating} : null);
        toast({
            title: 'Rating Submitted',
            description: 'Thank you for rating the submission quality.',
        });
    } catch (e) {
        console.error("Error setting submission rating: ", e);
        toast({ title: 'Rating Failed', variant: 'destructive', description: 'Could not save the rating.' });
    }
  };

  const handlePostQAFeedback = async () => {
    if (!request || !user || qaProcessRating === 0) {
        toast({ title: 'Rating Required', description: 'Please select a star rating before submitting.', variant: 'destructive' });
        return;
    }
    setIsSubmittingFeedback(true);
    try {
        const requestRef = doc(db!, 'requests', request.id);
        await updateDoc(requestRef, { 
            qaProcessRating: qaProcessRating,
            qaProcessFeedback: qaProcessFeedback 
        });
        // Optimistically update local state
        setRequest(prev => prev ? {...prev, qaProcessRating, qaProcessFeedback} : null);
        toast({
            title: 'Feedback Submitted',
            description: 'Thank you for your feedback!',
        });
    } catch (e) {
        console.error("Error submitting QA feedback: ", e);
        toast({ title: 'Feedback Failed', variant: 'destructive', description: 'Could not save your feedback.' });
    } finally {
        setIsSubmittingFeedback(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!user?.email) return;
    setIsSendingTest(true);
    const result = await sendTestEmail(user.email);
    if (result.success) {
      toast({
        title: 'Test Email Sent!',
        description: `An email has been sent to ${user.email}. Please check your inbox.`,
      });
    } else {
      toast({
        title: 'Test Failed',
        description: result.error,
        variant: 'destructive',
      });
    }
    setIsSendingTest(false);
  };

  const statusVariant = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
        <>
            <PageHeader title=""><Skeleton className="h-9 w-64" /></PageHeader>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

  const isActionable = user?.role === 'qa_tester' && request.status === 'pending';
  const createdAtDate = (request.createdAt as any)?.toDate() || new Date();

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
      <PageHeader title={request.taskTitle} />
      
      {request.status === 'rejected' && request.rejectionReason && (
        <Alert variant="destructive" className="mb-6">
            <ThumbsDown className="h-4 w-4" />
            <AlertTitle>Request Rejected by {request.qaTesterName}</AlertTitle>
            <AlertDescription>
                <strong>Reason:</strong> {request.rejectionReason}
            </AlertDescription>
        </Alert>
      )}

      {request.status === 'approved' && (
        <Alert className="mb-6 border-primary text-primary bg-primary/10">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle>Request Approved!</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
                <span>This request was approved by {request.qaTesterName}.</span>
                <Button variant="link" asChild className="p-0 h-auto text-primary">
                    <Link href={`/dashboard/certificates/${request.certificateId}`}>View Certificate</Link>
                </Button>
            </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Request Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                        <DetailItem icon={Hash} label="Status">
                            <Badge variant={statusVariant(request.status)} className="capitalize w-fit">{request.status}</Badge>
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
                        <Button onClick={handlePostComment} disabled={isSubmittingComment || !newComment.trim()}>
                            {isSubmittingComment ? "Posting..." : "Post Comment"}
                            <Send className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            {user?.role === 'admin' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Admin Tools</CardTitle>
                        <CardDescription>Actions available only to administrators.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleSendTestEmail} disabled={isSendingTest} className="w-full">
                            {isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                            {isSendingTest ? 'Sending...' : 'Send Test Email'}
                        </Button>
                    </CardContent>
                    <CardFooter>
                        <p className="text-xs text-muted-foreground">This will send a test email to your own email address ({user.email}) to verify the Mailgun configuration.</p>
                    </CardFooter>
                </Card>
            )}

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

            {/* QA Submission Rating */}
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

            {/* Requester QA Process Feedback */}
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
