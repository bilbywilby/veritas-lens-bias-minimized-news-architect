import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Calendar as CalendarIcon, RefreshCcw, Loader2, Info, Activity, Database, ExternalLink, ShieldAlert, CheckCircle2, Sliders, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IntelligenceCard } from '@/components/IntelligenceCard';
import { NeutralizationDeepDive } from '@/components/NeutralizationDeepDive';
import { TourModal } from '@/components/TourModal';
import { SystemPulse } from '@/components/SystemPulse';
import { ConsensusMap } from '@/components/ConsensusMap';
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
  const { data: digest, isLoading } = useQuery<DailyDigest | null>({
    queryKey: ['digest', formattedDate],
    queryFn: async () => {
      try {
        const res = await api<any>(`/api/digest/list?date=${formattedDate}&limit=1`);
        return res?.items?.[0] || null;
      } catch (e) {
        return null;
      }
    },
  });
  const { data: sysStats } = useQuery<SystemState>({
    queryKey: ['system-stats'],
    queryFn: () => api<SystemState>('/api/system/stats').catch(() => ({ id: 'global', lastRun: 0, totalArticles: 0, sourceCount: 0 })),
  });
  const pipelineMutation = useMutation({
    mutationFn: () => api<DailyDigest>(`/api/pipeline/run`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['digest'] });
      queryClient.invalidateQueries({ queryKey: ['system-stats'] });
      toast.success("Broadsheet Updated", { description: `Synthesized ${data.clusterCount} intelligence clusters.` });
    },
  });
  const featuredCluster = digest?.clusters?.[0];
  const remainingClusters = digest?.clusters?.slice(1) || [];
  return (
    <AppLayout container>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Newspaper Masthead */}
        <header className="border-t-8 border-b-2 border-slate-900 dark:border-slate-100 py-12 mb-16">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="hidden lg:block w-80">
              <SystemPulse stats={sysStats} onSync={() => queryClient.invalidateQueries({ queryKey: ['system-stats'] })} />
            </div>
            <div className="text-center flex-1">
              <h1 className="text-6xl md:text-9xl font-serif font-black text-slate-900 dark:text-slate-50 italic tracking-tighter uppercase leading-none mb-3">
                Veritas Lens
              </h1>
              <div className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-500">
                Truth Architecture & Bias Neutralization Protocol
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-end gap-4 w-80">
              <div className="text-xs font-black uppercase tracking-[0.2em] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-6 py-2 rounded-sm">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => setShowTour(true)} className="text-[10px] font-bold uppercase tracking-widest h-8 px-3">
                  <Info className="h-3.5 w-3.5 mr-1.5" /> Protocol
                </Button>
                <Badge variant="outline" className="h-8 text-[9px] font-black uppercase border-slate-300 px-3">
                  <Activity className="h-3 w-3 mr-1.5 text-emerald-500" /> Edge: Active
                </Badge>
              </div>
            </div>
          </div>
        </header>
        {isLoading ? (
          <div className="space-y-12 animate-pulse">
            <div className="h-96 bg-slate-100 rounded-2xl" />
            <div className="grid grid-cols-3 gap-8">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-xl" />)}
            </div>
          </div>
        ) : featuredCluster ? (
          <div className="space-y-16">
            {/* Step 1: Featured Story (Broadsheet Hero) */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 border-b-2 border-slate-100 pb-16">
              <div className="lg:col-span-8 space-y-8">
                <div className="flex items-center gap-3">
                  <Badge className="bg-sky-600 font-black text-[10px] px-3 py-1">FEATURED INTELLIGENCE</Badge>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rank 1 • {featuredCluster.sourceCount} Publisher Streams</span>
                </div>
                <h2 
                  className="text-5xl md:text-7xl font-serif font-bold italic leading-[1.05] tracking-tight hover:text-sky-700 cursor-pointer transition-colors"
                  onClick={() => setSelectedCluster(featuredCluster)}
                >
                  {featuredCluster.representativeTitle}
                </h2>
                <div className="text-xl text-slate-600 dark:text-slate-400 font-serif italic leading-relaxed drop-cap text-justify-newspaper">
                  {featuredCluster.neutralSummary}
                </div>
                <div className="flex flex-wrap gap-3">
                  {featuredCluster.tags?.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px] font-black uppercase border-sky-100 text-sky-700 px-4">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-4 space-y-8 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-2xl border-2 border-dashed border-slate-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neutralization Logic</span>
                </div>
                <p className="text-sm font-serif italic text-slate-500 leading-relaxed">
                  Synthesized from {featuredCluster.sourceSpread.join(", ")}. Editorial slant minimized through cross-stream verification.
                </p>
                <div className="pt-4 space-y-4">
                  <Button onClick={() => setSelectedCluster(featuredCluster)} className="w-full bg-slate-900 hover:bg-slate-800 font-black uppercase text-[10px] tracking-widest h-12">
                    Open Intelligence Audit
                  </Button>
                  <Button variant="outline" className="w-full border-2 font-black uppercase text-[10px] tracking-widest h-12" asChild>
                    <a href={featuredCluster.articles[0]?.link} target="_blank" rel="noreferrer">
                      View Primary Stream <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </section>
            {/* Step 2: Information Topology Visualization */}
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-sky-600" />
                <h3 className="text-2xl font-serif font-bold italic">Information Topology Map</h3>
              </div>
              <ConsensusMap clusters={digest.clusters} height={450} />
            </section>
            {/* Step 3: High-Density Columns */}
            <section className="space-y-10">
              <div className="flex justify-between items-end border-b-2 border-slate-900 dark:border-slate-100 pb-4">
                <h3 className="text-3xl font-serif font-bold italic">Global Intelligence Clusters</h3>
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Showing {remainingClusters.length} secondary clusters
                </div>
              </div>
              <div className="newspaper-grid">
                {remainingClusters.map((cluster, idx) => (
                  <IntelligenceCard 
                    key={cluster.id} 
                    cluster={cluster} 
                    rank={idx + 2} 
                    onAudit={setSelectedCluster} 
                  />
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="text-center py-40 bg-slate-50 rounded-3xl border-4 border-dashed border-slate-200">
            <Newspaper className="h-20 w-20 mx-auto text-slate-300 mb-8" />
            <h3 className="text-4xl font-serif italic text-slate-400 mb-6">Archive Empty</h3>
            <Button
              onClick={() => pipelineMutation.mutate()}
              disabled={pipelineMutation.isPending}
              className="bg-sky-600 hover:bg-sky-700 font-black uppercase text-[11px] tracking-widest h-14 px-10"
            >
              {pipelineMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Execute Primary Pipeline Protocol
            </Button>
          </div>
        )}
      </div>
      <NeutralizationDeepDive cluster={selectedCluster} isOpen={!!selectedCluster} onOpenChange={(open) => !open && setSelectedCluster(null)} />
      <TourModal forceOpen={showTour} onClose={() => setShowTour(false)} />
    </AppLayout>
  );
}