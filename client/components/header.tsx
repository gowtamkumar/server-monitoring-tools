import { Activity, Globe, Server } from 'lucide-react';

interface HeaderProps {
  lastSync: string;
  mode?: string;
  host?: string;
}

export function Header({ lastSync, mode, host }: HeaderProps) {
  const isRemote = mode === 'remote';

  return (
    <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
      <div className="flex items-center gap-3 text-2xl font-bold text-indigo-400">
        <Server className="w-8 h-8" />
        VPS MONITOR
      </div>
      <div className="text-right">
        {/* Host & Mode */}
        <div className="flex items-center justify-end gap-2 mb-1">
          <div className="flex items-center gap-1.5 text-sm text-slate-300 font-medium">
            <Globe className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400">Host:</span>
            <span className="font-mono text-slate-200">{host || 'localhost'}</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold uppercase border flex items-center gap-1 ${
              isRemote
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {isRemote ? '🌐 Remote' : '💻 Local'}
          </span>
        </div>

        {/* Last Sync & Online status */}
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
