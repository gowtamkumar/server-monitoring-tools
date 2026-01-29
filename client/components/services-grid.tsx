interface ServicesGridProps {
  services: Record<string, string>;
}

export function ServicesGrid({ services }: ServicesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(services).map(([name, status]) => {
        const isActive = status === 'active';
        return (
          <div key={name} className="bg-slate-800 border border-slate-700 rounded-lg p-5 flex items-center justify-between">
            <span className="font-medium text-slate-200">{name}</span>
            <div className="flex items-center gap-3">
              <span className={`font-bold text-sm ${isActive ? 'text-green-400' : 'text-red-400'}`}>
                {status.toUpperCase()}
              </span>
              <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
