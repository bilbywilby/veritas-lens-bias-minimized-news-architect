import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Zap, FileDown, Share2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { DailyDigest } from '@shared/news-types';
import { format } from 'date-fns';
export function HomePage() {
  const queryClient = useQueryClient();
  const { data: digest, isLoading } = useQuery<DailyDigest | null>({
    queryKey: ['latest-digest'],
    queryFn: () => api<DailyDigest | null>('/api/digest/latest')
  });
  const pipelineMutation = useMutation({
    mutationFn: () => {
      const toastId = toast.loading("Executing intelligence pipeline...", {
        description: "Fetching feeds and clustering reporting..."
      });
      return api<DailyDigest>('/api/pipeline/run', { method: 'POST' }).then(res => {
        toast.dismiss(toastId);
        return res;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latest-digest'] });
      toast.success("Intelligence complete", { description: "New daily digest has been architected." });
    },
    onError: () => toast.error("Pipeline failure", { description: "Verification failed. Check source registry." })
  });
  const handleDownloadCSV = () => {
    if (!digest) return;
    window.location.href = `/api/digest/${digest.id}/csv`;
  };
  return (
    <AppLayout container>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-50 italic">The Daily Lens</h2>
          <p className="text-muted-foreground font-medium mt-1">
            {digest ? format(new Date(digest.generatedAt), "EEEE, MMMM do, yyyy") : "Verifying Global Information Streams..."}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDownloadCSV} disabled={!digest}>
            <FileDown className="mr-2 h-4 w-4" /> Download CSV
          </Button>
          <Button onClick={() => pipelineMutation.mutate()} disabled={pipelineMutation.isPending} className="bg-sky-600 hover:bg-sky-700 shadow-md">
            <Zap className={`mr-2 h-4 w-4 ${pipelineMutation.isPending ? 'animate-spin' : ''}`} />
            {pipelineMutation.isPending ? "Neutralizing Bias..." : "Regenerate Digest"}
          </Button>
        </div>
      </div>
      {digest && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-sky-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-tighter text-[10px] font-bold">Articles Ingested</CardDescription>
              <CardTitle className="text-4xl font-serif">{digest.articleCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-tighter text-[10px] font-bold">Primary Clusters</CardDescription>
              <CardTitle className="text-4xl font-serif">{digest.clusterCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-tighter text-[10px] font-bold">Consensus Score</CardDescription>
              <CardTitle className="text-4xl font-serif">8.4/10</CardTitle>
            </CardHeader>
          </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : digest ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {digest.clusters.map((cluster) => (
            <Card key={cluster.id} className="group hover:shadow-xl transition-all border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.sourceSpread.map(s => (
                      <Badge key={s} variant="secondary" className="text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <Badge className="bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-900">
                    Density: {cluster.sourceCount}
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-serif leading-tight group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                  {cluster.representativeTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 border-l-2 border-sky-200 dark:border-sky-900 pl-4 italic">
                  {cluster.neutralSummary}
                </p>
              </CardContent>
              <div className="mt-auto p-6 pt-0 flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                <div className="flex -space-x-2">
                  {cluster.sourceSpread.map((s, i) => (
                    <div key={i} className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {s[0]}
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" asChild className="text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20">
                  <a href={cluster.articles[0]?.link} target="_blank" rel="noreferrer">
                    Full Coverage <Share2 className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
          <Newspaper className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-700 mb-6" />
          <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">No Intelligence Architected</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">Launch the edge pipeline to analyze and synthesize global multi-source reporting.</p>
          <Button onClick={() => pipelineMutation.mutate()} size="lg" className="bg-sky-600 hover:bg-sky-700 px-10">
            Run Initial Scrape
          </Button>
        </div>
      )}
    </AppLayout>
  );
}