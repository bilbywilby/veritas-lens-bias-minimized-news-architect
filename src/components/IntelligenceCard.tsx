import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Fingerprint, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { NewsCluster } from '@shared/news-types';
import { cn } from '@/lib/utils';
import { ConsensusTopology } from './ConsensusTopology';
interface IntelligenceCardProps {
  cluster: NewsCluster;
  rank: number;
  onAudit: (cluster: NewsCluster) => void;
}
export function IntelligenceCard({ cluster, rank, onAudit }: IntelligenceCardProps) {
  const getSlantBorder = (slant: number) => {
    if (slant < -0.2) return 'border-l-sky-500';
    if (slant > 0.2) return 'border-l-rose-500';
    return 'border-l-slate-300';
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full"
    >
      <Card className={cn(
        "group h-full flex flex-col bg-white dark:bg-slate-900 border-none border-l-4 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ring-1 ring-slate-100",
        getSlantBorder(cluster.meanSlant)
      )}>
        <CardHeader className="p-5 pb-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Rank {rank} • {cluster.sourceCount} Streams
            </span>
            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase">
              <TrendingUp className="h-2.5 w-2.5" />
              {(cluster.consensusFactor * 100).toFixed(0)}%
            </div>
          </div>
          <CardTitle
            className="font-serif font-bold text-xl leading-[1.15] tracking-tight group-hover:text-sky-700 transition-colors line-clamp-3 cursor-pointer"
            onClick={() => onAudit(cluster)}
          >
            {cluster.representativeTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 flex-1 flex flex-col space-y-4">
          <p className="text-[13px] text-slate-600 dark:text-slate-400 font-serif italic line-clamp-4 leading-relaxed text-justify-newspaper">
            {cluster.neutralSummary}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cluster.tags?.slice(0, 2).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[8px] font-black uppercase tracking-tight py-0 bg-slate-50 text-slate-500">
                {tag}
              </Badge>
            ))}
          </div>
          <ConsensusTopology
            sourceNames={cluster.sourceSpread}
            dispersion={cluster.biasScore}
            size="sm"
            className="opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <div className="pt-4 mt-auto border-t flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAudit(cluster)}
              className="h-7 px-0 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-sky-600 hover:bg-transparent"
            >
              <Fingerprint className="h-3 w-3 mr-1.5" />
              Audit Trail
            </Button>
            <a
              href={cluster.articles[0]?.link}
              target="_blank"
              rel="noreferrer"
              className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center hover:underline"
            >
              Read <ExternalLink className="ml-1.5 h-2.5 w-2.5" />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}