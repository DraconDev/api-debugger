import type { TimingBreakdown as TimingBreakdownType } from "@/types";

interface TimingBreakdownProps {
  timing: TimingBreakdownType;
}

export function TimingBreakdown({ timing }: TimingBreakdownProps) {
  const phases = [
    { name: "DNS Lookup", value: timing.dns, color: "bg-blue-500" },
    { name: "Connection", value: timing.connect, color: "bg-warning" },
    { name: "TLS Handshake", value: timing.tls, color: "bg-purple-500" },
    { name: "TTFB", value: timing.ttfb, color: "bg-success" },
    { name: "Download", value: timing.download, color: "bg-cyan-500" },
  ];

  const formatMs = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms.toFixed(1)}ms`;
  };

  const total = timing.total || timing.dns + timing.connect + timing.tls + timing.ttfb + timing.download;

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Timing Breakdown</h3>
        <span className="text-sm text-muted-foreground">
          Total: <span className="font-mono font-medium text-foreground">{formatMs(total)}</span>
        </span>
      </div>

      <div className="space-y-2">
        {phases.map((phase) => {
          const percentage = total > 0 ? (phase.value / total) * 100 : 0;
          return (
            <div key={phase.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{phase.name}</span>
                <span className="font-mono">{formatMs(phase.value)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${phase.color} rounded-full transition-all`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground mb-2">Waterfall</div>
        <div className="relative h-8 bg-muted/50 rounded">
          {timing.dns > 0 && (
            <div
              className="absolute top-1 bottom-1 bg-blue-500/70 rounded"
              style={{
                left: "0%",
                width: `${(timing.dns / total) * 100}%`,
              }}
              title={`DNS: ${formatMs(timing.dns)}`}
            />
          )}
          {timing.connect > 0 && (
            <div
              className="absolute top-1 bottom-1 bg-warning/70 rounded"
              style={{
                left: `${(timing.dns / total) * 100}%`,
                width: `${(timing.connect / total) * 100}%`,
              }}
              title={`Connect: ${formatMs(timing.connect)}`}
            />
          )}
          {timing.tls > 0 && (
            <div
              className="absolute top-1 bottom-1 bg-purple-500/70 rounded"
              style={{
                left: `${((timing.dns + timing.connect) / total) * 100}%`,
                width: `${(timing.tls / total) * 100}%`,
              }}
              title={`TLS: ${formatMs(timing.tls)}`}
            />
          )}
          {timing.ttfb > 0 && (
            <div
              className="absolute top-1 bottom-1 bg-success/70 rounded"
              style={{
                left: `${((timing.dns + timing.connect + timing.tls) / total) * 100}%`,
                width: `${(timing.ttfb / total) * 100}%`,
              }}
              title={`TTFB: ${formatMs(timing.ttfb)}`}
            />
          )}
          {timing.download > 0 && (
            <div
              className="absolute top-1 bottom-1 bg-cyan-500/70 rounded"
              style={{
                left: `${((timing.dns + timing.connect + timing.tls + timing.ttfb) / total) * 100}%`,
                width: `${(timing.download / total) * 100}%`,
              }}
              title={`Download: ${formatMs(timing.download)}`}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0ms</span>
          <span>{formatMs(total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        {phases.map((phase) => (
          <div key={phase.name} className="flex items-center gap-1.5 text-xs">
            <div className={`w-2 h-2 rounded ${phase.color}`} />
            <span className="text-muted-foreground">{phase.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
