"use client";

import { fetchMonthlyBandwidth } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Activity, RefreshCw, Wifi } from "lucide-react";

interface MonthData {
  month: string;
  label: string;
  rx: number;
  tx: number;
  rx_formatted: string;
  tx_formatted: string;
  total: number;
  total_formatted: string;
}

interface BandwidthData {
  success: boolean;
  interface?: string;
  months: MonthData[];
  total_rx?: string;
  total_tx?: string;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Convert raw bytes to GB for chart display
function toGB(bytes: number) {
  return parseFloat((bytes / (1024 ** 3)).toFixed(2));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs min-w-[190px]">
      <p className="text-slate-400 mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: p.color }} className="font-semibold">{p.name}</span>
          <span className="text-slate-300 font-mono">{p.value?.toFixed(2)} GB</span>
        </div>
      ))}
      {payload.length >= 2 && (
        <div className="flex justify-between gap-4 py-0.5 border-t border-slate-700 mt-1 pt-1">
          <span className="text-slate-400 font-semibold">Total</span>
          <span className="text-white font-mono">
            {(payload.reduce((s: number, p: any) => s + (p.value || 0), 0)).toFixed(2)} GB
          </span>
        </div>
      )}
    </div>
  );
};

export function BandwidthChart() {
  const [data, setData] = useState<BandwidthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchMonthlyBandwidth();
      setData(json);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const chartData = (data?.months || []).map(m => ({
    label: m.label,
    "Download (RX)": toGB(m.rx),
    "Upload (TX)": toGB(m.tx),
  }));

  // Summary stats
  const totalRx = (data?.months || []).reduce((s, m) => s + m.rx, 0);
  const totalTx = (data?.months || []).reduce((s, m) => s + m.tx, 0);
  const peakMonth = (data?.months || []).reduce(
    (max, m) => (m.total > (max?.total ?? 0) ? m : max),
    null as MonthData | null
  );
  const currentMonth = data?.months?.[data.months.length - 1];

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-slate-200 font-semibold text-sm">
              Monthly Bandwidth Usage
              {data?.interface && (
                <span className="ml-2 text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                  {data.interface}
                </span>
              )}
            </h2>
            <p className="text-slate-500 text-xs">
              Download · Upload — last 12 months via vnstat
              {lastRefresh && <> · Updated {lastRefresh.toLocaleTimeString()}</>}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-700">
        {[
          { label: "Total Download", value: formatBytes(totalRx), color: "text-cyan-400" },
          { label: "Total Upload", value: formatBytes(totalTx), color: "text-violet-400" },
          { label: "This Month", value: currentMonth?.total_formatted || "—", color: "text-emerald-400" },
          { label: "Peak Month", value: peakMonth ? peakMonth.label : "—", color: "text-amber-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-800 p-4 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
            <span className="text-slate-500 text-xs mt-0.5">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="p-5">
        {loading && (
          <div className="h-[320px] flex items-center justify-center text-slate-500">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
              <span className="text-sm">Loading bandwidth data…</span>
            </div>
          </div>
        )}

        {!loading && (error || data?.error) && (
          <div className="h-[320px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <Activity className="w-10 h-10 text-slate-600" />
              <p className="text-red-400 font-semibold text-sm">Could not load bandwidth data</p>
              <p className="text-slate-500 text-xs">{error || data?.error}</p>
              <p className="text-slate-600 text-xs">
                Make sure <code className="bg-slate-700 px-1 rounded">vnstat</code> is installed on the monitored server.
                <br />Install with: <code className="bg-slate-700 px-1 rounded">apt install vnstat</code>
              </p>
            </div>
          </div>
        )}

        {!loading && !error && !data?.error && chartData.length === 0 && (
          <div className="h-[320px] flex flex-col items-center justify-center text-slate-500 gap-3">
            <Wifi className="w-10 h-10 text-slate-600" />
            <p className="text-sm font-medium">No monthly data yet</p>
            <p className="text-xs text-slate-600 text-center max-w-xs">
              vnstat needs to collect data for at least one month.
            </p>
          </div>
        )}

        {!loading && !error && !data?.error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 10 }}
                stroke="#1e293b"
              />
              <YAxis
                tickFormatter={(v) => `${v} GB`}
                tick={{ fill: "#64748b", fontSize: 10 }}
                stroke="#1e293b"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} iconType="circle" />
              <Bar dataKey="Download (RX)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Upload (TX)" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {!loading && chartData.length > 0 && (
          <p className="text-center text-slate-600 text-xs mt-2">
            {chartData.length} month{chartData.length !== 1 ? "s" : ""} of data — values in GB
          </p>
        )}
      </div>
    </div>
  );
}
