import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Zap, FileDown, Calendar as CalendarIcon, Mail, Network, LayoutList, Fingerprint } from 'lucide-react';
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
import { NeutralizationDeepDive } from '@/components/NeutralizationDeepDive';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DailyDigest, NewsCluster } from '@shared/news-types';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
export function HomePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [emailTo, setEmailTo] = useState('');
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<NewsCluster | null>(null);
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const { data: digest, isLoading } = useQuery<DailyDigest | null>({
    queryKey: ['digest', formattedDate],
    queryFn: () => api<any>(`/api/digest/list?date=${formattedDate}&limit=1`).then(res => res?.items?.[0] || null)
  });
  const pipelineMutation = useMutation({
    mutationFn: () => api<DailyDigest>(`/api/pipeline/run`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digest'] });
      toast.success("Intelligence complete");
    },
    onError: () => toast.error("Pipeline failure")
  });
  const emailMutation = useMutation({
    mutationFn: (id: string) => api(`/api/digest/${id}/send`, { method: 'POST', body: JSON.stringify({ email: emailTo }) }),
    onSuccess: () => {
      toast.success("Transmission successful");
      setIsEmailDialogOpen(false);
    }
  });
  const getBiasBadge = (score: number = 0) => {
    if (score < 0.3) return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">Strong Consensus</Badge>;
    if (score < 0.6) return <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50">Moderate Variance</Badge>;
    return <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50">High Divergence</Badge>;
  };
  return (
    <AppLayout container>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
            <div>
              <h2 className="text-5xl font-serif font-bold text-slate-900 dark:text-slate-50 italic tracking-tighter">The Daily Lens</h2>
              <div className="flex items-center gap-2 mt-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 border-dashed font-bold uppercase text-[10px]">
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {date ? format(date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                  Autonomous Neutralization Protocol
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsEmailDialogOpen(true)} disabled={!digest}>
                <Mail className="mr-2 h-4 w-4" /> Distribute
              </Button>
              <Button variant="outline" size="sm" onClick={() => digest && (window.location.href = `/api/digest/${digest.id}/csv`)} disabled={!digest}>
                <FileDown className="mr-2 h-4 w-4" /> Export
              </Button>
              <Button onClick={() => pipelineMutation.mutate()} disabled={pipelineMutation.isPending} className="bg-sky-600 hover:bg-sky-700 font-bold uppercase text-xs">
                <Zap className={cn("mr-2 h-4 w-4", pipelineMutation.isPending && "animate-spin")} />
                {pipelineMutation.isPending ? "Neutralizing..." : "Execute Pipeline"}
              </Button>
            </div>
          </div>
          <Tabs defaultValue="briefing" className="space-y-8">
            <TabsList className="grid w-full max-w-sm grid-cols-2 bg-slate-100 dark:bg-slate-900 h-10 p-1">
              <TabsTrigger value="briefing" className="font-bold uppercase text-[10px] tracking-widest"><LayoutList className="mr-2 h-3 w-3"/> Briefing</TabsTrigger>
              <TabsTrigger value="topology" className="font-bold uppercase text-[10px] tracking-widest"><Network className="mr-2 h-3 w-3"/> Topology</TabsTrigger>
            </TabsList>
            <TabsContent value="briefing" className="space-y-8 animate-in fade-in duration-500">
              {digest && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Articles Ingested', val: digest.articleCount, color: 'text-sky-600' },
                    { label: 'Neutral Clusters', val: digest.clusterCount, color: 'text-indigo-600' },
                    { label: 'Consensus Score', val: `${(digest.consensusScore ?? 8.5).toFixed(1)}/10`, color: 'text-emerald-600' }
                  ].map((stat, i) => (
                    <Card key={i} className="border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                      <CardHeader className="pb-4">
                        <CardDescription className={cn("uppercase tracking-tighter text-[10px] font-black", stat.color)}>{stat.label}</CardDescription>
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
                    <motion.div key={cluster.id} whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                      <Card className="h-full group border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col overflow-hidden hover:ring-sky-500 transition-all">
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
                          <CardTitle className="text-2xl font-serif leading-tight italic">{cluster.representativeTitle}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 border-l-2 border-sky-100 dark:border-sky-900 pl-4 line-clamp-3">
                            {cluster.neutralSummary}
                          </p>
                          <div className="flex gap-4">
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                              <span className="block text-[8px] font-black uppercase text-slate-400 mb-1">Mean Slant</span>
                              <span className={`text-[10px] font-bold ${cluster.meanSlant < -0.1 ? 'text-blue-600' : cluster.meanSlant > 0.1 ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
                                {cluster.meanSlant < -0.1 ? 'Progressive' : cluster.meanSlant > 0.1 ? 'Conservative' : 'Neutral'}
                              </span>
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                              <span className="block text-[8px] font-black uppercase text-slate-400 mb-1">Consensus</span>
                              <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100">{(cluster.consensusFactor * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </CardContent>
                        <div className="mt-auto p-6 pt-0 flex items-center justify-between border-t border-slate-50 dark:border-slate-800">
                          <Badge className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest py-1">Impact: {cluster.impactScore.toFixed(1)}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedCluster(cluster)} className="text-[10px] font-bold uppercase tracking-widest hover:text-sky-600">
                            <Fingerprint className="h-3 w-3 mr-2" /> Deep Analysis
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-32 border-2 border-dashed rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
                  <Newspaper className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-xl font-serif font-bold italic">No Intelligence Found</h3>
                  <p className="text-sm text-muted-foreground mt-2">The vault is empty for this date.</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="topology" className="animate-in fade-in duration-500">
              {digest ? (
                <ConsensusMap clusters={digest.clusters} height={600} />
              ) : (
                <div className="h-[600px] flex items-center justify-center border-2 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900">
                  <p className="text-muted-foreground italic">Topology view requires an active digest.</p>
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
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif italic text-2xl">Intelligence Distribution</DialogTitle>
            <DialogDescription>Dispatch truth-first reporting CSV to your agency inbox.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest">Recipient</Label>
              <Input id="email" placeholder="analyst@agency.gov" value={emailTo} onChange={e => setEmailTo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEmailDialogOpen(false)}>Abort</Button>
            <Button onClick={() => digest && emailMutation.mutate(digest.id)} disabled={!emailTo.includes('@') || emailMutation.isPending}>
              {emailMutation.isPending ? "Transmitting..." : "Send Transmission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}