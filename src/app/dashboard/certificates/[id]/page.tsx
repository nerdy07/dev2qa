'use client';

import { useParams } from 'next/navigation';
import { mockCertificates } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

// Reverted to the text-based logo from the certificate redesign
const EchobitsLogo = () => (
    <div className="flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold tracking-[0.3em] text-accent">ECHOBITS</h1>
        <p className="text-xs tracking-widest text-muted-foreground">TECHNOLOGY GROUP</p>
    </div>
);


export default function CertificatePage() {
    const { id } = useParams();
    const certificate = mockCertificates.find((c) => c.id === id);

    if (!certificate) {
        return <div>Certificate not found.</div>
    }

    const handlePrint = () => {
        window.print();
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 font-serif print:bg-white print:p-0">
            <div className="w-full max-w-5xl flex justify-end mb-4 print:hidden">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Certificate
                </Button>
            </div>

            <div className="w-full max-w-5xl bg-white shadow-2xl print:shadow-none">
                <div className="relative overflow-hidden p-2">
                    <div className="absolute inset-0 border-8 border-accent" />
                    <div className="absolute top-0 left-0 w-16 h-16 border-r-8 border-b-8 border-gold" />
                    <div className="absolute top-0 right-0 w-16 h-16 border-l-8 border-b-8 border-gold" />
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-r-8 border-t-8 border-gold" />
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-l-8 border-t-8 border-gold" />
                    
                    <div className="p-8 border-2 border-border min-h-[700px] flex flex-col">
                        <div className="relative z-10 flex flex-col h-full">
                            {/* Header */}
                            <header className="flex justify-center mb-8">
                                <EchobitsLogo />
                            </header>
                            
                            {/* Title */}
                            <div className="text-center my-8">
                                <h2 className="text-xl font-medium uppercase tracking-[0.2em] text-gold">Certificate of Completion</h2>
                                <Separator className="max-w-xs mx-auto my-4 bg-border" />
                                <p className="text-sm uppercase tracking-widest text-muted-foreground">This certificate is awarded to</p>
                            </div>
                            
                            <div className="text-center my-8">
                                <p className="text-5xl font-['Tangerine'] font-bold text-accent">{certificate.requesterName}</p>
                            </div>

                            <div className="text-center my-4 max-w-2xl mx-auto">
                                <p className="text-muted-foreground">for successfully completing the task</p>
                                <p className="text-2xl font-semibold mt-2 text-foreground/90">{certificate.taskTitle}</p>
                                <p className="text-muted-foreground mt-1">within the project "{certificate.associatedProject}"</p>
                            </div>


                            {/* Signatures Area */}
                            <div className="grid grid-cols-2 gap-16 mt-16 pt-8 max-w-2xl mx-auto w-full">
                                <div className="text-center">
                                    <p className="font-['Tangerine'] text-4xl text-accent">{certificate.qaTesterName}</p>
                                    <Separator className="my-2 bg-border" />
                                    <p className="text-sm text-muted-foreground uppercase tracking-wider">QA Sign-off</p>
                                </div>
                                <div className="text-center">
                                    <p className="font-['Tangerine'] text-4xl text-accent">{format(certificate.approvalDate, 'MMMM do, yyyy')}</p>
                                    <Separator className="my-2 bg-border" />
                                    <p className="text-sm text-muted-foreground uppercase tracking-wider">Date of Issue</p>
                                </div>
                            </div>

                            <div className="flex-grow" />

                            {/* Footer */}
                            <footer className="mt-12 text-center">
                                <p className="text-xs text-muted-foreground max-w-lg mx-auto">
                                    This certificate verifies that the aforementioned task was completed and tested according to the standards set by ECHOBITS TECHNOLOGY GROUP.
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">Certificate ID: {certificate.id}</p>
                            </footer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
