'use client';

interface StepIndicatorProps {
  current: number;
  total: number;
}

export default function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < current
              ? 'w-2 bg-indigo-600'
              : i === current
                ? 'w-6 bg-indigo-600'
                : 'w-2 bg-gray-300'
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-gray-500">
        {current + 1} of {total}
      </span>
    </div>
  );
}
