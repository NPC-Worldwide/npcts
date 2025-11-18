export type StreamStatus = "idle" | "streaming" | "error";

export interface StreamController {
  streamId: string;
  abort(): Promise<void> | void;
}

export interface StreamHandlers<TChunk> {
  onChunk: (chunk: TChunk) => void;
  onComplete?: () => void;
  onError?: (error: unknown) => void;
}
