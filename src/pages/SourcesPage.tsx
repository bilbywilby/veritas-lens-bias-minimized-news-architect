import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Globe, Shield, Activity } from 'lucide-react';
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
  const [newSource, setNewSource] = useState({ name: '', url: '' });
  const { data: sources, isLoading } = useQuery<{ items: NewsSource[] }>({
    queryKey: ['news-sources'],
    queryFn: () => api<{ items: NewsSource[] }>('/api/sources')
  });
  const patchMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<NewsSource> }) =>
      api<NewsSource>(`/api/sources/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news-sources'] }),
    onError: () => toast.error("Failed to update source configuration.")
  });
  const addMutation = useMutation({
    mutationFn: (source: { name: string, url: string }) =>
      api<NewsSource>('/api/sources', { method: 'POST', body: JSON.stringify(source) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-sources'] });
      setIsAddOpen(false);
      setNewSource({ name: '', url: '' });
      toast.success("New stream registered successfully.");
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/sources/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-sources'] });
      toast.success("Source pruned from registry.");
    }
  });
  return (
    <AppLayout container>
      <div className="flex justify-between items-end mb-10 border-b pb-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-50">Source Registry</h2>
          <p className="text-muted-foreground mt-2 max-w-lg">Manage the RSS information streams powering the Veritas Lens clustering engine.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-sky-600 hover:bg-sky-700 shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Add Stream
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Register Stream</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs uppercase tracking-widest font-bold">Publisher Name</Label>
                <Input id="name" value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} placeholder="e.g. Associated Press" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url" className="text-xs uppercase tracking-widest font-bold">RSS Endpoint</Label>
                <Input id="url" value={newSource.url} onChange={e => setNewSource({...newSource, url: e.target.value})} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={() => addMutation.mutate(newSource)} disabled={!newSource.name || !newSource.url}>Register Source</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <TableHead className="w-[300px]">Stream Identity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[200px]">Reliability Weight</TableHead>
              <TableHead className="text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3].map(i => (
                <TableRow key={i}>
                  <TableCell colSpan={4} className="h-20 animate-pulse bg-slate-50 dark:bg-slate-800/20" />
                </TableRow>
              ))
            ) : sources?.items.map((source) => (
              <TableRow key={source.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <TableCell>
                  <div className="flex items-center gap-4 py-2">
                    <div className="p-3 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{source.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={source.active} 
                      onCheckedChange={(checked) => patchMutation.mutate({ id: source.id, updates: { active: checked } })}
                    />
                    <span className={`text-xs font-bold uppercase tracking-tight ${source.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {source.active ? 'Active' : 'Muted'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                      <Shield className="h-3 w-3" />
                      <span>Level {source.weight || 1}</span>
                    </div>
                    <Slider 
                      defaultValue={[source.weight || 1]} 
                      max={5} 
                      min={1} 
                      step={1} 
                      onValueCommit={([val]) => patchMutation.mutate({ id: source.id, updates: { weight: val } })}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(source.id)} className="text-slate-300 hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && sources?.items.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Activity className="mx-auto h-10 w-10 opacity-20 mb-3" />
            <p>No streams registered. Ingestion pipeline is currently offline.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}