import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Zap, FileJson, Share2, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
    mutationFn: () => api<DailyDigest>('/api/pipeline/run', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latest-digest'] });
      toast.success("Intelligence pipeline complete. New digest generated.");
    },
    onError: () => toast.error("Pipeline failure. Check source feeds.")
  });
  const exportCSV = () => {
    if (!digest) return;
    const headers = ["Title", "Sources", "Impact", "Link"];
    const rows = digest.clusters.map(c => [
      `"${c.representativeTitle.replace(/"/g, '""')}"`,
      `"${c.sourceSpread.join(', ')}"`,
      c.impactScore,
      c.articles[0]?.link
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `veritas-lens-${digest.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <AppLayout container>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-900 italic">The Daily Intelligence</h2>
          <p className="text-muted-foreground font-medium">
            {digest ? format(new Date(digest.generatedAt), "EEEE, MMMM do, yyyy") : "Verifying Global Information Streams..."}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportCSV} disabled={!digest}>
            <FileJson className="mr-2 h-4 w-4" /> Export Report
          </Button>
          <Button onClick={() => pipelineMutation.mutate()} disabled={pipelineMutation.isPending} className="bg-sky-600 hover:bg-sky-700">
            <Zap className={`mr-2 h-4 w-4 ${pipelineMutation.isPending ? 'animate-pulse' : ''}`} />
            {pipelineMutation.isPending ? "Neutralizing Bias..." : "Regenerate Digest"}
          </Button>
        </div>
      </div>
      {digest && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white border-l-4 border-l-sky-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-tighter text-[10px] font-bold">Articles Scraped</CardDescription>
              <CardTitle className="text-4xl font-serif">{digest.articleCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white border-l-4 border-l-indigo-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-tighter text-[10px] font-bold">Clusters Formed</CardDescription>
              <CardTitle className="text-4xl font-serif">{digest.clusterCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white border-l-4 border-l-emerald-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-tighter text-[10px] font-bold">Consensus Index</CardDescription>
              <CardTitle className="text-4xl font-serif">84%</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 w-full bg-slate-200 animate-pulse rounded-xl" />)}
        </div>
      ) : digest ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {digest.clusters.map((cluster) => (
            <Card key={cluster.id} className="group hover:shadow-md transition-all border-slate-200 overflow-hidden bg-white">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    {cluster.sourceSpread.map(s => (
                      <Badge key={s} variant="secondary" className="text-[10px] font-bold bg-slate-100 text-slate-700">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <Badge className="bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-50">
                    Density: {cluster.impactScore}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-serif leading-snug group-hover:text-sky-800 transition-colors">
                  {cluster.representativeTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 leading-relaxed mb-6 italic border-l-2 border-slate-200 pl-4">
                  {cluster.neutralSummary}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex -space-x-2 overflow-hidden">
                    {cluster.sourceSpread.map((s, i) => (
                      <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                        {s[0]}
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" asChild className="text-sky-600 hover:text-sky-700">
                    <a href={cluster.articles[0]?.link} target="_blank" rel="noreferrer">
                      View Citations <Share2 className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Newspaper className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-xl font-serif font-bold text-slate-900">No Intelligence Available</h3>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">Launch the pipeline to ingest and analyze multi-source reporting.</p>
          <Button onClick={() => pipelineMutation.mutate()} className="bg-sky-600">
            Initial Scrape
          </Button>
        </div>
      )}
    </AppLayout>
  );
}