'use client';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export default function Card({
  children,
  onClick,
  selected = false,
  className = '',
}: CardProps) {
  const interactive = onClick ? 'cursor-pointer hover:border-indigo-400 hover:shadow-md active:scale-[0.98]' : '';
  const selectedStyle = selected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 bg-white';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={`rounded-2xl border-2 p-5 transition-all duration-200 ${interactive} ${selectedStyle} ${className}`}
    >
      {children}
    </div>
  );
}
