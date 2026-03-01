import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
interface TimelineData {
  date: string;
  score: number;
  articles: number;
  clusters: number;
}
interface ConsensusTimelineProps {
  data: TimelineData[];
}
export function ConsensusTimeline({ data }: ConsensusTimelineProps) {
  if (!data || data.length === 0) return null;
  return (
    <Card className="border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 pb-8">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-600 mb-1">Longitudinal Analysis</div>
          <CardTitle className="font-serif italic text-2xl">Network Consensus Trend</CardTitle>
          <CardDescription className="text-xs font-medium">Tracking reporting stability over a 14-day trailing window.</CardDescription>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <span className="block text-[10px] font-black uppercase text-slate-400">Current Mean</span>
            <span className="font-serif text-xl italic">{(data[data.length - 1]?.score || 0).toFixed(1)}/10</span>
          </div>
        </div>
      </CardHeader>
      <div className="h-[250px] px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="consensusGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} stroke="#1e293b" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
              padding={{ left: 10, right: 10 }}
            />
            <YAxis 
              domain={[0, 10]} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
              width={30}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as TimelineData;
                  return (
                    <div className="bg-white dark:bg-slate-800 border p-3 shadow-xl rounded-lg">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">{d.date}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-8">
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">Consensus</span>
                          <span className="text-[10px] font-black text-sky-600">{d.score.toFixed(1)}/10</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">Articles</span>
                          <span className="text-[10px] font-black text-slate-900 dark:text-slate-100">{d.articles}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="score" 
              stroke="#0ea5e9" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#consensusGradient)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}