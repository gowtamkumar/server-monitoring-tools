import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  percentage?: number;
  icon: LucideIcon;
  color?: 'indigo' | 'green' | 'blue' | 'purple';
}

export function MetricCard({ title, value, subValue, percentage, icon: Icon, color = 'indigo' }: MetricCardProps) {
  const getColor = () => {
    switch (color) {
      case 'green': return 'text-green-400 bg-green-400/10';
      case 'blue': return 'text-blue-400 bg-blue-400/10';
      case 'purple': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-indigo-400 bg-indigo-400/10';
    }
  };

  const getBarColor = () => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'blue': return 'bg-blue-500';
      case 'purple': return 'bg-purple-500';
      default: return 'bg-indigo-500';
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</h2>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColor()}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="text-3xl font-bold text-slate-100 mb-2">{value}</div>

      {percentage !== undefined && (
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full ${getBarColor()} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          ></div>
        </div>
      )}

      {subValue && (
        <div className="text-xs text-slate-500 font-medium">
          {subValue}
        </div>
      )}
    </div>
  );
}
