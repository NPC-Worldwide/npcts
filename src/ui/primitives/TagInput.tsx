import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  label = 'Tags',
  placeholder = 'Add tag',
  className = ''
}) => {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      <div className="text-xs uppercase font-semibold theme-text-secondary mb-1">
        {label}
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="px-2 py-0.5 rounded-full text-xs bg-gray-800 flex items-center gap-1"
          >
            {tag}
            <button onClick={() => removeTag(i)}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 theme-input text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTag()}
          placeholder={placeholder}
        />
        <button className="theme-button px-3" onClick={addTag}>
          <PlusCircle size={14} />
        </button>
      </div>
    </div>
  );
};