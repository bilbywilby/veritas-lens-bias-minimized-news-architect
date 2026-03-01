import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
interface ConsensusTopologyProps {
  sourceNames: string[];
  dispersion: number; // 0-1 (biasScore)
  className?: string;
}
/**
 * Stable hash utility to generate consistent positions for sources
 */
function getStableMetrics(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Map hash to -1 to 1 for slant and 0.4 to 0.9 for reliability
  const slant = ((Math.abs(hash) % 200) / 100) - 1;
  const reliability = 0.4 + ((Math.abs(hash * 31) % 50) / 100);
  return { slant, reliability };
}
export function ConsensusTopology({ sourceNames, dispersion, className }: ConsensusTopologyProps) {
  const sources = useMemo(() => {
    return sourceNames.map(name => ({
      name,
      ...getStableMetrics(name)
    }));
  }, [sourceNames]);
  // Map metrics to percentages for grid placement (0-100%)
  const getPos = (val: number, isX: boolean) => {
    if (isX) return `${((val + 1) / 2) * 100}%`;
    return `${(1 - val) * 100}%`; // Y is inverted in UI coords
  };
  return (
    <TooltipProvider>
      <div className={cn("relative h-32 w-full bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden border topology-grid", className)}>
        {/* Central Bias Aura */}
        <div 
          className="bias-aura top-1/2 left-1/2 animate-pulse"
          style={{ '--dispersion': dispersion + 0.2 } as React.CSSProperties}
        />
        {/* Grid Axis Labels */}
        <div className="absolute inset-0 p-1 pointer-events-none flex flex-col justify-between text-[6px] font-black uppercase text-slate-300 dark:text-slate-700 tracking-tighter">
          <div className="flex justify-between w-full">
            <span>High Reliability</span>
            <span>Reliable</span>
          </div>
          <div className="flex justify-between w-full mt-auto">
            <span>Progressive</span>
            <span>Conservative</span>
          </div>
        </div>
        {/* Source Nodes */}
        {sources.map((source, idx) => (
          <Tooltip key={`${source.name}-${idx}`}>
            <TooltipTrigger asChild>
              <div 
                className="source-ping cursor-help transition-all duration-300"
                style={{ 
                  left: getPos(source.slant, true),
                  top: getPos(source.reliability, false)
                }}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-none text-[9px] font-black uppercase tracking-widest">
              {source.name} 
              <span className="ml-2 text-sky-400">S: {source.slant.toFixed(1)}</span>
            </TooltipContent>
          </Tooltip>
        ))}
        {/* Center Target */}
        <div className="absolute top-1/2 left-1/2 h-4 w-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </TooltipProvider>
  );
}