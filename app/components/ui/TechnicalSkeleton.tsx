import React from 'react';

export default function TechnicalSkeleton() {
  return (
    <div className="border border-slate-800 bg-slate-900/60 p-4 space-y-3 animate-pulse rounded-none">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-slate-800 w-1/4 rounded-none border border-slate-700/50" />
        <div className="h-3 bg-slate-800 w-16 rounded-none" />
      </div>
      <div className="h-px bg-slate-800" />
      <div className="grid grid-cols-3 gap-4 pt-2">
        <div className="h-3 bg-slate-800/80 w-5/6 rounded-none" />
        <div className="h-3 bg-slate-800/80 w-full rounded-none" />
        <div className="h-3 bg-slate-800/80 w-2/3 rounded-none" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-3 bg-slate-800/60 w-1/2 rounded-none" />
        <div className="h-3 bg-slate-800/60 w-3/4 rounded-none" />
      </div>
      <div className="flex justify-end pt-2">
        <div className="h-6 bg-slate-800/50 w-20 rounded-none border border-slate-800" />
      </div>
    </div>
  );
}
