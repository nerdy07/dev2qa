'use client';

import { useParams } from 'next/navigation';
import { mockCertificates, mockRequests } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

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
        <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl">
                <div className="flex justify-between items-center mb-4 print:hidden">
                    <h1 className="text-2xl font-bold">Completion Certificate</h1>
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                </div>
                <Card className="shadow-2xl print:shadow-none print:border-none">
                    <CardContent className="p-8 md:p-12">
                        <div className="border-4 border-primary p-8 rounded-lg bg-background/50 relative">
                            <div className="absolute top-4 right-4 text-primary opacity-10 print:opacity-20">
                                <Award size={128} strokeWidth={1} />
                            </div>
                            <div className="text-center space-y-4">
                                <div className="flex justify-center text-primary">
                                    <Award size={64} />
                                </div>
                                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                                    Certificate of Task Completion
                                </h2>
                                <p className="text-lg">This certificate is awarded to</p>
                                <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
                                    {certificate.requesterName}
                                </h1>
                                <p className="text-lg">for the successful completion of the task</p>
                                <h3 className="text-2xl md:text-3xl font-semibold text-accent-foreground">
                                    "{certificate.taskTitle}"
                                </h3>
                            </div>

                            <Separator className="my-8" />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 text-center">
                                <div>
                                    <p className="text-sm text-muted-foreground">Associated Project</p>
                                    <p className="font-medium">{certificate.associatedProject}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Associated Team</p>
                                    <p className="font-medium">{certificate.associatedTeam}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Approved By (QA)</p>
                                    <p className="font-medium">{certificate.qaTesterName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Date of Approval</p>
                                    <p className="font-medium">{format(certificate.approvalDate, 'MMMM d, yyyy')}</p>
                                </div>
                            </div>

                            <div className="mt-12 text-center text-muted-foreground text-xs">
                                <p>Certificate ID: {certificate.id}</p>
                                <p>Issued by CertiTrack Pro</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
