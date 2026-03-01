import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Globe, Shield, Activity, TrendingUp } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { NewsSource } from '@shared/news-types';
export function SourcesPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', slant: 0 });
  const { data: sources, isLoading } = useQuery<{ items: NewsSource[] }>({
    queryKey: ['news-sources'],
    queryFn: () => api<{ items: NewsSource[] }>('/api/sources')
  });
  const patchMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<NewsSource> }) =>
      api<NewsSource>(`/api/sources/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news-sources'] })
  });
  const addMutation = useMutation({
    mutationFn: (source: any) => api<NewsSource>('/api/sources', { method: 'POST', body: JSON.stringify(source) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-sources'] });
      setIsAddOpen(false);
      setNewSource({ name: '', url: '', slant: 0 });
      toast.success("Stream registered.");
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/sources/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news-sources'] })
  });
  return (
    <AppLayout container>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <div className="flex justify-between items-end mb-10 border-b border-slate-100 pb-8">
            <div>
              <h2 className="text-4xl font-serif font-bold text-slate-900 tracking-tight italic">Source Registry</h2>
              <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-widest">Information Stream Configuration</p>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-sky-600 hover:bg-sky-700 font-bold uppercase text-[10px] tracking-widest">
                  <Plus className="mr-2 h-4 w-4" /> Register Stream
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-serif italic text-2xl">New Information Stream</DialogTitle></DialogHeader>
                <div className="grid gap-6 py-6">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Publisher Identity</Label>
                    <Input value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} placeholder="e.g. Associated Press" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest">RSS Endpoint</Label>
                    <Input value={newSource.url} onChange={e => setNewSource({...newSource, url: e.target.value})} placeholder="https://..." />
                  </div>
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Political Slant Profile</Label>
                      <span className="text-[10px] font-bold text-sky-600">{newSource.slant.toFixed(1)}</span>
                    </div>
                    <Slider value={[newSource.slant]} max={1} min={-1} step={0.1} onValueChange={([v]) => setNewSource({...newSource, slant: v})} />
                    <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                      <span>Progressive</span><span>Neutral</span><span>Conservative</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Abort</Button>
                  <Button onClick={() => addMutation.mutate(newSource)} disabled={!newSource.name || !newSource.url}>Finalize Registry</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 border-b">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Stream Identity</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Reliability / Slant</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources?.items.map((source) => (
                  <TableRow key={source.id} className="border-b last:border-0">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center text-sky-600"><Globe className="h-5 w-5" /></div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{source.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-xs">{source.url}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={source.active} onCheckedChange={(c) => patchMutation.mutate({ id: source.id, updates: { active: c } })} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{source.active ? 'Active' : 'Muted'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-48 space-y-4">
                        <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase">
                          <span className="flex items-center gap-1"><Shield className="h-2 w-2"/> Lvl {source.weight}</span>
                          <span className="flex items-center gap-1"><TrendingUp className="h-2 w-2"/> Slant: {source.slant}</span>
                        </div>
                        <Slider defaultValue={[source.slant]} min={-1} max={1} step={0.1} onValueCommit={([v]) => patchMutation.mutate({ id: source.id, updates: { slant: v } })} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(source.id)} className="text-slate-300 hover:text-rose-600"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}