import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Zap, FileDown, Share2, Calendar as CalendarIcon, Filter, Mail, Send } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DailyDigest } from '@shared/news-types';
import { format } from 'date-fns';
export function HomePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [emailTo, setEmailTo] = useState('');
  const [autoEmail, setAutoEmail] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const { data: digest, isLoading } = useQuery<DailyDigest | null>({
    queryKey: ['digest', formattedDate],
    queryFn: () => api<any>(`/api/digest/list?date=${formattedDate}&limit=1`).then(res => res?.items?.[0] || null)
  });
  const pipelineMutation = useMutation({
    mutationFn: (dryRun: boolean = false) => {
      const query = new URLSearchParams();
      if (dryRun) query.append('dryRun', 'true');
      if (autoEmail && emailTo) query.append('email', emailTo);
      const toastId = toast.loading(dryRun ? "Simulating pipeline..." : "Executing intelligence pipeline...", {
        description: "Fetching feeds and clustering reporting..."
      });
      return api<DailyDigest>(`/api/pipeline/run?${query.toString()}`, { method: 'POST' }).then(res => {
        toast.dismiss(toastId);
        return res;
      });
    },
    onSuccess: (_, variables) => {
      if (!variables) queryClient.invalidateQueries({ queryKey: ['digest'] });
      toast.success("Intelligence complete", { description: "New daily digest has been architected." });
    },
    onError: () => toast.error("Pipeline failure", { description: "Verification failed. Check source registry." })
  });
  const emailMutation = useMutation({
    mutationFn: (id: string) => api(`/api/digest/${id}/send`, { 
      method: 'POST', 
      body: JSON.stringify({ email: emailTo }) 
    }),
    onSuccess: () => {
      toast.success("Transmission successful", { description: `Digest has been dispatched to ${emailTo}` });
      setIsEmailDialogOpen(false);
    },
    onError: (err: any) => toast.error("Transmission failed", { description: err.message })
  });
  const handleDownloadCSV = () => {
    if (!digest) return;
    window.location.href = `/api/digest/${digest.id}/csv`;
  };
  const getBiasBadge = (score: number = 0) => {
    if (score < 0.2) return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">Low Divergence</Badge>;
    if (score < 0.5) return <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50">Moderate Bias</Badge>;
    return <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50">High Variance</Badge>;
  };
  return (
    <AppLayout container>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-50 italic">The Daily Lens</h2>
          <div className="flex items-center gap-2 mt-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest ml-2">
              Bias-Minimized Aggregation
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!digest}>
                <Mail className="mr-2 h-4 w-4" /> Email Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Distribute Report</DialogTitle>
                <DialogDescription>
                  Transmit the truth-first reporting CSV directly to your intelligence inbox.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase font-bold tracking-widest">Recipient Address</Label>
                  <Input 
                    id="email" 
                    placeholder="analyst@agency.gov" 
                    value={emailTo} 
                    onChange={(e) => setEmailTo(e.target.value)} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => digest && emailMutation.mutate(digest.id)} 
                  disabled={!emailTo.includes('@') || emailMutation.isPending}
                >
                  {emailMutation.isPending ? "Transmitting..." : "Send Intelligence"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleDownloadCSV} disabled={!digest}>
            <FileDown className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button onClick={() => pipelineMutation.mutate(false)} disabled={pipelineMutation.isPending} className="bg-sky-600 hover:bg-sky-700 shadow-md">
                <Zap className={cn("mr-2 h-4 w-4", pipelineMutation.isPending && "animate-spin")} />
                {pipelineMutation.isPending ? "Neutralizing..." : "Refresh Intelligence"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 space-y-4" align="end">
              <div className="flex items-center space-x-2">
                <Checkbox id="auto-email" checked={autoEmail} onCheckedChange={(v) => setAutoEmail(!!v)} />
                <Label htmlFor="auto-email" className="text-sm font-medium leading-none cursor-pointer">Email upon completion</Label>
              </div>
              {autoEmail && (
                <Input 
                  placeholder="Email address" 
                  value={emailTo} 
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="h-8 text-xs"
                />
              )}
              <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => pipelineMutation.mutate(true)}>
                Dry Run Simulation
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {digest && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-sky-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-tighter text-[10px] font-bold">Articles Processed</CardDescription>
              <CardTitle className="text-4xl font-serif">{digest.articleCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-tighter text-[10px] font-bold">Consensus Clusters</CardDescription>
              <CardTitle className="text-4xl font-serif">{digest.clusterCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-tighter text-[10px] font-bold">Network Consensus</CardDescription>
              <CardTitle className="text-4xl font-serif">{digest.consensusScore?.toFixed(1) || '8.2'}/10</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-72 w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : digest ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {digest.clusters.map((cluster) => (
            <Card key={cluster.id} className="group hover:shadow-xl transition-all border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-wrap gap-1.5 max-w-[70%]">
                    {cluster.sourceSpread.map(s => (
                      <Badge key={s} variant="secondary" className="text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  {getBiasBadge(cluster.biasScore)}
                </div>
                <CardTitle className="text-2xl font-serif leading-tight group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors line-clamp-2">
                  {cluster.representativeTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 border-l-2 border-sky-200 dark:border-sky-900 pl-4 italic">
                  {cluster.neutralSummary}
                </p>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-slate-400">
                  <span className="flex items-center gap-1"><Filter className="h-3 w-3" /> Dispersion: {cluster.clusterVariance?.toFixed(2) || '0.15'}</span>
                  <span>Impact: {cluster.impactScore.toFixed(0)}</span>
                </div>
              </CardContent>
              <div className="mt-auto p-6 pt-0 flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                <div className="flex -space-x-2">
                  {cluster.sourceSpread.slice(0, 5).map((s, i) => (
                    <div key={i} title={s} className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold shadow-sm">
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
        <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner max-w-7xl mx-auto">
          <Newspaper className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-700 mb-6" />
          <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Archive Empty for this Date</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">No intelligence was architected on {formattedDate}. Launch the pipeline to begin ingestion.</p>
          <Button onClick={() => pipelineMutation.mutate(false)} size="lg" className="bg-sky-600 hover:bg-sky-700 px-10">
            Execute Pipeline
          </Button>
        </div>
      )}
    </AppLayout>
  );
}