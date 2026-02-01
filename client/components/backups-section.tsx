"use client";

import { runBackup as apiRunBackup, fetchBackups } from "@/lib/api";
import { Database, RefreshCw, Save, ShieldAlert, Terminal } from "lucide-react";
import { useEffect, useState } from "react";

export function BackupsSection() {
  const [clientPath, setClientPath] = useState(".");
  const [clientExcludes, setClientExcludes] = useState("node_modules, .git");
  const [clientEmail, setClientEmail] = useState("");
  const [clientEmailToggled, setClientEmailToggled] = useState(false);
  const [dbConfig, setDbConfig] = useState({
    type: "mysql",
    host: "localhost",
    name: "",
    user: "",
    password: "",
  });
  const [dbEmail, setDbEmail] = useState("");
  const [dbEmailToggled, setDbEmailToggled] = useState(false);
  const [logs, setLogs] = useState<{ time: string; msg: string; type: "info" | "success" | "error" }[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState({ client: false, db: false, history: false });

  const addLog = (msg: string, type: "info" | "success" | "error" = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, msg, type }]);
  };

  const loadHistory = async () => {
    setLoading((prev) => ({ ...prev, history: true }));
    try {
      const data = await fetchBackups();
      if (data.success) setHistory(data.backups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, history: false }));
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleBackup = async (type: "client" | "db") => {
    setLoading((prev) => ({ ...prev, [type]: true }));
    addLog(`[${type.toUpperCase()}] Starting backup job...`);

    try {
      const settings: any = type === "client"
        ? { path: clientPath, excludes: clientExcludes, email: clientEmailToggled ? clientEmail : undefined }
        : { ...dbConfig, email: dbEmailToggled ? dbEmail : undefined };

      if ((clientEmailToggled && type === "client" && settings.email === "") || (dbEmailToggled && type === "db" && settings.email === "")) {
        addLog(`[${type.toUpperCase()}] ERROR: Email address required`, "error");
        setLoading((prev) => ({ ...prev, [type]: false }));
        return;
      }

      const data = await apiRunBackup(type, settings);

      if (data.success) {
        let msg = `SUCCESS: ${data.message} (${data.file})`;
        if (data.emailStatus) msg += ` | Email: ${data.emailStatus}`;
        addLog(`[${type.toUpperCase()}] ${msg}`, "success");
        loadHistory();
      } else {
        addLog(`[${type.toUpperCase()}] ERROR: ${data.error}`, "error");
      }
    } catch (err: any) {
      addLog(`[${type.toUpperCase()}] NETWORK ERROR: ${err.message}`, "error");
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Boss Panel */}
      <div className="bg-[#1a1a1a] border border-[#333] border-t-4 border-[#fbbf24] p-8 rounded-lg shadow-2xl overflow-hidden relative">
        <div className="flex justify-between items-center mb-8 border-b border-[#333] pb-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-[#fbbf24]" />
            <h2 className="text-2xl font-serif text-[#fbbf24] tracking-wider uppercase">System Backup Manager</h2>
          </div>
          <span className="bg-[#fbbf24] text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Authorized Access Only</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Client Card */}
          <div className="bg-black/40 border border-[#333] p-6 rounded-md relative before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#fbbf24] before:to-transparent">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold uppercase tracking-tight">Inner Client System</h3>
              <div className="text-[10px] items-center flex gap-1 text-[#fbbf24]/60 uppercase tracking-tighter">
                <RefreshCw
                  className={`w-3 h-3 cursor-pointer ${loading.history ? 'animate-spin' : ''}`}
                  onClick={loadHistory}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[#94a3b8] text-[10px] uppercase mb-1.5 tracking-wider">Source Path</label>
                <input
                  type="text"
                  value={clientPath}
                  onChange={(e) => setClientPath(e.target.value)}
                  className="w-full bg-[#222] border border-[#444] text-white p-3 rounded font-mono text-sm focus:border-[#fbbf24] outline-none transition-all"
                  placeholder="/path/to/app"
                />
              </div>
              <div>
                <label className="block text-[#94a3b8] text-[10px] uppercase mb-1.5 tracking-wider">Exclude Patterns</label>
                <input
                  type="text"
                  value={clientExcludes}
                  onChange={(e) => setClientExcludes(e.target.value)}
                  className="w-full bg-[#222] border border-[#444] text-white p-3 rounded font-mono text-sm focus:border-[#fbbf24] outline-none transition-all"
                  placeholder="node_modules, .git"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="client-email-toggle"
                  checked={clientEmailToggled}
                  onChange={(e) => setClientEmailToggled(e.target.checked)}
                  className="w-4 h-4 rounded border-[#444] bg-[#222] text-[#fbbf24] focus:ring-[#fbbf24]"
                />
                <label htmlFor="client-email-toggle" className="text-[#94a3b8] text-[10px] uppercase tracking-wider cursor-pointer">Email Result</label>
              </div>

              {clientEmailToggled && (
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full bg-[#222] border border-[#444] text-white p-2 rounded font-mono text-xs focus:border-[#fbbf24] outline-none"
                  placeholder="boss@example.com"
                />
              )}

              <button
                disabled={loading.client}
                onClick={() => handleBackup("client")}
                className="w-full bg-[#fbbf24] hover:bg-white text-black font-bold p-3 rounded uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {loading.client ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4" />}
                Initiate Backup
              </button>
            </div>

            {/* History mini-list */}
            <div className="mt-8 pt-4 border-t border-[#333]">
              <div className="text-[#94a3b8] text-[10px] uppercase mb-3 flex justify-between items-center">
                <span>Recent Archive Records</span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {history.filter(b => b.type === 'client').slice(0, 3).map((b, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-[#222]/30 rounded text-[10px] border border-white/5">
                    <span className="text-white/80 truncate w-40" title={b.name}>{b.name}</span>
                    <span className="text-[#fbbf24] font-mono">{(b.size || 'N/A')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Database Card */}
          <div className="bg-black/40 border border-[#333] p-6 rounded-md relative before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#fbbf24] before:to-transparent">
            <h3 className="text-white font-bold uppercase tracking-tight mb-6">Database Vault</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#94a3b8] text-[10px] uppercase mb-1.5 tracking-wider">Type</label>
                  <select
                    value={dbConfig.type}
                    onChange={(e) => setDbConfig({ ...dbConfig, type: e.target.value })}
                    className="w-full bg-[#222] border border-[#444] text-white p-3 rounded text-sm focus:border-[#fbbf24] outline-none"
                  >
                    <option value="mysql">MySQL</option>
                    <option value="postgres">Postgres</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#94a3b8] text-[10px] uppercase mb-1.5 tracking-wider">Host</label>
                  <input
                    type="text"
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    className="w-full bg-[#222] border border-[#444] text-white p-3 rounded font-mono text-sm focus:border-[#fbbf24] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#94a3b8] text-[10px] uppercase mb-1.5 tracking-wider">Database Name</label>
                  <input
                    type="text"
                    value={dbConfig.name}
                    onChange={(e) => setDbConfig({ ...dbConfig, name: e.target.value })}
                    className="w-full bg-[#222] border border-[#444] text-white p-3 rounded font-mono text-sm focus:border-[#fbbf24] outline-none"
                    placeholder="db_name"
                  />
                </div>
                <div>
                  <label className="block text-[#94a3b8] text-[10px] uppercase mb-1.5 tracking-wider">Username</label>
                  <input
                    type="text"
                    value={dbConfig.user}
                    onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                    className="w-full bg-[#222] border border-[#444] text-white p-3 rounded font-mono text-sm focus:border-[#fbbf24] outline-none"
                    placeholder="root"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#94a3b8] text-[10px] uppercase mb-1.5 tracking-wider">Password</label>
                <input
                  type="password"
                  value={dbConfig.password}
                  onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                  className="w-full bg-[#222] border border-[#444] text-white p-3 rounded font-mono text-sm focus:border-[#fbbf24] outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="db-email-toggle"
                  checked={dbEmailToggled}
                  onChange={(e) => setDbEmailToggled(e.target.checked)}
                  className="w-4 h-4 rounded border-[#444] bg-[#222] text-[#fbbf24] focus:ring-[#fbbf24]"
                />
                <label htmlFor="db-email-toggle" className="text-[#94a3b8] text-[10px] uppercase tracking-wider cursor-pointer">Email Result</label>
              </div>

              {dbEmailToggled && (
                <input
                  type="email"
                  value={dbEmail}
                  onChange={(e) => setDbEmail(e.target.value)}
                  className="w-full bg-[#222] border border-[#444] text-white p-2 rounded font-mono text-xs focus:border-[#fbbf24] outline-none"
                  placeholder="boss@example.com"
                />
              )}

              <button
                disabled={loading.db}
                onClick={() => handleBackup("db")}
                className="w-full bg-[#fbbf24] hover:bg-white text-black font-bold p-3 rounded uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {loading.db ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <Database className="w-4 h-4" />}
                Dump Database
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Console */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-[#fbbf24]" />
            <h3 className="text-[#fbbf24] text-[10px] font-bold uppercase tracking-widest">Live Security Console</h3>
          </div>
          <div className="bg-black border border-[#333] p-4 rounded h-40 overflow-y-auto font-mono text-[11px] space-y-1.5 selection:bg-[#fbbf24]/30 selection:text-white">
            <div className="text-gray-500">{"> "} System initialized. Waiting for task...</div>
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-600">[{log.time}]</span>
                <span className={
                  log.type === 'success' ? 'text-green-500' :
                    log.type === 'error' ? 'text-red-500 font-bold animate-pulse' :
                      'text-white/80'
                }>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full History Section */}
      <div className="bg-[#111] border border-[#333] p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white font-bold uppercase text-sm tracking-wide">Historical Archive Inventory</h3>
          <button onClick={loadHistory} className="text-[#fbbf24] hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading.history ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-500">
                <th className="pb-3 px-2 font-medium">NAME</th>
                <th className="pb-3 px-2 font-medium">TYPE</th>
                <th className="pb-3 px-2 font-medium">PATH</th>
                <th className="pb-3 px-2 font-medium">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((record, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors group">
                  <td className="py-3 px-2 text-white/90">{record.name}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${record.type === 'database' ? 'bg-orange-950/50 text-orange-400' : 'bg-blue-950/50 text-blue-400'
                      }`}>
                      {record.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 truncate max-w-[200px]">{record.path}</td>
                  <td className="py-3 px-2">
                    <button className="text-gray-600 group-hover:text-[#fbbf24]">
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-600 italic">No historical records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
