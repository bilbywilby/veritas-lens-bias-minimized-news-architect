import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { NewsCluster } from '@shared/news-types';
interface ConsensusMapProps {
  clusters: NewsCluster[];
  height?: number;
}
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as NewsCluster;
    return (
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 p-4 rounded-none shadow-[4px_4px_0px_rgba(0,0,0,0.1)] max-w-xs animate-in fade-in zoom-in duration-200">
        <p className="font-serif font-bold text-base leading-tight mb-2 italic">"{data.representativeTitle}"</p>
        <div className="space-y-2 text-[9px] uppercase tracking-widest font-black text-slate-500">
          <div className="flex justify-between border-b pb-1">
            <span>Network Consensus</span>
            <span className="text-emerald-600">{(data.consensusFactor * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span>Divergence Spread</span>
            <span className="text-sky-600">{data.sourceCount} STREAMS</span>
          </div>
          <div className="pt-1 italic normal-case text-slate-400 font-serif leading-relaxed">
            Neutralized Fact-Density: High
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
    <div className="w-full relative bg-[#f8fafc] dark:bg-slate-950 rounded-2xl border-2 border-slate-100 dark:border-slate-800 p-8 overflow-hidden shadow-sm">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="flex justify-between items-end mb-10 relative z-10">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.3em] text-sky-600 mb-2">System Visualization</div>
          <h3 className="text-3xl font-serif italic text-slate-900 dark:text-slate-100">Information Topology</h3>
        </div>
        <div className="flex gap-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
          <span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Consensus Hub</span>
          <span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-rose-500" /> Bias Outlier</span>
        </div>
      </div>
      <div style={{ height }} className="w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 30 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} strokeOpacity={0.05} stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="x"
              name="Political Slant"
              domain={[-1.1, 1.1]}
              axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
              label={{ value: 'POLITICAL BIAS SPECTRUM (PROGRESSIVE ← → CONSERVATIVE)', position: 'bottom', offset: 25, fontSize: 9, fontWeight: 900, fill: '#64748b', letterSpacing: '0.1em' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Sources"
              domain={[0, 'dataMax + 1']}
              axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
              label={{ value: 'REPORTING DENSITY (SOURCE COUNT)', angle: -90, position: 'left', offset: 0, fontSize: 9, fontWeight: 900, fill: '#64748b', letterSpacing: '0.1em' }}
            />
            <ZAxis type="number" dataKey="z" range={[200, 1500]} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#0ea5e9', strokeWidth: 1, strokeDasharray: '5 5' }} />
            <Scatter name="Clusters" data={data} animationDuration={1000} animationEasing="ease-out">
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.consensusFactor > 0.7 ? '#10b981' : entry.consensusFactor > 0.4 ? '#0ea5e9' : '#f43f5e'}
                  stroke={entry.consensusFactor > 0.7 ? '#059669' : entry.consensusFactor > 0.4 ? '#0284c7' : '#e11d48'}
                  strokeWidth={2}
                  fillOpacity={0.8}
                  className="hover:fill-opacity-100 transition-all cursor-crosshair"
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}