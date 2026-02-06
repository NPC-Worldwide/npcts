// Type declaration for socket.io-client (peer dependency)
declare module 'socket.io-client' {
  interface Socket {
    connected: boolean;
    on(event: string, callback: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
    disconnect(): void;
  }
  export function io(url: string, opts?: any): Socket;
  export type { Socket };
}
