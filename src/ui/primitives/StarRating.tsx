import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  onChange: (rating: number) => void;
  label?: string;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  onChange,
  label = 'Rating',
  className = ''
}) => {
  return (
    <div className={className}>
      <label className="text-xs uppercase font-semibold theme-text-secondary">
        {label}
      </label>
      <div className="flex items-center gap-1 mt-1">
        {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            onClick={() => onChange(star === rating ? 0 : star)}
          >
            <Star
              size={22}
              className={
                star <= rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-600'
              }
            />
          </button>
        ))}
      </div>
    </div>
  );
};