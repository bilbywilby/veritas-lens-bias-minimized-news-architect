import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, History, FileText, ChevronRight, Download, Eye } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api-client';
import type { DailyDigest } from '@shared/news-types';
import { format } from 'date-fns';
export function ArchivePage() {
  const [selectedDigest, setSelectedDigest] = useState<DailyDigest | null>(null);
  const { data: archive, isLoading } = useQuery<{ items: DailyDigest[] }>({
    queryKey: ['digest-archive'],
    queryFn: () => api<{ items: DailyDigest[] }>('/api/digest/list?limit=50')
  });
  return (
    <AppLayout container>
      <div className="mb-10">
        <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-50">Archive Vault</h2>
        <p className="text-muted-foreground mt-2">Explore the historical evolution of global reporting clusters.</p>
      </div>
      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />)
        ) : archive?.items.map((digest) => (
          <Card key={digest.id} className="hover:border-sky-300 dark:hover:border-sky-800 transition-colors cursor-pointer group" onClick={() => setSelectedDigest(digest)}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center justify-center h-16 w-16 rounded-xl bg-slate-50 dark:bg-slate-800 border group-hover:bg-sky-50 dark:group-hover:bg-sky-950 transition-colors">
                    <span className="text-[10px] font-bold uppercase text-slate-400">{format(new Date(digest.generatedAt), "MMM")}</span>
                    <span className="text-2xl font-serif font-bold">{format(new Date(digest.generatedAt), "dd")}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                      {digest.clusters[0]?.representativeTitle || "Archived Digest"}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center"><FileText className="h-3 w-3 mr-1" /> {digest.clusterCount} Clusters</span>
                      <span className="flex items-center"><History className="h-3 w-3 mr-1" /> {format(new Date(digest.generatedAt), "h:mm a")}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-300 group-hover:text-sky-600">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && archive?.items.length === 0 && (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed">
            <History className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500 italic">No archived intelligence found. Run the pipeline to begin recording history.</p>
          </div>
        )}
      </div>
      <Dialog open={!!selectedDigest} onOpenChange={() => setSelectedDigest(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedDigest && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start pr-8">
                  <div>
                    <DialogTitle className="font-serif text-3xl italic">{format(new Date(selectedDigest.generatedAt), "MMMM do, yyyy")}</DialogTitle>
                    <DialogDescription className="mt-2">Daily synthesis of {selectedDigest.articleCount} reports.</DialogDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/digest/${selectedDigest.id}/csv`}>
                      <Download className="mr-2 h-4 w-4" /> Export CSV
                    </a>
                  </Button>
                </div>
              </DialogHeader>
              <div className="mt-6 space-y-6">
                {selectedDigest.clusters.map((c, i) => (
                  <div key={i} className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/50">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Badge variant="outline" className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-white dark:bg-slate-900">{i+1}</Badge>
                      {c.representativeTitle}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.neutralSummary}</p>
                    <div className="flex gap-1 mt-3">
                      {c.sourceSpread.map(s => <span key={s} className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-tighter bg-sky-50 dark:bg-sky-900/30 px-1.5 rounded">{s}</span>)}
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