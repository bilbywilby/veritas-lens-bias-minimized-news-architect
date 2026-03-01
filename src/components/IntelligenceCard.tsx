import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Fingerprint, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { NewsCluster } from '@shared/news-types';
import { cn } from '@/lib/utils';
const ConsensusTopology = lazy(() => import('./ConsensusTopology').then(m => ({ default: m.ConsensusTopology })));
interface IntelligenceCardProps {
  cluster: NewsCluster;
  rank: number;
  onAudit: (cluster: NewsCluster) => void;
}
export function IntelligenceCard({ cluster, rank, onAudit }: IntelligenceCardProps) {
  const getBorderColor = (score: number) => {
    if (score > 9) return 'border-t-sky-600';
    if (score > 7) return 'border-t-emerald-600';
    return 'border-t-slate-400';
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className={cn(
        "group h-full flex flex-col bg-white dark:bg-slate-900 border-t-4 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden",
        getBorderColor(cluster.impactScore)
      )}>
        <CardHeader className="p-5 pb-0 space-y-3">
          <div className="flex justify-between items-start">
            <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-tighter py-0.5">
              Rank {rank} • {cluster.sourceCount} Sources
            </Badge>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              {(cluster.consensusFactor * 100).toFixed(0)}% Consensus
            </div>
          </div>
          <CardTitle
            className="font-serif italic text-xl leading-tight group-hover:text-sky-700 transition-colors line-clamp-2 cursor-pointer"
            onClick={() => onAudit(cluster)}
          >
            {cluster.representativeTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 flex-1 flex flex-col space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 font-serif italic line-clamp-3 leading-relaxed">
            {cluster.neutralSummary}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {cluster.tags?.map(tag => (
              <Badge key={tag} variant="outline" className="text-[8px] font-black uppercase tracking-tight py-0 border-sky-200 text-sky-700 dark:border-sky-800 dark:text-sky-400">
                {tag}
              </Badge>
            ))}
          </div>
          <Suspense fallback={<Skeleton className="h-24 w-full rounded-lg" />}>
            <ConsensusTopology
              sourceNames={cluster.sourceSpread}
              dispersion={cluster.biasScore}
              size="sm"
            />
          </Suspense>
          <div className="flex flex-wrap gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            {cluster.sourceSpread.slice(0, 3).map(s => (
              <span key={s} className="text-[8px] font-black uppercase text-slate-400 border px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800">
                {s}
              </span>
            ))}
            {cluster.sourceCount > 3 && (
              <span className="text-[8px] font-black uppercase text-slate-400 border px-1.5 py-0.5 rounded bg-slate-50">
                +{cluster.sourceCount - 3}
              </span>
            )}
          </div>
          <div className="pt-4 mt-auto border-t flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAudit(cluster)}
              className="h-8 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-sky-600"
            >
              <Fingerprint className="h-3.5 w-3.5 mr-1.5" />
              Audit Trail
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 px-3 border-2 text-[9px] font-black uppercase tracking-widest"
            >
              <a href={cluster.articles[0]?.link} target="_blank" rel="noreferrer">
                Source <ExternalLink className="ml-1.5 h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}