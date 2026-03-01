import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
interface ConsensusTopologyProps {
  sourceNames: string[];
  dispersion: number; // 0-1 (biasScore)
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
function getStableMetrics(name: string) {
  if (!name) return { slant: 0, reliability: 0.5 };
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const slant = ((Math.abs(hash) % 200) / 100) - 1;
  const reliability = 0.3 + ((Math.abs(hash * 31) % 60) / 100);
  return { slant, reliability };
}
export function ConsensusTopology({ sourceNames, dispersion, size = 'md', className }: ConsensusTopologyProps) {
  const sources = useMemo(() => {
    return (sourceNames || []).map(name => ({
      name,
      ...getStableMetrics(name)
    }));
  }, [sourceNames]);
  const getPos = (val: number, isX: boolean) => {
    if (isX) return `${((val + 1) / 2) * 100}%`;
    return `${(1 - val) * 100}%`;
  };
  const heights = {
    sm: 'h-24',
    md: 'h-32',
    lg: 'h-48'
  };
  const pingSizes = {
    sm: 'h-1 w-1',
    md: 'h-1.5 w-1.5',
    lg: 'h-2 w-2'
  };
  return (
    <TooltipProvider>
      <div className={cn(
        "relative w-full bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden border topology-grid transition-all",
        heights[size],
        className
      )}>
        <div
          className="bias-aura top-1/2 left-1/2 opacity-30"
          style={{ 
            '--dispersion': dispersion + (size === 'sm' ? 0.1 : 0.2),
            width: `${(dispersion + 0.2) * 80}%`,
            height: `${(dispersion + 0.2) * 80}%`
          } as React.CSSProperties}
        />
        <div className="absolute inset-0 p-1.5 pointer-events-none flex flex-col justify-between text-[6px] font-black uppercase text-slate-300 dark:text-slate-700 tracking-tighter">
          {size !== 'sm' && (
            <div className="flex justify-between w-full">
              <span>Primary Streams</span>
              <span>Reliable</span>
            </div>
          )}
          <div className="flex justify-between w-full mt-auto">
            <span>Prog</span>
            <span>Cons</span>
          </div>
        </div>
        {sources.map((source, idx) => (
          <Tooltip key={`${source.name}-${idx}`}>
            <TooltipTrigger asChild>
              <div
                className={cn("source-ping cursor-help transition-all duration-500", pingSizes[size])}
                style={{
                  left: getPos(source.slant, true),
                  top: getPos(source.reliability, false)
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-slate-900 text-white border-none text-[9px] font-black uppercase tracking-widest p-2">
              {source.name}
              <div className="text-[7px] text-sky-400 mt-0.5">Slant Profile: {source.slant.toFixed(2)}</div>
            </TooltipContent>
          </Tooltip>
        ))}
        <div className="absolute top-1/2 left-1/2 h-4 w-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
      </div>
    </TooltipProvider>
  );
}