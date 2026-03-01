import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, ShieldCheck, AlertCircle, TrendingUp } from 'lucide-react';
import type { NewsCluster } from '@shared/news-types';
import { format, parseISO } from 'date-fns';
interface NeutralizationDeepDiveProps {
  cluster: NewsCluster | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}
export function NeutralizationDeepDive({ cluster, isOpen, onOpenChange }: NeutralizationDeepDiveProps) {
  if (!cluster) return null;
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col bg-[#fcfcfc] dark:bg-slate-950">
        <SheetHeader className="p-8 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">Protocol 44-Alpha</span>
          </div>
          <SheetTitle className="font-serif italic text-3xl leading-tight text-slate-900 dark:text-slate-100">
            Neutralization Report
          </SheetTitle>
          <SheetDescription className="text-sm font-medium mt-2">
            Analyzing {cluster.articles.length} independent reports for consensus mapping.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-8">
          <div className="space-y-10 pb-12">
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">The Neutral Architecture</h4>
              <div className="p-6 bg-white dark:bg-slate-900 border-2 border-sky-50 dark:border-slate-800 rounded-2xl shadow-sm italic text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
                "{cluster.neutralSummary}"
              </div>
            </section>
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Consensus Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Information Entropy</p>
                  <p className="text-xl font-serif font-bold italic">{(cluster.clusterVariance * 100).toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Network Slant Index</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-sky-600" />
                    <p className="text-xl font-serif font-bold italic">{cluster.meanSlant.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </section>
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Primary Intelligence Streams</h4>
              <div className="space-y-4">
                {cluster.articles.map((article, idx) => (
                  <div key={idx} className="group relative p-5 bg-white dark:bg-slate-900 border rounded-xl hover:border-sky-200 dark:hover:border-sky-800 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 py-0 h-5">
                        {article.sourceName}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {format(parseISO(article.pubDate), "HH:mm 'GMT'")}
                      </span>
                    </div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug mb-3">
                      {article.title}
                    </h5>
                    <a 
                      href={article.link} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center text-[10px] font-bold text-sky-600 uppercase tracking-widest hover:underline"
                    >
                      Audit Source <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                ))}
              </div>
            </section>
            <section className="bg-slate-900 text-white p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Neutralization Logic</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                This cluster was architected using Jaccard Similarity weighting. The final summary emphasizes overlapping factual intersections while discounting editorialized adjectives present in {cluster.sourceCount} divergent streams.
              </p>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}