import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Activity, RefreshCcw, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SystemState } from '@shared/news-types';
interface SystemPulseProps {
  stats?: SystemState;
  onSync?: () => void;
}
export function SystemPulse({ stats, onSync }: SystemPulseProps) {
  const syncMutation = useMutation({
    mutationFn: () => api<{ archived: string }>('/api/system/sync', { method: 'POST' }),
    onSuccess: () => {
      toast.success("Story Vault Synchronized");
      if (onSync) onSync();
    }
  });
  return (
    <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl ring-1 ring-slate-100 dark:ring-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <div className="absolute top-0 left-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Cluster: Alpha-7</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 hover:bg-slate-100" 
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCcw className={cn("h-3 w-3 text-slate-400", syncMutation.isPending && "animate-spin")} />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100 dark:divide-slate-800">
        <div>
          <span className="block text-[8px] font-black uppercase text-slate-400 tracking-tighter mb-1">Intelligence Velocity</span>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-serif font-black italic">{stats?.totalArticles || 0}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase">ARTICLES</span>
          </div>
        </div>
        <div className="pl-4">
          <span className="block text-[8px] font-black uppercase text-slate-400 tracking-tighter mb-1">Stream Coverage</span>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-serif font-black italic">{stats?.sourceCount || 0}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase">PUBLISHERS</span>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3 w-3 text-sky-600" />
          <span className="text-[8px] font-black uppercase text-slate-500">Security: Encrypted Edge</span>
        </div>
        <span className="text-[8px] font-bold text-emerald-600 uppercase">99.9% UPTIME</span>
      </div>
    </div>
  );
}