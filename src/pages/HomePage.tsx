import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Zap, FileDown, Calendar as CalendarIcon, Network, LayoutList, Fingerprint, TrendingUp, TrendingDown, Minus, HelpCircle, Rss, AlertTriangle, Loader2, BarChart3, Activity, RefreshCcw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConsensusMap } from '@/components/ConsensusMap';
import { ConsensusTimeline } from '@/components/ConsensusTimeline';
import { ConsensusTopology } from '@/components/ConsensusTopology';
import { NeutralizationDeepDive } from '@/components/NeutralizationDeepDive';
import { TourModal } from '@/components/TourModal';
import { SystemPulse } from '@/components/SystemPulse';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DailyDigest, NewsCluster, SystemState } from '@shared/news-types';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
export function HomePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedCluster, setSelectedCluster] = useState<NewsCluster | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const { data: digest, isLoading, isError, error } = useQuery<DailyDigest | null>({
    queryKey: ['digest', formattedDate],
    queryFn: async () => {
      try {
        const res = await api<any>(`/api/digest/list?date=${formattedDate}&limit=1`);
        return res?.items?.[0] || null;
      } catch (err: any) {
        console.error("[HOME] Failed to fetch digest from Edge storage:", err.message);
        throw err;
      }
    },
    retry: 1
  });
  const { data: sysStats } = useQuery<SystemState>({
    queryKey: ['system-stats'],
    queryFn: () => api<SystemState>('/api/system/stats').catch(() => ({ id: 'global', lastRun: 0, totalArticles: 0, sourceCount: 0 })),
    refetchInterval: 30000
  });
  const pipelineMutation = useMutation({
    mutationFn: () => api<DailyDigest>(`/api/pipeline/run`, { method: 'POST' }),
    onSuccess: (data) => {
      // Hard invalidation for full cache purge
      queryClient.invalidateQueries({ queryKey: ['digest'] });
      queryClient.invalidateQueries({ queryKey: ['system-stats'] });
      const count = Math.min(data.clusterCount, 10);
      toast.success(`Reloaded: ${count}/10 clusters`, {
        description: `Consensus synthesis complete at the edge.`
      });
    },
    onError: (err: any) => {
      toast.error("Pipeline Execution Failure", {
        description: err.message
      });
    }
  });
  const handleExport = useCallback(() => {
    if (!digest) return;
    setIsExporting(true);
    setTimeout(() => {
      window.location.href = `/api/digest/${digest.id}/csv`;
      toast.success("Intelligence Export Initiated");
      setIsExporting(false);
    }, 800);
  }, [digest]);
  // Newspaper Hierarchy Logic constrained to Top 10
  const sortedClusters = digest?.clusters 
    ? [...digest.clusters].sort((a, b) => b.impactScore - a.impactScore).slice(0, 10) 
    : [];
  const primaryHeadline = sortedClusters[0];
  const subHeadlines = sortedClusters.slice(1, 4); // Increased count for subHeadlines to fill layout
  const tertiaryHeadlines = sortedClusters.slice(4);
  return (
    <AppLayout container>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          {/* Masthead Header */}
          <div className="border-t-4 border-b-2 border-slate-900 dark:border-slate-100 py-8 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="hidden md:block">
                <SystemPulse stats={sysStats} onSync={() => queryClient.invalidateQueries({ queryKey: ['system-stats'] })} />
              </div>
              <div className="text-center">
                <h2 className="text-6xl md:text-8xl font-serif font-black text-slate-900 dark:text-slate-50 italic tracking-tighter uppercase leading-none">
                  Veritas Lens
                </h2>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                  Autonomous Edge Information Architect
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end gap-2">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-slate-100 border-2 border-slate-900 dark:border-slate-100 px-3 py-1">
                  {format(new Date(), "MMMM d, yyyy")}
                </div>
                <div className="text-[8px] font-bold text-muted-foreground uppercase">Network Latency: Optimal (Edge Nodes Active)</div>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="font-bold uppercase text-[9px] tracking-widest border-2">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" /> {date ? format(date, "MMM dd") : "Select Cycle"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
              <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-tighter py-1 bg-sky-50 text-sky-700">
                <Activity className="h-3 w-3 mr-1" /> Cycle: {digest?.id || 'Standby'}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowTour(true)} className="text-[10px] font-bold uppercase tracking-widest">
                <HelpCircle className="mr-2 h-4 w-4" /> Operations Manual
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!digest} className="font-bold border-2 uppercase text-[10px]">
                <FileDown className="mr-2 h-4 w-4" /> Export Report
              </Button>
              <Button 
                onClick={() => pipelineMutation.mutate()} 
                disabled={pipelineMutation.isPending} 
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] px-6"
              >
                {pipelineMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                Reload Top 10 Consensus Clusters
              </Button>
            </div>
          </div>
          {isError && (
             <Card className="border-rose-200 bg-rose-50 mb-10">
               <CardContent className="py-6 flex items-center gap-4">
                 <AlertTriangle className="h-8 w-8 text-rose-500" />
                 <div>
                   <p className="font-black text-rose-900 uppercase text-[10px] tracking-widest">Edge Synchronization Failure</p>
                   <p className="text-sm text-rose-700 font-medium">Diagnostic: {(error as any)?.message || "Unknown retrieval error"}</p>
                 </div>
               </CardContent>
             </Card>
          )}
          <Tabs defaultValue="broadsheet" className="space-y-12">
            <TabsList className="bg-slate-100 dark:bg-slate-900 p-1">
              <TabsTrigger value="broadsheet" className="font-bold text-[10px] uppercase tracking-widest">Broadsheet View</TabsTrigger>
              <TabsTrigger value="topology" className="font-bold text-[10px] uppercase tracking-widest">Information Topology</TabsTrigger>
            </TabsList>
            <TabsContent value="broadsheet" className="space-y-12">
              {digest && sortedClusters.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
                  {/* Left Column: Primary Headline (2 cols) */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-2 mb-6">
                      <span className="text-[10px] font-black uppercase text-sky-600 tracking-[0.3em]">Critical Intelligence Cluster</span>
                    </div>
                    {primaryHeadline && (
                      <div className="space-y-6">
                        <h3 className="text-4xl md:text-5xl font-serif font-black italic leading-tight hover:text-sky-700 transition-colors cursor-pointer" onClick={() => setSelectedCluster(primaryHeadline)}>
                          {primaryHeadline.representativeTitle}
                        </h3>
                        <p className="text-lg font-serif italic text-slate-600 dark:text-slate-400 leading-relaxed border-l-4 border-sky-500 pl-6 py-2">
                          {primaryHeadline.neutralSummary}
                        </p>
                        <div className="flex items-center justify-between pt-4">
                          <ConsensusTopology sourceNames={primaryHeadline.sourceSpread} dispersion={primaryHeadline.biasScore} className="h-24 w-64" />
                          <Button variant="ghost" size="sm" onClick={() => setSelectedCluster(primaryHeadline)} className="text-[10px] font-black uppercase tracking-widest">
                            <Fingerprint className="h-4 w-4 mr-2" /> Audit Trail
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Middle Column: Secondary Headlines with Topologies */}
                  <div className="lg:col-span-1 space-y-8 lg:pl-10">
                     <div className="border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Regional Briefings</span>
                     </div>
                     {subHeadlines.map(h => (
                       <div key={h.id} className="space-y-3 group cursor-pointer" onClick={() => setSelectedCluster(h)}>
                         <div className="flex items-center justify-between">
                            <Badge className="bg-slate-50 text-slate-400 text-[8px] uppercase">{h.sourceCount} Sources</Badge>
                            <span className="text-[9px] font-black uppercase text-emerald-600">{(h.consensusFactor * 100).toFixed(0)}% Consensus</span>
                         </div>
                         <h4 className="text-xl font-serif font-bold italic leading-snug group-hover:text-sky-600 transition-colors">
                           {h.representativeTitle}
                         </h4>
                         <ConsensusTopology sourceNames={h.sourceSpread} dispersion={h.biasScore} className="h-20" />
                       </div>
                     ))}
                  </div>
                  {/* Right Column: Tertiary / Ticker */}
                  <div className="lg:col-span-1 lg:pl-10 space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl ring-1 ring-slate-100">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center">
                        <BarChart3 className="h-3 w-3 mr-2 text-sky-600" /> Consensus Feed
                      </h5>
                      <div className="space-y-6">
                        {tertiaryHeadlines.map(h => (
                          <div key={h.id} className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 cursor-pointer hover:bg-slate-100/50" onClick={() => setSelectedCluster(h)}>
                            <p className="text-[9px] font-black uppercase text-emerald-600 mb-1">{(h.consensusFactor * 100).toFixed(0)}% Agree</p>
                            <h6 className="font-serif font-bold text-sm leading-tight italic">{h.representativeTitle}</h6>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-40 bg-white dark:bg-slate-950 border-2 border-dashed rounded-3xl">
                   <Newspaper className="h-16 w-16 mx-auto text-slate-200 mb-6" />
                   <h3 className="text-2xl font-serif italic text-slate-400">Archival Records Required</h3>
                   <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto italic">Synchronize with information streams to generate today's Top 10 consensus.</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="topology">
               {digest?.clusters ? <ConsensusMap clusters={digest.clusters} height={600} /> : null}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <NeutralizationDeepDive cluster={selectedCluster} isOpen={!!selectedCluster} onOpenChange={(o) => !o && setSelectedCluster(null)} />
      <TourModal forceOpen={showTour} onClose={() => setShowTour(false)} />
    </AppLayout>
  );
}