import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Zap, Rss, Fingerprint, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
export function TourModal({ forceOpen = false, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const isComplete = localStorage.getItem('veritas-tour-complete');
    if (!isComplete || forceOpen) {
      setIsOpen(true);
      setStep(0);
    }
  }, [forceOpen]);
  const steps = [
    {
      title: "Welcome to Veritas Lens",
      description: "The digital broadsheet for bias-minimized news architected at the edge.",
      icon: <ShieldCheck className="h-12 w-12 text-sky-600 mb-4" />,
      content: "Traditional news is often fragmented and editorialized. Veritas Lens aggregates hundreds of independent streams into unified, neutralized intelligence clusters."
    },
    {
      title: "Neutralization Cycle",
      description: "How we minimize bias through algorithmic verification.",
      icon: <Zap className="h-12 w-12 text-amber-500 mb-4" />,
      content: "Trigger the 'Execution Pipeline' to fetch raw RSS data. Our engine clusters related stories using Jaccard Similarity and calculates a 'Consensus Factor' based on source overlap."
    },
    {
      title: "The Reliability Registry",
      description: "Manage your intelligence streams and slant profiles.",
      icon: <Rss className="h-12 w-12 text-indigo-600 mb-4" />,
      content: "Add trusted sources, assign political slant profiles, and toggle active status. The dashboard's Consensus Index is weighted by the diversity of your configured streams."
    },
    {
      title: "Audit Trail Analysis",
      description: "Transparent verification for every synthesized report.",
      icon: <Fingerprint className="h-12 w-12 text-rose-600 mb-4" />,
      content: "Inspect any story card to see the original reporting sources. Analyze Information Topology to identify bias outliers and divergent reporting patterns across the globe."
    }
  ];
  const handleFinish = () => {
    localStorage.setItem('veritas-tour-complete', 'true');
    setIsOpen(false);
    if (onClose) onClose();
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleFinish()}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800">
          <div 
            className="h-full bg-sky-600 transition-all duration-300" 
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="flex flex-col items-center text-center py-6">
          {steps[step].icon}
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl italic mb-2">{steps[step].title}</DialogTitle>
            <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400">
              {steps[step].description}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            {steps[step].content}
          </div>
        </div>
        <DialogFooter className="flex flex-row justify-between items-center gap-4 sm:justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={cn("h-1 w-4 rounded-full", i === step ? "bg-sky-600" : "bg-slate-200")} />
            ))}
          </div>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} size="sm" className="bg-sky-600 font-bold uppercase text-[10px]">
              Next <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          ) : (
            <Button onClick={handleFinish} size="sm" className="bg-emerald-600 font-bold uppercase text-[10px]">
              Get Started <CheckCircle2 className="ml-1 h-3 w-3" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}