import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalEmbedProps {
    onData: (data: string) => void;
    onResize?: (cols: number, rows: number) => void;
}

export const TerminalEmbed: React.FC<TerminalEmbedProps> = ({ 
    onData,
    onResize 
}) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    useEffect(() => {
        if (!xtermRef.current && terminalRef.current) {
            const term = new Terminal({
                cursorBlink: true,
                fontFamily: '"Fira Code", monospace',
                fontSize: 14,
                theme: {
                    background: '#1a1b26',
                    foreground: '#c0caf5',
                    cursor: '#c0caf5'
                },
            });

            const fitAddon = new FitAddon();
            fitAddonRef.current = fitAddon;
            term.loadAddon(fitAddon);
            term.open(terminalRef.current);

            setTimeout(() => fitAddon.fit(), 0);

            xtermRef.current = term;

            const inputHandler = term.onData(onData);

            const resizeObserver = new ResizeObserver(() => {
                fitAddon.fit();
                if (onResize) {
                    onResize(term.cols, term.rows);
                }
            });
            resizeObserver.observe(terminalRef.current);

            return () => {
                inputHandler.dispose();
                resizeObserver.disconnect();
                term.dispose();
            };
        }
    }, [onData, onResize]);

    return <div ref={terminalRef} className="w-full h-full" />;
};

export const useTerminal = (terminalRef: 
    React.RefObject<{ write: (data: string) => void }>) => {
    return {
        write: (data: string) => {
            terminalRef.current?.write(data);
        }
    };
};
