import { Eraser } from 'lucide-react';

interface LogsViewerProps {
  logs: string;
  onClear: () => void;
}

export function LogsViewer({ logs, onClear }: LogsViewerProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">System Logs</h2>
        <button
          onClick={onClear}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-400 border border-indigo-400/30 rounded-lg hover:bg-indigo-400/10 transition-colors"
        >
          <Eraser className="w-3 h-3" /> Clear
        </button>
      </div>
      <div className="p-0">
        <pre className="bg-[#0f172a] text-green-500 font-mono text-xs p-4 h-[500px] overflow-y-auto whitespace-pre-wrap">
          {logs || 'Fetching logs...'}
        </pre>
      </div>
    </div>
  );
}
