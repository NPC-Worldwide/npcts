import React from 'react';

export interface RangeSliderProps {
    label?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    onChangeEnd?: () => void;
    showValue?: boolean;
    className?: string;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    onChangeEnd,
    showValue = true,
    className = ''
}) => (
    <div className={`space-y-1 ${className}`}>
        {(label || showValue) && (
            <div className="flex justify-between text-xs text-gray-400">
                {label && <span>{label}</span>}
                {showValue && <span className="font-mono">{value}</span>}
            </div>
        )}
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onMouseUp={onChangeEnd}
            onTouchEnd={onChangeEnd}
            className="w-full h-1.5 bg-gray-700 rounded appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
        />
    </div>
);
