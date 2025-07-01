'use client';

import { useParams } from 'next/navigation';
import { mockCertificates } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const EchobitsLogo = () => (
    <div className="flex items-center gap-4">
        <div className="w-16 h-16 text-accent">
            <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Arcs */}
                <g clipPath="url(#clip_arcs_echobits)">
                    <circle cx="35" cy="50" r="15" stroke="#D4AF37" strokeWidth="3"/>
                    <circle cx="35" cy="50" r="25" stroke="currentColor" strokeWidth="3"/>
                    <circle cx="35" cy="50" r="35" stroke="currentColor" strokeWidth="3"/>
                    <circle cx="35" cy="50" r="45" stroke="currentColor" strokeWidth="3"/>
                </g>

                {/* E shape */}
                <path d="M110 50 C 110 74.85 89.85 95 65 95 C 40.15 95 20 74.85 20 50 C 20 25.15 40.15 5 65 5 C 89.85 5 110 25.15 110 50 Z" fill="currentColor"/>
                <rect x="20" y="47" width="90" height="6" fill="white"/>
                <rect x="65" y="5" width="45" height="90" fill="white"/>

                <defs>
                    <clipPath id="clip_arcs_echobits">
                        <rect x="0" y="0" width="50" height="100" />
                    </clipPath>
                </defs>
            </svg>
        </div>
        <div className="flex flex-col">
            <span className="font-bold text-lg tracking-widest text-foreground/80">ECHOBITSTECH</span>
            <span className="text-xs tracking-wider text-muted-foreground">PROPAGATING BITS THROUGH TECHNOLOGICAL ECHOES</span>
        </div>
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4 font-serif print:bg-white print:p-0">
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
                    
                    <div className="p-8 border-2 border-gray-300 min-h-[700px] flex flex-col">
                        <div className="relative z-10 flex flex-col h-full">
                            {/* Header */}
                            <header className="flex justify-center mb-8">
                                <EchobitsLogo />
                            </header>
                            
                            {/* Title */}
                            <div className="text-center my-8">
                                <h2 className="text-xl font-medium uppercase tracking-[0.2em] text-gold">Certificate of Completion</h2>
                                <Separator className="max-w-xs mx-auto my-4 bg-gray-300" />
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
                                    <Separator className="my-2 bg-gray-400" />
                                    <p className="text-sm text-muted-foreground uppercase tracking-wider">QA Sign-off</p>
                                </div>
                                <div className="text-center">
                                    <p className="font-['Tangerine'] text-4xl text-accent">{format(certificate.approvalDate, 'MMMM do, yyyy')}</p>
                                    <Separator className="my-2 bg-gray-400" />
                                    <p className="text-sm text-muted-foreground uppercase tracking-wider">Date of Issue</p>
                                </div>
                            </div>

                            <div className="flex-grow" />

                            {/* Footer */}
                            <footer className="mt-12 text-center">
                                <p className="text-xs text-muted-foreground max-w-lg mx-auto">
                                    This certificate verifies that the aforementioned task was completed and tested according to the standards set by ECHOBITSTECH.
                                </p>
                            </footer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
