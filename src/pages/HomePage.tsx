import React, { useState, Suspense, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Calendar as CalendarIcon, RefreshCcw, Loader2, Info, Activity, AlertTriangle, Fingerprint } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IntelligenceCard } from '@/components/IntelligenceCard';
import { NeutralizationDeepDive } from '@/components/NeutralizationDeepDive';
import { TourModal } from '@/components/TourModal';
import { SystemPulse } from '@/components/SystemPulse';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { DailyDigest, NewsCluster, SystemState } from '@shared/news-types';
import { format } from 'date-fns';
export function HomePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedCluster, setSelectedCluster] = useState<NewsCluster | null>(null);
  const [showTour, setShowTour] = useState(false);
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const { data: digest, isLoading, isError } = useQuery<DailyDigest | null>({
    queryKey: ['digest', formattedDate],
    queryFn: async () => {
      const res = await api<any>(`/api/digest/list?date=${formattedDate}&limit=1`);
      return res?.items?.[0] || null;
    }
  });
  const { data: sysStats } = useQuery<SystemState>({
    queryKey: ['system-stats'],
    queryFn: () => api<SystemState>('/api/system/stats').catch(() => ({ id: 'global', lastRun: 0, totalArticles: 0, sourceCount: 0 })),
    refetchInterval: 60000
  });
  const pipelineMutation = useMutation({
    mutationFn: () => api<DailyDigest>(`/api/pipeline/run`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['digest'] });
      queryClient.invalidateQueries({ queryKey: ['system-stats'] });
      toast.success("Consensus Synchronized", {
        description: `Synthesized top ${Math.min(data.clusterCount, 10)} intelligence clusters.`
      });
    },
    onError: (err: any) => toast.error("Sync Failure", { description: err.message })
  });
  const sortedClusters = digest?.clusters
    ? [...digest.clusters].sort((a, b) => b.impactScore - a.impactScore).slice(0, 10)
    : [];
  return (
    <AppLayout container>
      <div className="space-y-12">
        {/* Newspaper Style Masthead */}
        <div className="border-t-4 border-b-2 border-slate-900 dark:border-slate-100 py-10 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="hidden lg:block w-72">
              <SystemPulse stats={sysStats} onSync={() => queryClient.invalidateQueries({ queryKey: ['system-stats'] })} />
            </div>
            <div className="text-center flex-1">
              <h1 className="text-5xl md:text-8xl font-serif font-black text-slate-900 dark:text-slate-50 italic tracking-tighter uppercase leading-none mb-2">
                Veritas Lens
              </h1>
              <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
                Truth-First Edge Intelligence Briefing
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-3 w-72">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 rounded-sm">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowTour(true)} className="text-[9px] font-bold uppercase tracking-widest h-7 px-2">
                  <Info className="h-3 w-3 mr-1" /> Operations
                </Button>
                <Badge variant="outline" className="h-7 text-[8px] font-black uppercase border-slate-200">
                  <Activity className="h-2.5 w-2.5 mr-1 text-emerald-500" /> Edge: Active
                </Badge>
              </div>
            </div>
          </div>
        </div>
        {/* Dashboard Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 border-b pb-8 border-dashed">
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="font-black uppercase text-[10px] tracking-widest border-2 h-10 px-6">
                  <CalendarIcon className="mr-2 h-4 w-4" /> {date ? format(date, "MMM dd, yyyy") : "Select Cycle"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
            <div className="hidden sm:block h-8 w-px bg-slate-200" />
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Top 10 Global Clusters
            </div>
          </div>
          <Button
            onClick={() => pipelineMutation.mutate()}
            disabled={pipelineMutation.isPending}
            className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-black uppercase text-[11px] h-12 px-10 tracking-[0.1em] shadow-lg shadow-sky-200 dark:shadow-none transition-all active:scale-95"
          >
            {pipelineMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-3" />
                Normalizing Information...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 mr-3" />
                Synchronize Information Streams
              </>
            )}
          </Button>
        </div>
        {/* Intelligence Grid */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="h-[400px] animate-pulse bg-slate-50 dark:bg-slate-900 border-none" />
              ))}
            </div>
          ) : sortedClusters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedClusters.map((cluster, idx) => (
                <IntelligenceCard 
                  key={cluster.id} 
                  cluster={cluster} 
                  rank={idx + 1} 
                  onAudit={setSelectedCluster} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-40 border-2 border-dashed rounded-3xl bg-slate-50 dark:bg-slate-950/50">
              <Newspaper className="h-16 w-16 mx-auto text-slate-300 mb-6" />
              <h3 className="text-3xl font-serif italic text-slate-400 mb-4">No Archived Intelligence localized</h3>
              <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                The Edge Story Vault requires a fresh synchronization cycle to generate today's Top 10 consensus reporting clusters.
              </p>
              <Button 
                onClick={() => pipelineMutation.mutate()} 
                variant="outline" 
                className="font-black uppercase text-[10px] tracking-widest border-2 h-11 px-8"
              >
                Execute Pipeline Protocol
              </Button>
            </div>
          )}
        </div>
      </div>
      <NeutralizationDeepDive 
        cluster={selectedCluster} 
        isOpen={!!selectedCluster} 
        onOpenChange={(open) => !open && setSelectedCluster(null)} 
      />
      <TourModal forceOpen={showTour} onClose={() => setShowTour(false)} />
    </AppLayout>
  );
}