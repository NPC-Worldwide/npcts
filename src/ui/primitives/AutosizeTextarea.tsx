import React, { useEffect, useRef } from 'react';

interface AutosizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  minRows?: number;
  maxRows?: number;
}

export const AutosizeTextarea: React.FC<AutosizeTextareaProps> = ({
  value,
  minRows = 1,
  maxRows = 10,
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;

    textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
  }, [value, minRows, maxRows]);

  return <textarea ref={textareaRef} value={value} {...props} />;
};

export default AutosizeTextarea;
