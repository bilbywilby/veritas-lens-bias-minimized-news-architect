import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Zap, FileDown, Calendar as CalendarIcon, Mail, Network, LayoutList, Fingerprint, TrendingUp, TrendingDown, Minus, HelpCircle, Rss } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConsensusMap } from '@/components/ConsensusMap';
import { ConsensusTimeline } from '@/components/ConsensusTimeline';
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
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const { data: digest, isLoading } = useQuery<DailyDigest | null>({
    queryKey: ['digest', formattedDate],
    queryFn: () => api<any>(`/api/digest/list?date=${formattedDate}&limit=1`).then(res => res?.items?.[0] || null)
  });
  const { data: timelineData } = useQuery<any[]>({
    queryKey: ['analytics-consensus'],
    queryFn: () => api<any[]>('/api/analytics/consensus')
  });
  const pipelineMutation = useMutation({
    mutationFn: () => api<DailyDigest>(`/api/pipeline/run`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digest'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-consensus'] });
      toast.success("Intelligence cycle complete");
    },
    onError: () => toast.error("Pipeline failure: check information streams")
  });
  const getBiasBadge = (score: number = 0) => {
    if (score < 0.2) return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">High Consensus</Badge>;
    if (score < 0.4) return <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50">Moderate Variance</Badge>;
    return <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50">High Divergence</Badge>;
  };
  const trendIndicator = (current: number) => {
    if (!timelineData || timelineData.length < 2) return null;
    const prev = timelineData[timelineData.length - 2]?.score || current;
    const diff = current - prev;
    if (Math.abs(diff) < 0.1) return <Minus className="h-3 w-3 text-slate-400" />;
    return diff > 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-rose-500" />;
  };
  const isSample = digest?.id?.includes('sample');
  return (
    <AppLayout container>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <div className="border-y-2 border-slate-900 dark:border-slate-100 py-6 mb-12 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
              <div className="hidden md:flex items-center gap-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Issue No. {digest?.id?.split('-').join('') || 'ALPHA'}
                </div>
                {isSample && <Badge variant="outline" className="text-[8px] border-amber-200 bg-amber-50 text-amber-600 font-black uppercase tracking-tighter">Sample Record</Badge>}
              </div>
              <h2 className="text-6xl md:text-7xl font-serif font-black text-slate-900 dark:text-slate-50 italic tracking-tighter text-center uppercase">
                Veritas Lens
              </h2>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {format(new Date(), "EEEE, MMMM do, yyyy")}
              </div>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="font-black uppercase text-[10px] tracking-widest border-2">
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    Archive: {date ? format(date, "MMM dd") : "Select Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                Status: {pipelineMutation.isPending ? 'Neutralizing...' : 'Live Ingestion active'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowTour(true)} className="text-[10px] font-bold uppercase tracking-widest">
                <HelpCircle className="mr-2 h-4 w-4" /> Walkthrough
              </Button>
              <Button variant="outline" size="sm" onClick={() => digest && (window.location.href = `/api/digest/${digest.id}/csv`)} disabled={!digest} className="border-2 font-bold uppercase text-[10px]">
                <FileDown className="mr-2 h-4 w-4" /> Download Intelligence
              </Button>
              <Button onClick={() => pipelineMutation.mutate()} disabled={pipelineMutation.isPending} className="bg-sky-600 hover:bg-sky-700 font-bold uppercase text-[10px] tracking-widest h-9 px-6">
                <Zap className={cn("mr-2 h-4 w-4", pipelineMutation.isPending && "animate-spin")} />
                {pipelineMutation.isPending ? "Neutralizing..." : "Execute Pipeline"}
              </Button>
            </div>
          </div>
          {timelineData && timelineData.length > 1 && (
            <div className="mb-12">
              <ConsensusTimeline data={timelineData} />
            </div>
          )}
          <Tabs defaultValue="briefing" className="space-y-8">
            <TabsList className="grid w-full max-w-sm grid-cols-2 bg-slate-100 dark:bg-slate-900 h-10 p-1">
              <TabsTrigger value="briefing" className="font-bold uppercase text-[10px] tracking-widest"><LayoutList className="mr-2 h-3 w-3"/> Morning Briefing</TabsTrigger>
              <TabsTrigger value="topology" className="font-bold uppercase text-[10px] tracking-widest"><Network className="mr-2 h-3 w-3"/> Information Topology</TabsTrigger>
            </TabsList>
            <TabsContent value="briefing" className="space-y-8 animate-in fade-in duration-500">
              {digest && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Articles Processed', val: digest.articleCount, color: 'text-sky-600', trend: null },
                    { label: 'Neutral Clusters', val: digest.clusterCount, color: 'text-indigo-600', trend: null },
                    { label: 'Consensus Index', val: `${(digest.consensusScore ?? 8.5).toFixed(1)}/10`, color: 'text-emerald-600', trend: digest.consensusScore }
                  ].map((stat, i) => (
                    <Card key={i} className="border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <CardDescription className={cn("uppercase tracking-tighter text-[10px] font-black", stat.color)}>{stat.label}</CardDescription>
                          {stat.trend !== null && trendIndicator(stat.trend)}
                        </div>
                        <CardTitle className="text-4xl font-serif">{stat.val}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
              {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-72 w-full bg-slate-100 dark:bg-slate-900 animate-pulse rounded-2xl" />)}
                </div>
              ) : digest ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {digest.clusters.map((cluster) => (
                    <motion.div key={cluster.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                      <Card className="h-full group border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col overflow-hidden hover:ring-sky-500 transition-all border-l-4 border-l-slate-900 dark:border-l-slate-100">
                        <CardHeader>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-wrap gap-1">
                              {cluster.sourceSpread.slice(0, 3).map(s => (
                                <Badge key={s} variant="secondary" className="text-[8px] font-black uppercase bg-slate-50 dark:bg-slate-800 text-slate-400 border-none">
                                  {s}
                                </Badge>
                              ))}
                              {cluster.sourceCount > 3 && <Badge variant="secondary" className="text-[8px] font-black uppercase bg-slate-50 dark:bg-slate-800 text-slate-400 border-none">+{cluster.sourceCount - 3}</Badge>}
                            </div>
                            {getBiasBadge(cluster.biasScore)}
                          </div>
                          <CardTitle className="text-2xl font-serif font-black leading-tight italic">{cluster.representativeTitle}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 italic font-serif">
                            "{cluster.neutralSummary.substring(0, 200)}..."
                          </p>
                          <div className="flex gap-4">
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                              <span className="block text-[8px] font-black uppercase text-slate-400 mb-1">Mean Slant</span>
                              <span className={cn("text-[10px] font-black uppercase", cluster.meanSlant < -0.1 ? 'text-sky-600' : cluster.meanSlant > 0.1 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100')}>
                                {cluster.meanSlant < -0.1 ? 'Progressive' : cluster.meanSlant > 0.1 ? 'Conservative' : 'Neutral'}
                              </span>
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                              <span className="block text-[8px] font-black uppercase text-slate-400 mb-1">Consensus</span>
                              <span className="text-[10px] font-black text-slate-900 dark:text-slate-100">{(cluster.consensusFactor * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </CardContent>
                        <div className="mt-auto p-6 pt-0 flex items-center justify-between border-t border-slate-50 dark:border-slate-800">
                          <Badge className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[9px] font-black uppercase tracking-widest py-1">Priority: {cluster.impactScore.toFixed(1)}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedCluster(cluster)} className="text-[10px] font-bold uppercase tracking-widest hover:text-sky-600">
                            <Fingerprint className="h-3 w-3 mr-2" /> Audit Trail
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-32 border-2 border-dashed rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
                  <Newspaper className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-xl font-serif font-bold italic">Intelligence Gap Detected</h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-8">No localized digest exists for this date. Configure your streams to begin ingestion.</p>
                  <Button asChild className="bg-sky-600 hover:bg-sky-700 font-bold uppercase text-[10px]">
                    <Link to="/sources"><Rss className="mr-2 h-4 w-4" /> Registry Setup</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="topology" className="animate-in fade-in duration-500">
              {digest ? (
                <ConsensusMap clusters={digest.clusters} height={600} />
              ) : (
                <div className="h-[600px] flex items-center justify-center border-2 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900">
                  <p className="text-muted-foreground italic">Topology visualization requires a localized intelligence digest.</p>
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