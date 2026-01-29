import { ListFilter, Terminal } from 'lucide-react';

interface Container {
  name: string;
  image: string;
  status: string;
  id: string;
}

interface DockerStats {
  name: string;
  cpu: string;
  memUsage: string;
  memPerc: string;
  netIO: string;
}

interface DockerTableProps {
  containers: Container[];
  stats: DockerStats[];
  onViewLogs: (name: string) => void;
  onViewTop: (name: string) => void;
}

export function DockerTable({ containers, stats, onViewLogs, onViewTop }: DockerTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase bg-slate-800/50 rounded-tl-lg">Container</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase bg-slate-800/50">Status</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase bg-slate-800/50">CPU</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase bg-slate-800/50">Memory</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase bg-slate-800/50">Net I/O</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase bg-slate-800/50 rounded-tr-lg text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {containers.map(container => {
            const stat = stats.find(s => s.name === container.name) || {};
            const isUp = container.status.toLowerCase().includes('up');

            return (
              <tr key={container.name} className="hover:bg-slate-700/30 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-slate-200">{container.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{container.image}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isUp ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
                    <span className="text-sm text-slate-300">{container.status}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-300 font-mono">{stat.cpu || '--'}</td>
                <td className="p-4 text-sm text-slate-300 font-mono">
                  {stat.memUsage ? `${stat.memUsage} (${stat.memPerc})` : '--'}
                </td>
                <td className="p-4 text-sm text-slate-300 font-mono">{stat.netIO || '--'}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onViewLogs(container.name)}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-indigo-400 transition-colors"
                      title="View Logs"
                    >
                      <Terminal className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onViewTop(container.name)}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-indigo-400 transition-colors"
                      title="View Processes"
                    >
                      <ListFilter className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {containers.length === 0 && (
            <tr>
              <td colSpan={6} className="p-8 text-center text-slate-500">
                No containers found or loading...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
