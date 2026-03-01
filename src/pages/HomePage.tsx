import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Calendar as CalendarIcon, RefreshCcw, Loader2, Info, Activity, Fingerprint, Database, ExternalLink } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IntelligenceCard } from '@/components/IntelligenceCard';
import { NeutralizationDeepDive } from '@/components/NeutralizationDeepDive';
import { TourModal } from '@/components/TourModal';
import { SystemPulse } from '@/components/SystemPulse';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { DailyDigest, NewsCluster, SystemState, Article } from '@shared/news-types';
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
        console.error("[HOME PAGE] Digest fetch failure", e);
        return null;
      }
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
      toast.success("Intelligence Synchronized", {
        description: `Synthesized ${data.clusterCount} tight clusters via Propers-Match algorithm.`
      });
    },
    onError: (err: any) => toast.error("Sync Failure", { description: err.message })
  });
  const sortedClusters = digest?.clusters
    ? [...digest.clusters].sort((a, b) => b.impactScore - a.impactScore).slice(0, 10)
    : [];
  const rawArticles: Article[] = digest?.clusters?.flatMap(c => c.articles || []) || [];
  return (
    <AppLayout container>
      <div className="space-y-12">
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
              Top 10 High-Density Clusters
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
                Deduplicating Information...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 mr-3" />
                Synchronize Intelligence Protocol
              </>
            )}
          </Button>
        </div>
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="h-[400px] animate-pulse bg-slate-50 dark:bg-slate-900 border-none" />
              ))}
            </div>
          ) : sortedClusters.length > 0 ? (
            <div className="space-y-16">
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
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b-2 border-slate-900 dark:border-slate-100 pb-4">
                  <Database className="h-6 w-6 text-sky-600" />
                  <h2 className="text-3xl font-serif font-bold italic tracking-tight">Forensic Intelligence Log</h2>
                  <Badge variant="outline" className="ml-auto text-[10px] font-black uppercase">
                    {rawArticles.length} STREAMS CAPTURED
                  </Badge>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border-2 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest w-40">Source Stream</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Headline & Context</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-right w-32">Captured</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawArticles.slice(0, 30).map((article) => (
                        <TableRow key={article.id} className="group border-b last:border-0 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="align-top py-5">
                            <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tight bg-slate-100 text-slate-500">
                              {article.sourceName || "Internal"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-5">
                            <div className="space-y-1.5">
                              <a href={article.link} target="_blank" rel="noreferrer" className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-sky-700 inline-flex items-center gap-1.5 group/link">
                                {article.title}
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100" />
                              </a>
                              <p className="text-xs text-muted-foreground line-clamp-2 italic font-serif leading-relaxed pr-8">
                                {article.contentSnippet || "No forensic context available."}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top py-5 text-right">
                            <span className="text-[10px] font-black uppercase text-slate-400">
                              {article.pubDate ? format(new Date(article.pubDate), 'MMM d, HH:mm') : 'N/A'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {rawArticles.length === 0 && (
                    <div className="py-20 text-center">
                      <Fingerprint className="h-10 w-10 mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 italic font-serif">No forensic signatures localized in current cycle.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-40 border-2 border-dashed rounded-3xl bg-slate-50 dark:bg-slate-950/50">
              <Newspaper className="h-16 w-16 mx-auto text-slate-300 mb-6" />
              <h3 className="text-3xl font-serif italic text-slate-400 mb-4">No Intelligence Localized</h3>
              <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
                The Story Vault requires a fresh synchronization cycle to generate today's high-density reporting clusters.
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