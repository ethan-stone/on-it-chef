interface ProgressBarProps {
  used: number;
  limit: number;
  barColor?: string;
  backgroundColor?: string;
}

export function ProgressBar({
  used,
  limit,
  barColor = "#4CAF50",
  backgroundColor = "#E0E0E0",
}: ProgressBarProps) {
  const progress = Math.min(used / limit, 1) * 100;

  return (
    <div className="w-full">
      <div
        className="w-full h-3 rounded-sm overflow-hidden"
        style={{ backgroundColor }}
      >
        <div
          className="h-full rounded-sm transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-dark-brown">{used} used</span>
        <span className="text-xs text-dark-brown">{limit} total</span>
      </div>
    </div>
  );
}
