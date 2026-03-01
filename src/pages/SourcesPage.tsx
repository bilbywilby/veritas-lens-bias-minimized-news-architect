import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  const addMutation = useMutation({
    mutationFn: (source: { name: string, url: string }) => 
      api<NewsSource>('/api/sources', { method: 'POST', body: JSON.stringify(source) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-sources'] });
      setIsAddOpen(false);
      setNewSource({ name: '', url: '' });
      toast.success("Source registered successfully.");
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/sources/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-sources'] });
      toast.success("Source removed from registry.");
    }
  });
  return (
    <AppLayout container>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-900">Source Registry</h2>
          <p className="text-muted-foreground">Manage the RSS feeds powering the lens.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-sky-600 hover:bg-sky-700">
              <Plus className="mr-2 h-4 w-4" /> Add Feed
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Information Stream</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Publisher Name</Label>
                <Input id="name" value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} placeholder="e.g. The New York Times" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url">RSS Endpoint</Label>
                <Input id="url" value={newSource.url} onChange={e => setNewSource({...newSource, url: e.target.value})} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={() => addMutation.mutate(newSource)} disabled={!newSource.name || !newSource.url}>Add Source</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reliability</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3].map(i => (
                <TableRow key={i}>
                  <TableCell colSpan={4} className="h-16 animate-pulse bg-slate-50" />
                </TableRow>
              ))
            ) : sources?.items.map((source) => (
              <TableRow key={source.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{source.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{source.url}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {source.active ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400">
                      <AlertCircle className="mr-1 h-3 w-3" /> Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className={`h-1.5 w-4 rounded-full ${i <= 4 ? 'bg-sky-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(source.id)} className="text-slate-400 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}