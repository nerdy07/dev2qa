'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, TriangleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Certificate } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const EchobitLogo = () => (
    <div className="flex items-center gap-3">
        <div className="w-16 h-16">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="50" fill="hsl(var(--accent))"/>
                <circle cx="50" cy="50" r="42" fill="#4B8678"/>
                <path d="M40 50C40 55.5228 44.4772 60 50 60C55.5228 60 60 55.5228 60 50C60 44.4772 55.5228 40 50 40C47.2386 40 44.7386 41.1193 42.9289 42.9289L39.0711 39.0711C41.9772 36.165 45.7893 34 50 34C58.8365 34 66 41.1635 66 50C66 58.8365 58.8365 66 50 66C41.1635 66 34 58.8365 34 50H40Z" fill="white"/>
                <path d="M50 56C53.3137 56 56 53.3137 56 50C56 46.6863 53.3137 44 50 44C48.4193 44 46.9696 44.6286 45.8787 45.7196L43.0503 42.8912C44.7196 41.2219 47.2196 40 50 40C55.5228 40 60 44.4772 60 50C60 55.5228 55.5228 60 50 60C44.4772 60 40 55.5228 40 50H43C43 53.3137 46.1634 56 50 56Z" fill="hsl(var(--gold))"/>
            </svg>
        </div>
        <div>
            <p className="font-semibold tracking-[0.2em] text-accent text-sm">ECHOBITSTECH</p>
            <p className="text-[10px] tracking-wider text-muted-foreground">GROUP OF COMPANIES</p>
        </div>
    </div>
);

const SignaturePlaceholder = () => (
    <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" className="h-12 w-40 text-foreground/80 mx-auto">
      <path d="M 10 40 C 20 20, 40 20, 50 40 C 60 60, 80 60, 90 40 C 100 20, 120 20, 130 40 S 150 60, 160 40" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" />
      <path d="M 70 35 C 80 45, 90 45, 100 35" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" />
      <path d="M 150 35 L 170 45" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const CertificateLoadingSkeleton = () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 font-serif">
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
    const [certificate, setCertificate] = React.useState<Certificate | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!id) return;

        const fetchCertificate = async () => {
            try {
                const docRef = doc(db!, 'certificates', id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCertificate({ id: docSnap.id, ...docSnap.data() } as Certificate);
                } else {
                    setError('Certificate not found.');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load certificate data.');
            } finally {
                setLoading(false);
            }
        };

        fetchCertificate();
    }, [id]);

    if (loading) {
        return <CertificateLoadingSkeleton />;
    }

    if (error || !certificate) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Alert variant="destructive" className="w-full max-w-md">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error || "Certificate could not be loaded."}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    const approvalDate = (certificate.approvalDate as any)?.toDate() || new Date();

    const handlePrint = () => {
        window.print();
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 font-serif print:bg-white print:p-0">
            <div className="w-full max-w-5xl flex justify-end mb-4 print:hidden">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Certificate
                </Button>
            </div>

            <div className="w-full max-w-5xl bg-white shadow-2xl print:shadow-none aspect-[1.414] p-8 relative">
                <div className="absolute inset-0 bg-repeat bg-[length:40px_40px] opacity-5" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23a0aec0\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")'}}></div>

                <div className="w-full h-full p-2 border-2 border-gold/50 relative">
                    <div className="w-full h-full flex flex-col p-10 border-2 border-accent/80 relative">
                        {/* Corner ornaments */}
                        <div className="absolute -top-1 -left-1 w-16 h-16 border-t-4 border-l-4 border-gold"></div>
                        <div className="absolute -top-1 -right-1 w-16 h-16 border-t-4 border-r-4 border-gold"></div>
                        <div className="absolute -bottom-1 -left-1 w-16 h-16 border-b-4 border-l-4 border-gold"></div>
                        <div className="absolute -bottom-1 -right-1 w-16 h-16 border-b-4 border-r-4 border-gold"></div>

                        <header className="flex justify-between items-start mb-10">
                            <EchobitLogo />
                            <div className='text-right'>
                                <p className='font-semibold text-muted-foreground'>Certificate ID</p>
                                <p className='text-xs font-mono text-foreground/80'>{certificate.id}</p>
                            </div>
                        </header>

                        <main className="flex-grow flex flex-col justify-center text-center">
                            
                            <div className="mb-8">
                                <p className="text-xl tracking-[0.3em] text-gold uppercase">Certificate of Achievement</p>
                                <h1 className="text-5xl font-bold tracking-tight text-foreground/90 uppercase mt-2">{certificate.associatedProject}</h1>
                            </div>
                            
                            <p className="text-muted-foreground text-lg">This certificate is proudly presented to</p>
                            <p className="text-4xl font-semibold my-2 text-primary">{certificate.requesterName}</p>
                            
                            <p className="text-muted-foreground mt-4 text-lg">for successfully completing the task</p>
                            <p className="text-2xl font-bold mt-2 uppercase tracking-wider">{certificate.taskTitle}</p>
                            

                            <div className="mt-16 w-full max-w-3xl mx-auto flex justify-between items-end">
                                <div className="text-center w-48">
                                    <SignaturePlaceholder />
                                    <div className="w-full h-px bg-border mx-auto mt-1"></div>
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1.5 font-semibold">{certificate.qaTesterName}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">QA Sign-off</p>
                                </div>
                                
                                <div className="text-center w-48">
                                <p className="font-semibold uppercase tracking-wider pb-1 text-lg">{format(approvalDate, 'do MMMM yyyy')}</p>
                                    <div className="w-full h-px bg-border mx-auto"></div>
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5">Date of Issue</p>
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-12">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider max-w-lg mx-auto">
                                This certificate confirms that the task/feature has been completed satisfactorily, meeting all specified requirements and quality assurance standards.
                                </p>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
