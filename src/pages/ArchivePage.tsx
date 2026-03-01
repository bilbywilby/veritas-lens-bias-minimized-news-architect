import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, ChevronRight, Download, Search, AlertCircle, ShieldAlert, Database, Fingerprint } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ForensicSearch } from '@/components/ForensicSearch';
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
  const filteredArchive = useMemo(() => {
    return archive?.items.filter(d =>
      d.clusters.some(c => c.representativeTitle.toLowerCase().includes(searchTerm.toLowerCase()))
    ) ?? [];
  }, [archive, searchTerm]);
  return (
    <AppLayout container>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8 border-b border-slate-200 dark:border-slate-800 pb-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-5 w-5 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Historical Intelligence Records</span>
              </div>
              <h2 className="text-5xl font-serif font-bold text-slate-900 dark:text-slate-50 italic tracking-tighter">Archive Vault</h2>
              <p className="text-muted-foreground mt-3 text-sm font-medium italic">Retrospective analysis of global reporting clusters and forensic story discovery.</p>
            </div>
          </div>
          <Tabs defaultValue="digests" className="space-y-10">
            <TabsList className="bg-slate-100 dark:bg-slate-900 h-11 p-1">
              <TabsTrigger value="digests" className="font-bold text-[10px] uppercase tracking-widest px-6">
                <Database className="h-3.5 w-3.5 mr-2" /> Digest Archival
              </TabsTrigger>
              <TabsTrigger value="forensic" className="font-bold text-[10px] uppercase tracking-widest px-6">
                <Fingerprint className="h-3.5 w-3.5 mr-2" /> Forensic Search
              </TabsTrigger>
            </TabsList>
            <TabsContent value="digests" className="space-y-8 animate-in fade-in duration-500">
              <div className="relative w-full max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-sky-600" />
                <Input
                  placeholder="Filter historical digests..."
                  className="pl-10 h-11 border-2"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-6">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
                ) : filteredArchive.length > 0 ? (
                  filteredArchive.map((digest) => (
                    <Card
                      key={digest.id}
                      className="hover:ring-2 hover:ring-sky-500/20 transition-all cursor-pointer group shadow-sm border-none bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800"
                      onClick={() => setSelectedDigest(digest)}
                    >
                      <CardContent className="p-0">
                        <div className="flex items-center justify-between p-8">
                          <div className="flex items-center gap-10">
                            <div className="flex flex-col items-center justify-center h-20 w-20 rounded-2xl bg-slate-50 dark:bg-slate-800">
                              <span className="text-[11px] font-black uppercase text-slate-400">{format(new Date(digest.generatedAt), "MMM")}</span>
                              <span className="text-3xl font-serif font-bold italic">{format(new Date(digest.generatedAt), "dd")}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 truncate max-w-md lg:max-w-2xl font-serif italic mb-2">
                                {digest.clusters[0]?.representativeTitle || "Synthesized Report"}
                              </h3>
                              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                <span className="flex items-center font-black uppercase text-[10px] tracking-widest"><FileText className="h-3 w-3 mr-2 text-sky-600" /> {digest.clusterCount} CLUSTERS</span>
                                <span className="text-[10px] font-bold opacity-60 italic">{format(new Date(digest.generatedAt), "h:mm a")}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-6 w-6 text-slate-200 group-hover:text-sky-600 transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-32 bg-slate-50/50 rounded-3xl border-2 border-dashed">
                    <AlertCircle className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                    <p className="text-slate-400 italic font-serif">No archived intelligence localized.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="forensic" className="animate-in fade-in duration-500">
              <ForensicSearch />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Dialog open={!!selectedDigest} onOpenChange={() => setSelectedDigest(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-[#fcfcfc] dark:bg-slate-950 p-0 border-2">
          {selectedDigest && (
            <div className="p-10">
              <DialogHeader className="mb-10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-600 mb-2">Cycle verification audit</div>
                    <DialogTitle className="font-serif text-4xl italic">{format(new Date(selectedDigest.generatedAt), "MMMM do, yyyy")}</DialogTitle>
                  </div>
                  <Button variant="outline" className="font-black uppercase text-[10px] tracking-widest border-2" asChild>
                    <a href={`/api/digest/${selectedDigest.id}/csv`}>
                      <Download className="mr-2 h-4 w-4" /> Download Dataset
                    </a>
                  </Button>
                </div>
              </DialogHeader>
              <div className="space-y-8">
                {selectedDigest.clusters.map((c, i) => (
                  <div key={i} className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 hover:border-sky-100 transition-all shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <Badge className="h-8 w-8 rounded-lg p-0 flex items-center justify-center bg-slate-900 text-white font-serif text-lg">{i+1}</Badge>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xl font-serif italic">{c.representativeTitle}</h4>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-12 border-l-2 italic font-serif mb-6">{c.neutralSummary}</p>
                    <div className="flex flex-wrap gap-2 pl-12">
                      {c.sourceSpread.map(s => <span key={s} className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">{s}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}