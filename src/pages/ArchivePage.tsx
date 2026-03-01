import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, FileText, ChevronRight, Download, Search, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api-client';
import type { DailyDigest } from '@shared/news-types';
import { format } from 'date-fns';
export function ArchivePage() {
  const [selectedDigest, setSelectedDigest] = useState<DailyDigest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: archive, isLoading } = useQuery<{ items: DailyDigest[] }>({
    queryKey: ['digest-archive'],
    queryFn: () => api<{ items: DailyDigest[] }>('/api/digest/list?limit=50')
  });
  const filteredArchive = archive?.items.filter(d => 
    d.clusters.some(c => c.representativeTitle.toLowerCase().includes(searchTerm.toLowerCase()))
  ) ?? [];
  const getBiasLabel = (clusters: any[]) => {
    const avgBias = clusters.reduce((acc, c) => acc + (c.biasScore || 0), 0) / clusters.length;
    if (avgBias < 0.2) return <Badge variant="outline" className="text-emerald-600 border-emerald-200">Stable</Badge>;
    if (avgBias < 0.4) return <Badge variant="outline" className="text-amber-600 border-amber-200">Divergent</Badge>;
    return <Badge variant="outline" className="text-rose-600 border-rose-200">High Volatility</Badge>;
  };
  return (
    <AppLayout container>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div className="flex-1">
            <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-50">Archive Vault</h2>
            <p className="text-muted-foreground mt-2">Explore the historical evolution of global reporting clusters.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search headlines..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-4">
          {isLoading ? (
            [1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />)
          ) : filteredArchive.length > 0 ? (
            filteredArchive.map((digest) => (
              <Card key={digest.id} className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors cursor-pointer group" onClick={() => setSelectedDigest(digest)}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center justify-center h-16 w-16 rounded-xl bg-slate-50 dark:bg-slate-800 border group-hover:bg-sky-50 dark:group-hover:bg-sky-950 transition-colors">
                        <span className="text-[10px] font-bold uppercase text-slate-400">{format(new Date(digest.generatedAt), "MMM")}</span>
                        <span className="text-2xl font-serif font-bold">{format(new Date(digest.generatedAt), "dd")}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate max-w-md lg:max-w-xl">
                          {digest.clusters[0]?.representativeTitle || "Archived Digest"}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center"><FileText className="h-3 w-3 mr-1" /> {digest.clusterCount} Clusters</span>
                          {getBiasLabel(digest.clusters)}
                          <span className="flex items-center text-xs opacity-60 italic">{format(new Date(digest.generatedAt), "h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-300 group-hover:text-sky-600 shrink-0">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed">
              <AlertCircle className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 italic">No archived intelligence found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
      <Dialog open={!!selectedDigest} onOpenChange={() => setSelectedDigest(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedDigest && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start pr-8">
                  <div>
                    <DialogTitle className="font-serif text-3xl italic">{format(new Date(selectedDigest.generatedAt), "MMMM do, yyyy")}</DialogTitle>
                    <DialogDescription className="mt-2 text-base">
                      Comprehensive synthesis of {selectedDigest.articleCount} cross-referenced reports.
                    </DialogDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/digest/${selectedDigest.id}/csv`}>
                      <Download className="mr-2 h-4 w-4" /> Export Data
                    </a>
                  </Button>
                </div>
              </DialogHeader>
              <div className="mt-8 space-y-6">
                {selectedDigest.clusters.map((c, i) => (
                  <div key={i} className="p-5 rounded-2xl border bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3 text-lg">
                        <Badge variant="secondary" className="h-6 w-6 rounded-full p-0 flex items-center justify-center bg-white dark:bg-slate-900 font-serif">{i+1}</Badge>
                        {c.representativeTitle}
                      </h4>
                      <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded">SCORE: {c.impactScore.toFixed(1)}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 pl-9 border-l-2 border-slate-200">{c.neutralSummary}</p>
                    <div className="flex flex-wrap gap-2 mt-4 pl-9">
                      {c.sourceSpread.map(s => <span key={s} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 border px-1.5 py-0.5 rounded shadow-sm">{s}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}