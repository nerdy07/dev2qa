
'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection } from '@/hooks/use-collection';
import { Project, CertificateRequest } from '@/lib/types';
import { Stethoscope, TriangleAlert, Bot, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getProjectDiagnoses } from '@/app/actions';
import { DiagnoseProjectsOutput } from '@/ai/flows/diagnose-projects-flow';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function DiagnosticsPage() {
  const { data: projects, loading: projectsLoading, error: projectsError } = useCollection<Project>('projects');
  const { data: requests, loading: requestsLoading, error: requestsError } = useCollection<CertificateRequest>('requests');

  const [isRunning, setIsRunning] = React.useState(false);
  const [diagnoses, setDiagnoses] = React.useState<DiagnoseProjectsOutput | null>(null);
  const [aiError, setAiError] = React.useState<string | null>(null);

  const loading = projectsLoading || requestsLoading;
  const error = projectsError || requestsError;

  const handleRunDiagnostics = async () => {
    setIsRunning(true);
    setAiError(null);
    setDiagnoses(null);

    const activeProjects = projects?.filter(p => p.status === 'In Progress' || p.status === 'On Hold') || [];

    if (activeProjects.length === 0) {
        setAiError("No active projects available to diagnose.");
        setIsRunning(false);
        return;
    }

    const input = {
        projects: activeProjects.map(p => ({
            ...p,
            startDate: p.startDate?.toDate().toISOString(),
            endDate: p.endDate?.toDate().toISOString(),
            requests: requests?.filter(r => r.associatedProject === p.name).map(r => ({ id: r.id, status: r.status, taskTitle: r.taskTitle })) || [],
        }))
    };

    const result = await getProjectDiagnoses(input);

    if (result.success) {
        setDiagnoses(result.data);
    } else {
        setAiError(result.error);
    }

    setIsRunning(false);
  };
  
  const riskVariant = (level: 'Low' | 'Medium' | 'High' | 'Critical') => {
    switch(level) {
        case 'Critical':
        case 'High':
            return 'destructive';
        case 'Medium':
            return 'secondary';
        case 'Low':
        default:
            return 'outline';
    }
  }

  const renderResults = () => {
    if (isRunning) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>AI is analyzing your projects. This may take a moment...</p>
                </div>
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
        )
    }

    if (aiError) {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Diagnostics Failed</AlertTitle>
                <AlertDescription>{aiError}</AlertDescription>
            </Alert>
        )
    }

    if (diagnoses) {
        if (diagnoses.diagnoses.length === 0) {
            return (
                <Alert>
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>All Clear!</AlertTitle>
                    <AlertDescription>The AI analysis did not detect any significant risks in your active projects.</AlertDescription>
                </Alert>
            )
        }
        return (
            <Accordion type="single" collapsible className="w-full">
                {diagnoses.diagnoses.sort((a,b) => {
                    const order = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
                    return order[b.riskLevel] - order[a.riskLevel];
                }).map(d => (
                    <AccordionItem value={d.projectId} key={d.projectId}>
                        <AccordionTrigger>
                            <div className="flex items-center gap-4">
                                <Badge variant={riskVariant(d.riskLevel)}>{d.riskLevel} Risk</Badge>
                                <span className="font-semibold">{d.projectName}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 px-2">
                            <div>
                                <h4 className="font-semibold text-sm">Diagnosis</h4>
                                <p className="text-muted-foreground">{d.diagnosis}</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-sm">Recommendation</h4>
                                <p className="text-muted-foreground">{d.recommendation}</p>
                            </div>
                             <Button asChild variant="link" className="p-0 h-auto">
                                <Link href={`/dashboard/admin/projects/${d.projectId}`}>View Project</Link>
                            </Button>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        )
    }

    return null;
  }

  return (
    <>
      <PageHeader
        title="AI Project Diagnostics"
        description="Analyze active projects to identify potential risks and get actionable recommendations."
      >
        <Button onClick={handleRunDiagnostics} disabled={isRunning || loading}>
            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Stethoscope className="mr-2 h-4 w-4" />}
            {isRunning ? 'Analyzing...' : 'Run Diagnostics'}
        </Button>
      </PageHeader>
      
      {error && (
         <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>Could not load project or request data needed for diagnostics. {error.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Bot />
                Analysis Results
            </CardTitle>
            <CardDescription>
                Click "Run Diagnostics" to analyze active and on-hold projects for potential delivery risks. Results will appear below.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {renderResults()}
        </CardContent>
      </Card>
    </>
  );
}
