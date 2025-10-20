'use client';
import React from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function VisualizationPage() {
  const { data, isLoading } = useSWR('/api/projects', fetcher, { refreshInterval: 30000 });
  const projects: any[] = data?.projects || [];

  const [view, setView] = React.useState<'bubble' | 'kanban' | 'gantt'>('bubble');
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!query) return projects;
    return projects.filter(p => p.name?.toLowerCase().includes(query.toLowerCase()));
  }, [projects, query]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Input placeholder="Search projects" value={query} onChange={e => setQuery(e.target.value)} />
        <Select onValueChange={(v) => setView(v as any)} value={view}>
          <SelectTrigger className="w-48"><SelectValue placeholder="View" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bubble">Bubble Map</SelectItem>
            <SelectItem value="kanban">Kanban</SelectItem>
            <SelectItem value="gantt">Timeline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={view}>
        <TabsList>
          <TabsTrigger value="bubble">Overview</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="gantt">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="bubble">
          <BubbleMap projects={filtered} loading={isLoading} />
        </TabsContent>
        <TabsContent value="kanban">
          <KanbanLite projects={filtered} />
        </TabsContent>
        <TabsContent value="gantt">
          <GanttLite projects={filtered} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BubbleMap({ projects, loading }: { projects: any[]; loading: boolean }) {
  if (loading) return <div>Loading…</div>;
  if (!projects.length) return <div>No projects</div>;

  // Simple responsive grid of bubbles sized by scopePoints and colored by status
  const colorByStatus: Record<string, string> = {
    planning: 'bg-indigo-400',
    in_progress: 'bg-sky-400',
    at_risk: 'bg-amber-400',
    blocked: 'bg-rose-500',
    completed: 'bg-emerald-500',
  };

  // AI predictions cache in-component
  const [pred, setPred] = React.useState<Record<string, { onTimeProbability: number; delayRisk: 'low'|'medium'|'high' }>>({});
  const [loadingIds, setLoadingIds] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      const toQuery = projects.filter(p => !pred[p.id]);
      if (!toQuery.length) return;
      const nextLoading: Record<string, boolean> = {};
      for (const p of toQuery) nextLoading[p.id] = true;
      setLoadingIds(prev => ({ ...prev, ...nextLoading }));
      try {
        const results = await Promise.all(toQuery.map(async (p) => {
          const res = await fetch('/api/ai/predict/project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectName: p.name, totals: p.totals, progressPct: p.progressPct })
          });
          if (!res.ok) return { id: p.id, onTimeProbability: 0.5, delayRisk: 'medium' as const };
          const j = await res.json();
          return { id: p.id, onTimeProbability: j.onTimeProbability ?? 0.5, delayRisk: j.delayRisk ?? 'medium' };
        }));
        if (!cancelled) {
          const m: Record<string, { onTimeProbability: number; delayRisk: 'low'|'medium'|'high' }> = {};
          for (const r of results) m[r.id] = { onTimeProbability: r.onTimeProbability, delayRisk: r.delayRisk };
          setPred(prev => ({ ...prev, ...m }));
        }
      } finally {
        if (!cancelled) setLoadingIds({});
      }
    }
    run();
    return () => { cancelled = true; };
  }, [projects]);

  const riskColor: Record<'low'|'medium'|'high', string> = {
    low: 'text-emerald-400',
    medium: 'text-amber-400',
    high: 'text-rose-400',
  };

  return (
    <TooltipProvider>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {projects.map((p) => {
        const size = Math.max(64, Math.min(160, (p.scopePoints || p.totals?.total || 1) * 12));
        const progress = p.progressPct ?? 0;
        const pr = pred[p.id];
        const risk = pr?.delayRisk || 'medium';
        const prob = pr ? Math.round((pr.onTimeProbability || 0) * 100) : null;
        return (
          <Tooltip key={p.id}>
            <TooltipTrigger asChild>
              <Card className="overflow-hidden border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold truncate" title={p.name}>{p.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full ring-2 ring-offset-2 ring-offset-slate-950 ${colorByStatus[p.status] || 'bg-slate-500'} ${pr ? `ring-${risk === 'high' ? 'rose' : risk === 'medium' ? 'amber' : 'emerald'}-400` : 'ring-slate-700'}`} style={{ width: size, height: size }} />
                    <div className="space-y-1">
                      <div className="text-xs text-slate-400">Status</div>
                      <div className="text-sm capitalize">{(p.status || 'in_progress').replace('_', ' ')}</div>
                      <div className="text-xs text-slate-400">Progress</div>
                      <div className="text-sm font-medium">{progress}%</div>
                      <div className="text-xs text-slate-400">AI</div>
                      <div className={`text-sm font-medium ${riskColor[risk]}`}>{loadingIds[p.id] ? 'Predicting…' : pr ? `${prob}% on-time • ${risk} risk` : '—'}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    {p.totals?.completed}/{p.totals?.total} completed • {p.totals?.pending} pending
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div className="font-semibold mb-1">AI Forecast</div>
                <div>On-time: {prob !== null ? `${prob}%` : '—'}</div>
                <div>Risk: {risk}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
    </TooltipProvider>
  );
}

function KanbanLite({ projects }: { projects: any[] }) {
  const groups: Record<string, any[]> = {};
  for (const p of projects) {
    const k = p.status || 'in_progress';
    if (!groups[k]) groups[k] = [];
    groups[k].push(p);
  }
  const cols = Object.entries(groups);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cols.map(([status, list]) => (
        <div key={status} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="text-sm font-semibold capitalize mb-3">{status.replace('_', ' ')}</div>
          <div className="space-y-3">
            {list.map(p => (
              <div key={p.id} className="bg-slate-800 rounded p-3 text-sm">
                <div className="font-medium truncate" title={p.name}>{p.name}</div>
                <div className="text-xs text-slate-400">{p.totals?.completed}/{p.totals?.total} • {p.progressPct}%</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GanttLite({ projects }: { projects: any[] }) {
  return (
    <div className="space-y-3">
      {projects.map(p => (
        <div key={p.id} className="">
          <div className="text-sm font-medium truncate" title={p.name}>{p.name}</div>
          <div className="h-2 bg-slate-800 rounded">
            <div className="h-2 bg-sky-500 rounded" style={{ width: `${p.progressPct ?? 0}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-1">{p.totals?.completed}/{p.totals?.total} completed</div>
        </div>
      ))}
    </div>
  );
}


