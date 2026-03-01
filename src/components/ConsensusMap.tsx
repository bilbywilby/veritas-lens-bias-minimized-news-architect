import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import type { NewsCluster } from '@shared/news-types';
import { Card } from '@/components/ui/card';
interface ConsensusMapProps {
  clusters: NewsCluster[];
  height?: number;
}
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as NewsCluster;
    return (
      <div className="bg-white dark:bg-slate-900 border p-3 rounded-lg shadow-xl max-w-xs animate-in fade-in zoom-in duration-200">
        <p className="font-serif font-bold text-sm leading-tight mb-2">{data.representativeTitle}</p>
        <div className="space-y-1 text-[10px] uppercase tracking-tighter font-bold text-muted-foreground">
          <div className="flex justify-between">
            <span>Consensus</span>
            <span className="text-emerald-600">{(data.consensusFactor * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Sources</span>
            <span className="text-sky-600">{data.sourceCount}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {data.sourceSpread.map(s => (
              <span key={s} className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{s}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return null;
};
export function ConsensusMap({ clusters, height = 400 }: ConsensusMapProps) {
  const data = clusters.map(c => ({
    ...c,
    x: c.meanSlant,
    y: c.sourceCount,
    z: (1 - c.clusterVariance) * 100
  }));
  return (
    <div className="w-full relative bg-[#f8fafc] dark:bg-slate-950 rounded-2xl border p-6 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="flex justify-between items-center mb-6">
        <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Network Topology View</div>
        <div className="flex gap-4 text-[10px] font-bold text-muted-foreground uppercase">
          <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-emerald-500" /> High Consensus</span>
          <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-rose-500" /> High Bias</span>
        </div>
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Political Slant" 
              domain={[-1, 1]} 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700 }}
              label={{ value: '← LEFT LEANING | RIGHT LEANING →', position: 'bottom', offset: 20, fontSize: 10, fontWeight: 800, fill: '#64748b' }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Sources" 
              domain={[0, 'dataMax + 1']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700 }}
              label={{ value: 'SOURCE DIVERSITY', angle: -90, position: 'left', fontSize: 10, fontWeight: 800, fill: '#64748b' }}
            />
            <ZAxis type="number" dataKey="z" range={[100, 1000]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Clusters" data={data}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.consensusFactor > 0.7 ? '#10b981' : entry.consensusFactor > 0.4 ? '#0ea5e9' : '#f43f5e'} 
                  className="hover:opacity-80 transition-opacity cursor-crosshair"
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}