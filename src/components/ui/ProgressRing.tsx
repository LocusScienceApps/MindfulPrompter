'use client';

interface ProgressRingProps {
  /** Progress from 0 to 1 */
  progress: number;
  /** Size in pixels */
  size?: number;
  /** Text to display in the center */
  label: string;
  /** Smaller sub-label below the main label */
  subLabel?: string;
  /** Ring color class (Tailwind stroke color) */
  colorClass?: string;
}

export default function ProgressRing({
  progress,
  size = 240,
  label,
  subLabel,
  colorClass = 'stroke-indigo-500',
}: ProgressRingProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={`${colorClass} transition-all duration-1000 ease-linear`}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-gray-900">{label}</span>
        {subLabel && (
          <span className="mt-1 text-sm text-gray-500">{subLabel}</span>
        )}
      </div>
    </div>
  );
}
