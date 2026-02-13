'use client';

import { formatNum } from '@/lib/format';

interface NumberInputProps {
  label: string;
  value: number;
  defaultValue: number;
  unit: string;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  helperText?: string;
  errorText?: string;
  integerOnly?: boolean;
}

export default function NumberInput({
  label,
  value,
  defaultValue,
  unit,
  onChange,
  min = 0.5,
  step = 0.5,
  helperText,
  errorText,
  integerOnly = false,
}: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(defaultValue);
      return;
    }
    const parsed = integerOnly ? parseInt(raw, 10) : parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-lg font-medium text-gray-800">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={value === defaultValue ? '' : value}
          placeholder={formatNum(defaultValue)}
          onChange={handleChange}
          min={min}
          step={step}
          className={`w-32 rounded-lg border-2 px-4 py-3 text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errorText ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500'
          }`}
        />
        <span className="text-gray-500">{unit}</span>
      </div>
      {helperText && !errorText && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
      {errorText && (
        <p className="text-sm text-red-600">{errorText}</p>
      )}
    </div>
  );
}
