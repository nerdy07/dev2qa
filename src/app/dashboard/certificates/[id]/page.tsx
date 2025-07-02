'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, TriangleAlert, ShieldAlert, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Certificate } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDocument } from '@/hooks/use-collection';
import { useAuth } from '@/providers/auth-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const EchobitLogo = () => (
    <div className="flex items-center gap-3 font-sans">
        <div className="w-9 h-9">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="50" fill="hsl(var(--accent))" />
                <path d="M75 50C75 63.8071 63.8071 75 50 75C36.1929 75 25 63.8071 25 50C25 36.1929 36.1929 25 50 25" stroke="white" strokeWidth="12" strokeLinecap="round" />
            </svg>
        </div>
        <p className="font-semibold tracking-[0.2em] text-accent">ECHOBITSTECH</p>
    </div>
);

const SignaturePlaceholder = () => (
    <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" className="h-12 w-48 text-foreground/80 mx-auto">
        <path d="M 10 40 C 30 10, 50 15, 70 40 C 90 65, 110 60, 130 40 C 150 20, 170 25, 190 50" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

const CertificateFrame = () => (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 1191 842">
        <defs>
            <pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <path d="M0 0h10v20H0z" fill="hsla(var(--accent), 0.05)" />
            </pattern>
        </defs>
        <rect width="1191" height="842" fill="url(#p)" />
        <rect x="25.5" y="25.5" width="1140" height="791" stroke="hsl(var(--gold))" strokeWidth="1"/>
        <rect x="29.5" y="29.5" width="1132" height="783" stroke="hsl(var(--accent))" strokeWidth="3"/>
        <rect x="35.5" y="35.5" width="1120" height="771" stroke="hsl(var(--gold))" strokeWidth="1"/>
        <g fill="hsl(var(--accent))">
            <path d="M25.5 55.5 L55.5 25.5 L48.5 25.5 L25.5 48.5 z" />
            <path d="M1165.5 55.5 L1135.5 25.5 L1142.5 25.5 L1165.5 48.5 z" />
            <path d="M25.5 786.5 L55.5 816.5 L48.5 816.5 L25.5 793.5 z" />
            <path d="M1165.5 786.5 L1135.5 816.5 L1142.5 816.5 L1165.5 793.5 z" />
        </g>
    </svg>
);

const QualitySeal = () => (
    <svg className="h-32 w-32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <path id="circlePath" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
        </defs>
        <g className="text-accent/80">
            <circle cx="50" cy="50" r="50" fill="hsl(var(--gold), 0.2)" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <g className="text-accent/90 font-sans font-semibold text-[9px] tracking-wider" fill="currentColor">
                <text><textPath href="#circlePath" startOffset="50%" textAnchor="middle">ECHOBITSTECH • QUALITY ASSURANCE</textPath></text>
            </g>
            <path d="M50 25 l5 10 l10 5 l-10 5 l-5 10 l-5 -10 l-10 -5 l10 -5 Z" fill="hsl(var(--gold))" stroke="currentColor" strokeWidth="1" />
        </g>
    </svg>
);


const CertificateLoadingSkeleton = () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-5xl bg-white shadow-2xl aspect-[1.414] p-8">
            <div className="w-full h-full p-2 border-2 border-border/20">
                <div className="w-full h-full flex flex-col p-10 border border-border/60">
                    <header className="flex justify-between items-center mb-10"><Skeleton className="h-12 w-48" /><Skeleton className="h-6 w-32" /></header>
                    <main className="flex-grow flex flex-col justify-center text-center">
                        <div className="mb-8"><Skeleton className="h-6 w-1/3 mx-auto" /><Skeleton className="h-12 w-2/3 mx-auto mt-2" /></div>
                        <div className="space-y-6 my-8">
                            <Skeleton className="h-5 w-1/4 mx-auto" />
                            <Skeleton className="h-10 w-1/2 mx-auto" />
                            <Skeleton className="h-5 w-1/4 mx-auto mt-4" />
                            <Skeleton className="h-8 w-1/3 mx-auto" />
                        </div>
                        <div className="grid grid-cols-3 gap-8 my-10 items-end"><div className="flex flex-col items-center gap-2"><Skeleton className="h-12 w-32" /><Skeleton className="h-4 w-24" /></div><div className="flex flex-col items-center"><Skeleton className="h-20 w-20 rounded-full" /></div><div className="flex flex-col items-center gap-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-24" /></div></div>
                        <div className="mt-auto pt-4"><Skeleton className="h-12 w-full max-w-md mx-auto" /></div>
                    </main>
                </div>
            </div>
        </div>
    </div>
);


export default function CertificatePage() {
    const { id } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const { data: certificate, loading, error } = useDocument<Certificate>('certificates', id as string);

    const [isRevokeDialogOpen, setIsRevokeDialogOpen] = React.useState(false);
    const [revocationReason, setRevocationReason] = React.useState('');

    const handlePrint = () => {
        window.print();
    }

    const handleRevoke = async () => {
        if (!certificate || !user) return;

        if (revocationReason.trim().length < 10) {
            toast({
                title: 'Reason Required',
                description: 'Please provide a reason for revocation (at least 10 characters).',
                variant: 'destructive'
            });
            return;
        }

        try {
            const certRef = doc(db!, 'certificates', certificate.id);
            await updateDoc(certRef, {
                status: 'revoked',
                revocationReason: revocationReason,
                revocationDate: serverTimestamp(),
            });

            const requestRef = doc(db!, 'requests', certificate.requestId);
            await updateDoc(requestRef, {
                certificateStatus: 'revoked',
            });

            toast({
                title: 'Certificate Revoked',
                description: 'This certificate has been successfully revoked.',
            });
            setIsRevokeDialogOpen(false);
            setRevocationReason('');
        } catch(e) {
            console.error("Error revoking certificate:", e);
            toast({ title: 'Revocation Failed', variant: 'destructive', description: 'Could not update the certificate status.' });
        }
    }

    if (loading) {
        return <CertificateLoadingSkeleton />;
    }

    if (error || !certificate) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Alert variant="destructive" className="w-full max-w-md">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error?.message || "Certificate could not be loaded."}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    const approvalDate = (certificate.approvalDate as any)?.toDate() || new Date();
    const revocationDate = (certificate.revocationDate as any)?.toDate();
    const isRevoked = certificate.status === 'revoked';
    const canRevoke = user?.role === 'admin' || user?.role === 'qa_tester';

    const RevokedStamp = () => (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 backdrop-blur-[2px] z-20 print:bg-transparent print:backdrop-blur-none">
            <div className="text-center transform -rotate-[20deg]">
                <div className="text-8xl font-black text-destructive/80 print:text-destructive/60 border-4 border-destructive/80 print:border-destructive/60 px-8 py-4 uppercase">
                    Revoked
                </div>
                <p className="text-destructive/90 print:text-destructive/70 font-semibold mt-2">on {format(revocationDate!, 'do MMMM yyyy')}</p>
                <p className="text-destructive/80 print:text-destructive/60 text-sm mt-1 max-w-sm">Reason: {certificate.revocationReason}</p>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-accent/90 p-4 font-sans print:bg-white print:p-0">

            <div className="w-full max-w-5xl flex justify-end gap-2 mb-4 print:hidden z-10">
                {canRevoke && !isRevoked && (
                    <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive">
                                <XCircle className="mr-2 h-4 w-4" /> Revoke Certificate
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Revoke Certificate</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Label htmlFor="revocation-reason">Provide a mandatory reason for revoking this certificate.</Label>
                                <Textarea 
                                    id="revocation-reason"
                                    placeholder="e.g., Critical bug found post-approval..."
                                    value={revocationReason}
                                    onChange={(e) => setRevocationReason(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                <Button type="button" variant="destructive" onClick={handleRevoke}>Confirm Revocation</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
                {!isRevoked && (
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Print Certificate
                    </Button>
                )}
            </div>

            <div className="w-full max-w-5xl bg-white shadow-2xl print:shadow-none aspect-[1.414/1] p-4 relative">
                <div className="w-full h-full relative font-serif text-accent/90">
                    <CertificateFrame />
                    
                    {isRevoked && <RevokedStamp />}

                    <div className="absolute inset-0 flex flex-col p-16 z-10">
                        <header className="flex justify-between items-start mb-8">
                            <EchobitLogo />
                            <div className="text-right font-sans">
                                <p className="font-semibold text-lg">{format(approvalDate, 'MMMM do, yyyy')}</p>
                                <p className="text-xs text-muted-foreground">Date of Issue</p>
                            </div>
                        </header>

                        <main className="flex-grow flex flex-col items-center justify-center text-center">
                            
                            <p className="font-sans text-2xl font-light tracking-[0.3em] text-gold uppercase">Certificate of Completion</p>
                            <div className="w-24 h-px bg-gold/50 my-6 mx-auto"></div>
                            
                            <p className="font-sans text-lg">This certificate is proudly presented to</p>
                            <p className="text-5xl font-serif font-bold mt-2 tracking-wide">{certificate.requesterName}</p>
                            
                            <p className="font-sans text-lg mt-10">for successfully completing the task</p>
                            <p className="text-3xl font-serif font-semibold mt-2 tracking-wide">{certificate.taskTitle}</p>
                            
                            <p className="font-sans text-lg mt-10">for the project</p>
                            <p className="text-3xl font-serif font-semibold mt-2 tracking-wide">{certificate.associatedProject}</p>
                            
                            <p className="text-xs text-muted-foreground font-sans max-w-lg mx-auto mt-12">
                                This document certifies that the aforementioned task/feature has been reviewed and approved by the Quality Assurance department, meeting all required specifications and standards of excellence.
                            </p>
                        </main>

                        <footer className="mt-auto flex justify-between items-end font-sans">
                            <div className="text-center w-60">
                                <SignaturePlaceholder />
                                <div className="w-full h-px bg-border/50 mx-auto mt-1"></div>
                                <p className="text-sm text-muted-foreground mt-2">{certificate.qaTesterName}, QA Sign-off</p>
                            </div>
                            
                            <QualitySeal />

                            <div className="text-center w-60">
                                <div className="font-semibold text-lg pb-1">ID: {certificate.id.substring(0, 10)}...</div>
                                <div className="w-full h-px bg-border/50 mx-auto mt-1"></div>
                                <p className="text-sm text-muted-foreground mt-2">Certificate ID</p>
                            </div>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
}
