import React, { useEffect, useRef, useState } from "react";

interface TerminalProps {
  terminalId?: string;
  onCommand?: (command: string) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ 
  terminalId, 
  onCommand 
}) => {
  const [output, setOutput] = useState<string[]>([
    "Terminal initialized...",
    `Session: ${terminalId || "default"}`,
    "",
  ]);
  const [input, setInput] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setOutput((prev) => [...prev, `$ ${input}`, ""]);
    
    if (onCommand) {
      onCommand(input);
    }
    
    setInput("");
  };

  return (
    <div className="h-full w-full flex flex-col bg-black text-green-400 
      font-mono text-sm">
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 whitespace-pre-wrap"
      >
        {output.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-gray-700 p-2">
        <div className="flex items-center gap-2">
          <span className="text-blue-400">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent outline-none text-green-400"
            autoFocus
            placeholder="Enter command..."
          />
        </div>
      </form>
    </div>
  );
};
