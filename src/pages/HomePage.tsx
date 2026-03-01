import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Zap, FileDown, Calendar as CalendarIcon, Network, LayoutList, Fingerprint, TrendingUp, TrendingDown, Minus, HelpCircle, Rss, AlertTriangle, Loader2 } from 'lucide-react';
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
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DailyDigest, NewsCluster } from '@shared/news-types';
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
  const { data: digest, isLoading, isError } = useQuery<DailyDigest | null>({
    queryKey: ['digest', formattedDate],
    queryFn: async () => {
      try {
        const res = await api<any>(`/api/digest/list?date=${formattedDate}&limit=1`);
        return res?.items?.[0] || null;
      } catch (err) {
        console.error("[HOME] Failed to fetch digest from Edge storage:", err);
        throw err;
      }
    },
    retry: 1
  });
  const { data: timelineData } = useQuery<any[]>({
    queryKey: ['analytics-consensus'],
    queryFn: () => api<any[]>('/api/analytics/consensus').catch(() => [])
  });
  const pipelineMutation = useMutation({
    mutationFn: () => api<DailyDigest>(`/api/pipeline/run`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['digest'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-consensus'] });
      toast.success(`Consensus Synthesis Complete`, {
        description: `${data.clusterCount} intelligence clusters identified from ${data.articleCount} sources.`
      });
    },
    onError: (error: any) => {
      console.error("[HOME] Pipeline execution failed:", error);
      toast.error(`Ingestion Pipeline Failure`, {
        description: error.message || "Unable to synchronize with information streams."
      });
    }
  });
  const isSample = digest?.id?.includes('sample');
  useEffect(() => {
    if (digest && isSample && !pipelineMutation.isPending && !isLoading) {
      toast("Ready for Live Ingestion", {
        description: "Viewing localized samples. Trigger the pipeline for real-time reporting.",
        action: {
          label: "Execute",
          onClick: () => pipelineMutation.mutate()
        }
      });
    }
  }, [digest, isSample, pipelineMutation, isLoading]);
  const handleExport = useCallback(() => {
    if (!digest) return;
    setIsExporting(true);
    setTimeout(() => {
      window.location.href = `/api/digest/${digest.id}/csv`;
      toast.success("Intelligence Export Initiated");
      setIsExporting(false);
    }, 800);
  }, [digest]);
  const getBiasBadge = (score: number = 0) => {
    if (score < 0.22) return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">High Consensus</Badge>;
    if (score < 0.45) return <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50">Reporting Variance</Badge>;
    return <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50">Source Divergence</Badge>;
  };
  const trendIndicator = (current: number) => {
    if (!timelineData || timelineData.length < 2) return null;
    const prev = timelineData[timelineData.length - 2]?.score || current;
    const diff = current - prev;
    if (Math.abs(diff) < 0.1) return <Minus className="h-3 w-3 text-slate-400" />;
    return diff > 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-rose-500" />;
  };
  return (
    <AppLayout container>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <div className="border-t-4 border-b-2 border-slate-900 dark:border-slate-100 py-8 mb-12 relative">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
              <div className="flex flex-col items-start gap-1">
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                  Vol. {digest?.id?.split('-')[0] || '2026'} • No. {digest?.id?.split('-').pop() || '001'}
                </div>
                {isSample && <Badge variant="outline" className="text-[8px] border-amber-200 bg-amber-50 text-amber-600 font-black uppercase tracking-tighter rounded-sm px-1.5 h-4">Sample Dossier</Badge>}
              </div>
              <h2 className="text-6xl md:text-8xl font-serif font-black text-slate-900 dark:text-slate-50 italic tracking-tighter text-center uppercase leading-none">
                Veritas Lens
              </h2>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-slate-100 border-2 border-slate-900 dark:border-slate-100 px-3 py-1">
                {format(new Date(), "MMM d, yyyy")}
              </div>
            </div>
            <div className="absolute bottom-1 left-0 w-full h-[1px] bg-slate-900/10 dark:bg-slate-100/10" />
          </div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50 transition-colors h-10">
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    Archive: {date ? format(date, "MMM dd") : "Select Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", pipelineMutation.isPending ? "bg-amber-500" : "bg-emerald-500")} />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                  {pipelineMutation.isPending ? 'Synchronizing Intelligence...' : 'Network Core Stable'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowTour(true)} className="text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100">
                <HelpCircle className="mr-2 h-4 w-4" /> User Guide
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!digest || isExporting}
                className="border-2 font-bold uppercase text-[10px] h-10 px-4"
              >
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Export CSV
              </Button>
              <Button
                onClick={() => pipelineMutation.mutate()}
                disabled={pipelineMutation.isPending}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold uppercase text-[10px] tracking-widest h-10 px-6 shadow-md transition-all active:scale-95"
              >
                {pipelineMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Neutralizing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Execute Ingestion
                  </>
                )}
              </Button>
            </div>
          </div>
          {isError && (
            <div className="mb-8 p-10 border-2 border-dashed border-rose-200 bg-rose-50 rounded-2xl flex flex-col items-center text-center">
              <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
              <h4 className="text-xl font-serif font-bold italic">Reporting Link Severed</h4>
              <p className="text-sm text-rose-600 mt-2 max-w-md">Internal synchronization with the Edge storage cluster failed. Intelligence streams may be unresponsive.</p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['digest'] })} variant="outline" className="mt-8 border-rose-200 text-rose-700 hover:bg-rose-100 font-bold uppercase text-[10px]">Re-establish Link</Button>
            </div>
          )}
          {timelineData && timelineData.length > 1 && (
            <div className="mb-12">
              <ConsensusTimeline data={timelineData} />
            </div>
          )}
          <Tabs defaultValue="briefing" className="space-y-8">
            <TabsList className="grid w-full max-w-sm grid-cols-2 bg-slate-100 dark:bg-slate-900 h-11 p-1 rounded-lg">
              <TabsTrigger value="briefing" className="font-bold uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">
                <LayoutList className="mr-2 h-3.5 w-3.5"/> Morning Briefing
              </TabsTrigger>
              <TabsTrigger value="topology" className="font-bold uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">
                <Network className="mr-2 h-3.5 w-3.5"/> Info Topology
              </TabsTrigger>
            </TabsList>
            <TabsContent value="briefing" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {digest && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Articles Processed', val: digest.articleCount || 0, color: 'text-sky-600', trend: null, live: pipelineMutation.isPending },
                    { label: 'Neutral Clusters', val: digest.clusterCount || 0, color: 'text-indigo-600', trend: null, live: false },
                    { label: 'Consensus Index', val: `${(digest.consensusScore ?? 0).toFixed(1)}/10`, color: 'text-emerald-600', trend: digest.consensusScore, live: false }
                  ].map((stat, i) => (
                    <Card key={i} className="border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 transition-shadow hover:shadow-md">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <CardDescription className={cn("uppercase tracking-tighter text-[10px] font-black", stat.color)}>{stat.label}</CardDescription>
                            {stat.live && <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
                          </div>
                          {stat.trend !== null && trendIndicator(stat.trend)}
                        </div>
                        <CardTitle className="text-4xl font-serif font-black">{stat.val}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
              {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-72 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl border-none ring-1 ring-slate-200" />)}
                </div>
              ) : digest?.clusters && digest.clusters.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {digest.clusters.map((cluster) => (
                    <motion.div key={cluster.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                      <Card className="h-full group border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col overflow-hidden hover:ring-sky-500 transition-all duration-300 border-l-4 border-l-slate-900 dark:border-l-slate-100">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-wrap gap-1">
                              {(cluster.sourceSpread || []).slice(0, 3).map(s => (
                                <Badge key={s} variant="secondary" className="text-[8px] font-black uppercase bg-slate-50 dark:bg-slate-800 text-slate-400 border-none rounded-sm px-1.5">
                                  {s}
                                </Badge>
                              ))}
                              {cluster.sourceCount > 3 && <span className="text-[8px] font-black text-slate-300">+{cluster.sourceCount - 3}</span>}
                            </div>
                            {getBiasBadge(cluster.biasScore)}
                          </div>
                          <CardTitle className="text-2xl font-serif font-black leading-tight italic group-hover:text-sky-700 transition-colors">
                            {cluster.representativeTitle || "Synthesized Report"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-6 pt-4">
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic font-serif line-clamp-3">
                            "{cluster.neutralSummary}"
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <h5 className="text-[8px] font-black uppercase tracking-widest text-slate-400">Information Topology</h5>
                              <span className="text-[8px] font-black text-emerald-600 uppercase">{(cluster.consensusFactor * 100).toFixed(0)}% OVERLAP</span>
                            </div>
                            <ConsensusTopology sourceNames={cluster.sourceSpread} dispersion={cluster.biasScore} />
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-100 dark:border-slate-800">
                              <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Aggregate Slant</span>
                              <span className={cn("text-[10px] font-black uppercase",
                                cluster.meanSlant < -0.15 ? 'text-sky-600' : cluster.meanSlant > 0.15 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100')}>
                                {cluster.meanSlant < -0.15 ? 'Progressive' : cluster.meanSlant > 0.15 ? 'Conservative' : 'Neutralized'}
                              </span>
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center border border-slate-100 dark:border-slate-800">
                              <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Priority Score</span>
                              <span className="text-[10px] font-black text-slate-900 dark:text-slate-100">{(cluster.impactScore || 0).toFixed(1)}</span>
                            </div>
                          </div>
                        </CardContent>
                        <div className="mt-auto p-6 pt-0 flex items-center justify-between border-t border-slate-50 dark:border-slate-800">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Archival ID: {cluster.id.slice(0, 8)}</span>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedCluster(cluster)} className="text-[10px] font-bold uppercase tracking-widest hover:text-sky-600 h-8">
                            <Fingerprint className="h-3.5 w-3.5 mr-2" /> Audit Trail
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-40 border-2 border-dashed rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-slate-100">
                  <div className="mx-auto h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <Newspaper className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold italic">No intelligence localized for this cycle.</h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-10 max-w-sm mx-auto">Veritas Lens requires active ingestion to synthesize today's digital broadsheet.</p>
                  <div className="flex justify-center gap-4">
                    <Button asChild variant="outline" className="font-bold uppercase text-[10px] h-11 px-6 border-2">
                      <Link to="/sources"><Rss className="mr-2 h-4 w-4" /> Source Setup</Link>
                    </Button>
                    <Button onClick={() => pipelineMutation.mutate()} disabled={pipelineMutation.isPending} className="bg-sky-600 text-white font-bold uppercase text-[10px] h-11 px-8 shadow-lg transition-transform active:scale-95">
                      <Zap className="mr-2 h-4 w-4" /> Execute Pipeline
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="topology" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {digest?.clusters && digest.clusters.length > 0 ? (
                <ConsensusMap clusters={digest.clusters} height={650} />
              ) : (
                <div className="h-[600px] flex items-center justify-center border-2 border-dashed rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-100">
                  <p className="text-muted-foreground italic font-serif">Global topology mapping requires a synthesized intelligence digest.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
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