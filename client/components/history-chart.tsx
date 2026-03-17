"use client";

import { fetchHistory } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { TrendingUp, RefreshCw, Database } from "lucide-react";

interface HistoryPoint {
  hour: string;
  avg_cpu: number;
  avg_ram: number;
  avg_disk: number;
  avg_ram_used_gb: number;
  avg_ram_total_gb: number;
  disk_used: string;
  disk_total: string;
  sample_count: number;
}

function formatHour(isoHour: string) {
  try {
    const d = new Date(isoHour);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoHour;
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs min-w-[180px]">
      <p className="text-slate-400 mb-2 font-medium">{formatHour(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: p.color }} className="font-semibold">
            {p.name}
          </span>
          <span className="text-slate-300 font-mono">{p.value?.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export function HistoryChart() {
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [days, setDays] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchHistory(days);
      // fetchHistory returns { success, days, data: [...] }
      const result: HistoryPoint[] = json?.data || [];
      setData(result);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const avgCPU =
    data.length > 0
      ? (data.reduce((s, d) => s + d.avg_cpu, 0) / data.length).toFixed(1)
      : "0.0";
  const peakCPU =
    data.length > 0 ? Math.max(...data.map((d) => d.avg_cpu)).toFixed(1) : "0.0";
  const avgRAM =
    data.length > 0
      ? (data.reduce((s, d) => s + d.avg_ram, 0) / data.length).toFixed(1)
      : "0.0";
  const avgDisk =
    data.length > 0
      ? (data.reduce((s, d) => s + d.avg_disk, 0) / data.length).toFixed(1)
      : "0.0";

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-slate-200 font-semibold text-sm">
              Historical Performance
            </h2>
            <p className="text-slate-500 text-xs">
              CPU · RAM · Disk — hourly averages
              {lastRefresh && (
                <> · Updated {lastRefresh.toLocaleTimeString()}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Day range selector */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs">
            {[1, 7, 15].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 transition-colors ${
                  days === d
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {d}d
              </button>
            ))}
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
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-700">
        {[
          { label: "Avg CPU", value: `${avgCPU}%`, color: "text-indigo-400" },
          { label: "Peak CPU", value: `${peakCPU}%`, color: "text-red-400" },
          { label: "Avg RAM", value: `${avgRAM}%`, color: "text-purple-400" },
          { label: "Avg Disk", value: `${avgDisk}%`, color: "text-emerald-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-800 p-4 flex flex-col items-center justify-center"
          >
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
            <span className="text-slate-500 text-xs mt-0.5">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="p-5">
        {loading && (
          <div className="h-[340px] flex items-center justify-center text-slate-500">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-sm">Loading {days}-day history…</span>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="h-[340px] flex items-center justify-center text-red-400 text-sm">
            <div className="flex flex-col items-center gap-2 text-center max-w-xs">
              <p className="font-semibold">Could not load history</p>
              <p className="text-slate-500 text-xs">{error}</p>
              <p className="text-slate-500 text-xs">
                Make sure the backend server is running and accessible.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="h-[340px] flex flex-col items-center justify-center text-slate-500 gap-3">
            <Database className="w-10 h-10 text-slate-600" />
            <p className="text-sm font-medium">No historical data yet</p>
            <p className="text-xs text-slate-600 text-center max-w-xs">
              The backend records a snapshot every 10 minutes. Check back shortly
              after the server has been running for a while.
            </p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
            >
              <defs>
                <filter id="glow-cpu">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="hour"
                tickFormatter={formatHour}
                tick={{ fill: "#64748b", fontSize: 10 }}
                interval="preserveStartEnd"
                stroke="#1e293b"
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: "#64748b", fontSize: 10 }}
                stroke="#1e293b"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
                iconType="circle"
              />
              {/* Warning line at 80% */}
              <ReferenceLine
                y={80}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{ value: "80% warn", fill: "#ef4444", fontSize: 9 }}
              />
              <Line
                type="monotone"
                dataKey="avg_cpu"
                name="CPU"
                stroke="#818cf8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#818cf8" }}
              />
              <Line
                type="monotone"
                dataKey="avg_ram"
                name="RAM"
                stroke="#c084fc"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#c084fc" }}
              />
              <Line
                type="monotone"
                dataKey="avg_disk"
                name="Disk"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#34d399" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {!loading && data.length > 0 && (
          <p className="text-center text-slate-600 text-xs mt-2">
            {data.length} hourly data points over the last {days} day
            {days !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
