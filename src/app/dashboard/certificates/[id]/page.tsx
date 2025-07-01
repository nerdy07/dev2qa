'use client';

import { useParams } from 'next/navigation';
import { mockCertificates } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

const EchobitLogo = () => (
    <div className="flex items-center gap-3">
        <div className="w-10 h-10">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="50" fill="#294B43"/>
                <circle cx="50" cy="50" r="42" fill="#4B8678"/>
                <path d="M40 50C40 55.5228 44.4772 60 50 60C55.5228 60 60 55.5228 60 50C60 44.4772 55.5228 40 50 40C47.2386 40 44.7386 41.1193 42.9289 42.9289L39.0711 39.0711C41.9772 36.165 45.7893 34 50 34C58.8365 34 66 41.1635 66 50C66 58.8365 58.8365 66 50 66C41.1635 66 34 58.8365 34 50H40Z" fill="white"/>
                <path d="M50 56C53.3137 56 56 53.3137 56 50C56 46.6863 53.3137 44 50 44C48.4193 44 46.9696 44.6286 45.8787 45.7196L43.0503 42.8912C44.7196 41.2219 47.2196 40 50 40C55.5228 40 60 44.4772 60 50C60 55.5228 55.5228 60 50 60C44.4772 60 40 55.5228 40 50H43C43 53.3137 46.1634 56 50 56Z" fill="#C99248"/>
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 font-serif print:bg-white print:p-0">
            <div className="w-full max-w-5xl flex justify-end mb-4 print:hidden">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Certificate
                </Button>
            </div>

            <div className="w-full max-w-5xl bg-white shadow-2xl print:shadow-none aspect-[1.414] p-8 relative">
                 {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-1/4 h-1/4 bg-accent/80" style={{clipPath: 'polygon(100% 0, 0 0, 100% 100%)'}}></div>
                <div className="absolute top-0 right-0 w-1/5 h-1/5 bg-gold/70" style={{clipPath: 'polygon(100% 0, 0 0, 100% 100%)'}}></div>
                <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-accent/80" style={{clipPath: 'polygon(0 100%, 100% 100%, 0 0)'}}></div>
                <div className="absolute bottom-0 left-0 w-1/5 h-1/5 bg-gold/70" style={{clipPath: 'polygon(0 100%, 100% 100%, 0 0)'}}></div>

                <div className="w-full h-full p-2 border-2 border-border/20 relative">
                    <div className="w-full h-full flex flex-col p-10 border border-border/60 relative">
                         {/* Corner ornaments */}
                        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-border"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-border"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-border"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-border"></div>

                        <header className="flex justify-start mb-10">
                            <EchobitLogo />
                        </header>

                        <main className="flex-grow flex flex-col justify-center text-center">
                            
                            <div className="mb-8">
                                <p className="text-lg tracking-[0.3em] text-gold uppercase">Completion</p>
                                <h1 className="text-4xl font-bold tracking-[0.15em] text-foreground/90 uppercase mt-1">Certificate</h1>
                            </div>

                            <div className="space-y-6 my-8">
                                <div className="flex flex-col items-center">
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Product Name</p>
                                    <div className="w-20 h-px bg-border my-1.5"></div>
                                    <p className="text-xl font-semibold tracking-wider text-foreground uppercase">{certificate.associatedProject}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Task/Feature</p>
                                    <div className="w-20 h-px bg-border my-1.5"></div>
                                    <p className="text-xl font-semibold tracking-wider text-foreground uppercase">{certificate.taskTitle}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 my-10 text-center text-xs">
                                <div>
                                    <p className="font-semibold uppercase tracking-wider">{format(certificate.approvalDate, 'do MMMM yyyy')}</p>
                                    <div className="w-24 h-px bg-border mx-auto my-1.5"></div>
                                    <p className="uppercase tracking-widest text-muted-foreground">Completion Date</p>
                                </div>
                                <div>
                                    <p className="font-semibold uppercase tracking-wider">{certificate.qaTesterName}</p>
                                    <div className="w-24 h-px bg-border mx-auto my-1.5"></div>
                                    <p className="uppercase tracking-widest text-muted-foreground">QA Sign-off</p>
                                </div>
                                <div>
                                    <p className="font-semibold uppercase tracking-wider">{certificate.requesterName}</p>
                                    <div className="w-24 h-px bg-border mx-auto my-1.5"></div>
                                    <p className="uppercase tracking-widest text-muted-foreground">Developer/Team</p>
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-4">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider max-w-md mx-auto">
                                    Verification: The task/feature has been completed satisfactorily, meeting the requirements/specifications.
                                </p>
                                <div className="grid grid-cols-2 gap-16 mt-6 max-w-sm mx-auto items-end">
                                    <div className="text-center flex flex-col items-center">
                                        <SignaturePlaceholder />
                                        <div className="w-full h-px bg-border mx-auto mt-1"></div>
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5">Signature</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold uppercase tracking-wider pb-1 text-xs">{format(certificate.approvalDate, 'do MMMM yyyy')}</p>
                                        <div className="w-full h-px bg-border mx-auto"></div>
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5">Date</p>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
