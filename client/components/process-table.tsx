interface Process {
  pid: string;
  user: string;
  cpu: string;
  mem: string;
  command: string;
}

interface ProcessTableProps {
  processes: Process[];
}

export function ProcessTable({ processes }: ProcessTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase bg-slate-800/50 rounded-tl-lg">PID</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase bg-slate-800/50">User</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase bg-slate-800/50">CPU</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase bg-slate-800/50">Memory</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase bg-slate-800/50 rounded-tr-lg">Command</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {processes.slice(0, 15).map((p, i) => (
            <tr key={`${p.pid}-${i}`} className="hover:bg-slate-700/30 transition-colors">
              <td className="p-4 text-sm text-slate-300 font-mono">{p.pid}</td>
              <td className="p-4 text-sm text-slate-300">{p.user}</td>
              <td className="p-4 text-sm text-indigo-400 font-mono font-bold">{p.cpu}</td>
              <td className="p-4 text-sm text-slate-300 font-mono">{p.mem}</td>
              <td className="p-4 text-sm text-slate-300 font-mono max-w-xs truncate" title={p.command}>
                {p.command}
              </td>
            </tr>
          ))}
          {processes.length === 0 && (
            <tr>
              <td colSpan={5} className="p-8 text-center text-slate-500">
                Loading processes...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
