import { Activity, Server } from 'lucide-react';

interface HeaderProps {
  lastSync: string;
}

export function Header({ lastSync }: HeaderProps) {
  return (
    <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
      <div className="flex items-center gap-3 text-2xl font-bold text-indigo-400">
        <Server className="w-8 h-8" />
        VPS MONITOR
      </div>
      <div className="text-right">
        <p className="text-gray-400 text-sm">Last sync: {lastSync}</p>
        <div className="flex items-center justify-end gap-2 text-xs uppercase font-bold mt-1">
          <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Online
          </span>
        </div>
      </div>
    </header>
  );
}
