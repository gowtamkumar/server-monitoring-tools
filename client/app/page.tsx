"use client";

import { BackupsSection } from '@/components/backups-section';
import { DockerTable } from '@/components/docker-table';
import { Header } from '@/components/header';
import { LogsViewer } from '@/components/logs-viewer';
import { MetricCard } from '@/components/metric-card';
import { ProcessTable } from '@/components/process-table';
import { ServicesGrid } from '@/components/services-grid';
import { fetchDockerLogs, fetchDockerProcesses, fetchMetrics } from '@/lib/api';
import { clsx } from 'clsx';
import { Box, Cpu, FileText, HardDrive, List, MemoryStick, Network, Settings, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

// Helper for conditional classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'docker' | 'processes' | 'services' | 'logs' | 'backups'>('docker');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; body: string }>({ title: '', body: '' });

  const refreshMetrics = async () => {
    try {
      const data = await fetchMetrics();
      setMetrics(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMetrics();
    const interval = setInterval(refreshMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleViewLogs = async (name: string) => {
    setModalOpen(true);
    setModalContent({ title: `Logs: ${name}`, body: 'Fetching logs...' });
    try {
      const data = await fetchDockerLogs(name);
      setModalContent({ title: `Logs: ${name}`, body: data.logs || 'No logs found.' });
    } catch (err) {
      setModalContent({ title: `Error`, body: 'Failed to fetch logs.' });
    }
  };

  const handleViewTop = async (name: string) => {
    setModalOpen(true);
    setModalContent({ title: `Processes: ${name}`, body: 'Querying container...' });
    try {
      const data = await fetchDockerProcesses(name);
      const rows = data.processes.map((p: any) =>
        `${p.pid}\t${p.user}\t${p.cpu}\t${p.mem}\t${p.command}`
      ).join('\n');
      setModalContent({ title: `Processes: ${name}`, body: `PID\tUSER\tCPU\tMEM\tCOMMAND\n${'-'.repeat(60)}\n${rows}` });
    } catch (err) {
      setModalContent({ title: `Error`, body: 'Failed to fetch processes.' });
    }
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400">
        <div className="animate-pulse flex flex-col items-center">
          <Settings className="w-10 h-10 mb-4 animate-spin text-indigo-500" />
          <p>Connecting to VPS Monitor...</p>
        </div>
      </div>
    );
  }

  // Safety check for metrics
  const m = metrics || {};
  const networkSpeed = m.network_speed ? (m.network_speed[m.network?.interface] || Object.values(m.network_speed)[0] || { rx: '0 B/s', tx: '0 B/s' }) : { rx: '0 B/s', tx: '0 B/s' };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <Header lastSync={m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : 'N/A'} />

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <MetricCard
            title="CPU Usage"
            value={m.cpu || '0%'}
            percentage={parseFloat(m.cpu || '0')}
            icon={Cpu}
            color="indigo"
          />
          <MetricCard
            title="RAM Usage"
            value={m.memory?.percent || '0%'}
            subValue={`Used: ${m.memory?.used || '0'} / Total: ${m.memory?.total || '0'}`}
            percentage={parseFloat(m.memory?.percent || '0')}
            icon={MemoryStick}
            color="purple"
          />
          <MetricCard
            title="Disk Usage"
            value={m.disks?.[0]?.usage || '0%'}
            subValue={`Mount: ${m.disks?.[0]?.mount || '/'} (${m.disks?.[0]?.size || '0'})`}
            percentage={parseFloat(m.disks?.[0]?.usage || '0')}
            icon={HardDrive}
            color="green"
          />
          <MetricCard
            title="Network Speed"
            value={networkSpeed.rx}
            subValue={`TX: ${networkSpeed.tx}`}
            icon={Network}
            color="blue"
          />
        </div>

        {/* Security Alerts */}
        {m.security_alerts && m.security_alerts.length > 0 && (
          <div className="mb-8 bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-lg">
            {m.security_alerts.map((alert: any, i: number) => (
              <div key={i} className="flex gap-2 text-red-400 text-sm">
                <strong>SECURITY ALERT:</strong> PID {alert.pid} ({alert.command}) is running from {alert.reason}.
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-6 mb-6 border-b border-slate-700">
          {[
            { id: 'docker', label: 'Docker', icon: Box },
            { id: 'processes', label: 'Processes', icon: List },
            { id: 'services', label: 'Services', icon: Settings },
            { id: 'logs', label: 'Logs', icon: FileText },
            { id: 'backups', label: 'Backups', icon: ShieldCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "pb-4 flex items-center gap-2 text-sm font-medium transition-all relative",
                activeTab === tab.id
                  ? (tab.id === 'backups' ? "text-amber-400" : "text-indigo-400")
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <span className={cn(
                  "absolute bottom-0 left-0 w-full h-0.5 rounded-t-full",
                  tab.id === 'backups' ? "bg-amber-400" : "bg-indigo-400"
                )}></span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'docker' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
              <DockerTable
                containers={m.all_containers || []}
                stats={m.docker || []}
                onViewLogs={handleViewLogs}
                onViewTop={handleViewTop}
              />
            </div>
          )}

          {activeTab === 'processes' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
              <ProcessTable processes={m.top_processes || []} />
            </div>
          )}

          {activeTab === 'services' && (
            <ServicesGrid services={m.services || {}} />
          )}

          {activeTab === 'logs' && (
            <LogsViewer logs={m.logs} onClear={() => { }} />
          )}

          {activeTab === 'backups' && (
            <BackupsSection />
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="bg-slate-800 w-full max-w-4xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50">
              <h3 className="font-semibold text-slate-200">{modalContent.title}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                Close
              </button>
            </div>
            <pre className="p-6 bg-[#0f172a] text-green-400 font-mono text-xs h-[60vh] overflow-auto whitespace-pre-wrap">
              {modalContent.body}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
