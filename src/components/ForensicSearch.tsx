import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Download, ExternalLink, AlertTriangle, Fingerprint } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { format } from 'date-fns';
import type { VaultStory } from '@shared/news-types';
export function ForensicSearch() {
  const [query, setQuery] = useState('');
  const [slantRange, setSlantRange] = useState([-1, 1]);
  const [source, setSource] = useState('');
  const { data: results, isLoading } = useQuery<VaultStory[]>({
    queryKey: ['forensic-search', query, slantRange, source],
    queryFn: () => api<VaultStory[]>(`/api/stories/search?q=${query}&minSlant=${slantRange[0]}&maxSlant=${slantRange[1]}&source=${source}`),
    enabled: true
  });
  const handleExportResults = () => {
    if (!results) return;
    const headers = "Title,Source,Slant,Bias,Link,Date\n";
    const rows = results.map(s => 
      `"${s.title.replace(/"/g, '""')}","${s.sourceName}",${s.slant},${s.bias},"${s.link}","${format(s.timestamp, 'yyyy-MM-dd')}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veritas-forensic-${Date.now()}.csv`;
    a.click();
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
      <Card className="lg:col-span-1 border-none bg-slate-50 dark:bg-slate-900/50 shadow-none ring-1 ring-slate-100 dark:ring-slate-800 h-fit sticky top-8">
        <CardHeader>
          <CardTitle className="font-serif italic flex items-center gap-2">
            <Filter className="h-4 w-4" /> Parameters
          </CardTitle>
          <CardDescription className="text-[10px] font-black uppercase tracking-widest">Forensic discovery filters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Slant Profile Range</Label>
            <Slider value={slantRange} min={-1} max={1} step={0.1} onValueChange={setSlantRange} />
            <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
              <span>Progressive</span><span>Neutral</span><span>Conservative</span>
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Publisher Stream</Label>
            <Input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Reuters" className="h-9 text-xs" />
          </div>
          <Button onClick={handleExportResults} variant="outline" className="w-full font-bold uppercase text-[9px] tracking-widest h-9 border-2">
            <Download className="mr-2 h-3.5 w-3.5" /> Export Filtered View
          </Button>
        </CardContent>
      </Card>
      <div className="lg:col-span-3 space-y-6">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-sky-600" />
          <Input 
            placeholder="Search individual stories by keyword..." 
            className="pl-10 h-12 border-2 bg-white dark:bg-slate-950" 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
          />
        </div>
        <div className="bg-white dark:bg-slate-950 rounded-2xl border-2 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900 border-b">
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Story Intelligence</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Stream</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Slant</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Audit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1,2,3,4,5].map(i => (
                  <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ))
              ) : results && results.length > 0 ? (
                results.map((story) => (
                  <TableRow key={story.id} className="group border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight group-hover:text-sky-700 transition-colors">{story.title}</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">{format(story.timestamp, 'MMM dd, yyyy')}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-slate-50 dark:bg-slate-800 text-slate-400">{story.sourceName}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={cn("text-[10px] font-black", story.slant < -0.2 ? 'text-sky-600' : story.slant > 0.2 ? 'text-rose-600' : 'text-slate-400')}>
                        {story.slant.toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8 hover:text-sky-600">
                        <a href={story.link} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <Fingerprint className="h-12 w-12 mx-auto text-slate-100 mb-4" />
                    <p className="text-slate-300 italic font-serif">No forensic matches localized in Story Vault.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}