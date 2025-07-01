'use client';

import { useParams } from 'next/navigation';
import { mockCertificates } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const EchobitsLogo = () => (
    <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full border-2 border-gray-700 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 8C16 11.3137 13.3137 14 10 14" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 12C12 13.1046 11.1046 14 10 14" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
                <path d="M19 12C19 16.9706 14.9706 21 10 21C5.02944 21 1 16.9706 1 12C1 7.02944 5.02944 3 10 3" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
            </svg>
        </div>
        <div className="flex flex-col">
            <span className="font-bold text-xs tracking-widest text-gray-700">ECHOBITSTECH</span>
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
                    <div className="absolute top-0 left-0 w-[20px] h-full bg-accent" />
                    <div className="absolute top-0 right-0 w-[20px] h-full bg-accent" />
                    <div className="absolute -top-16 -right-16 w-64 h-64 bg-chart-5/40 transform rotate-45" />
                    <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-chart-5/40 transform rotate-45" />

                    <div className="p-1 border border-gray-300">
                        <div className="p-8 border-2 border-gray-400 min-h-[700px] flex flex-col">
                            <div className="relative z-10 flex flex-col h-full">
                                {/* Header */}
                                <header className="flex justify-start">
                                    <EchobitsLogo />
                                </header>
                                
                                {/* Title */}
                                <div className="text-center my-8">
                                    <h2 className="text-xl font-medium uppercase tracking-[0.2em] text-chart-5">Completion</h2>
                                    <h1 className="text-5xl font-bold uppercase tracking-wider text-foreground/80 mt-1">Certificate</h1>
                                </div>
                                
                                <div className="space-y-8 text-center my-8">
                                    <div>
                                        <p className="text-sm uppercase tracking-widest text-muted-foreground">Product Name</p>
                                        <p className="text-2xl font-medium mt-2">{certificate.associatedProject}</p>
                                    </div>
                                    <Separator className="max-w-xs mx-auto" />
                                    <div>
                                        <p className="text-sm uppercase tracking-widest text-muted-foreground">Task/Feature</p>
                                        <p className="text-2xl font-medium mt-2">{certificate.taskTitle}</p>
                                    </div>
                                </div>

                                {/* Signatures Area */}
                                <div className="grid grid-cols-3 gap-4 mt-8 pt-8 text-center">
                                    <div>
                                        <p className="font-semibold text-base">{format(certificate.approvalDate, 'd MMM yyyy').toUpperCase()}</p>
                                        <Separator className="my-2 bg-gray-400" />
                                        <p className="text-sm text-muted-foreground">Completion Date</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-base">{certificate.qaTesterName}</p>
                                        <Separator className="my-2 bg-gray-400" />
                                        <p className="text-sm text-muted-foreground">QA Sign-off</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-base">{certificate.requesterName}</p>
                                        <Separator className="my-2 bg-gray-400" />
                                        <p className="text-sm text-muted-foreground">Developer/Team</p>
                                    </div>
                                </div>

                                <div className="flex-grow" />

                                {/* Footer */}
                                <footer className="mt-12">
                                    <p className="text-center text-xs text-muted-foreground max-w-lg mx-auto">
                                        VERIFICATION: THE TASK/FEATURE HAS BEEN COMPLETED SATISFACTORILY, MEETING THE REQUIREMENTS/SPECIFICATIONS.
                                    </p>
                                    <div className="flex justify-between items-end mt-12 pt-4">
                                        <div className="text-center">
                                            <p className="text-2xl italic text-gray-700">{certificate.qaTesterName}</p>
                                            <Separator className="my-2 bg-gray-400" />
                                            <p className="text-sm text-muted-foreground">Signature</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-semibold">{format(certificate.approvalDate, 'd MMM yyyy').toUpperCase()}</p>
                                            <Separator className="my-2 bg-gray-400" />
                                            <p className="text-sm text-muted-foreground">Date</p>
                                        </div>
                                    </div>
                                </footer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
