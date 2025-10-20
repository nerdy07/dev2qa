'use client';

import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, GanttChartSquare, KanbanSquare, Target } from 'lucide-react';

export default function ProjectInsightsPage() {
  return (
    <>
      <PageHeader
        title="Project Insights"
        description="Visualize project timelines, manage tasks, and track overall progress."
      />
      <div className="grid gap-8">
        <Card className="border-2 border-dashed bg-secondary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <BarChart className="h-6 w-6 text-primary" />
              Comprehensive Dashboard Coming Soon
            </CardTitle>
            <CardDescription>
              This space will soon be populated with rich, interactive visualizations and project management tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                    <GanttChartSquare className="h-5 w-5 mt-0.5 text-accent" />
                    <div>
                        <p className="font-semibold text-card-foreground">Visual Timelines</p>
                        <p>Interactive Gantt charts to plan and track project milestones and dependencies.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <KanbanSquare className="h-5 w-5 mt-0.5 text-accent" />
                    <div>
                        <p className="font-semibold text-card-foreground">Task Boards</p>
                        <p>Collaborative Kanban boards for seamless task management between developers and QA.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 mt-0.5 text-accent" />
                    <div>
                        <p className="font-semibold text-card-foreground">Real-time Analytics</p>
                        <p>Burndown charts, progress rings, and team workload visualizations.</p>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>

        <div>
            <h3 className="text-lg font-semibold mb-4">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li><span className="font-semibold text-foreground">Define Core Entities:</span> We'll expand the database schema for Projects, Tasks, and Milestones.</li>
                <li><span className="font-semibold text-foreground">Implement Data Visualizations:</span> We'll add charting libraries to build the dashboard widgets.</li>
                <li><span className="font-semibold text-foreground">Integrate AI Features:</span> We'll connect the AI engine to predict delays and suggest resource allocation.</li>
            </ol>
        </div>
      </div>
    </>
  );
}
