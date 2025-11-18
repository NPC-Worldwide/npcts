export interface CronJob {
  id: string;
  schedule: string;
  command: string;
  label?: string;
}

export interface Daemon {
  id: string;
  name: string;
  command: string;
  status: "running" | "stopped" | "unknown";
}

export interface JobClient {
  listCronJobs(): Promise<CronJob[]>;
  addCronJob(job: Omit<CronJob, "id">): Promise<CronJob>;
  removeCronJob(id: string): Promise<void>;
  listDaemons(): Promise<Daemon[]>;
  addDaemon(daemon: Omit<Daemon, "id" | "status">): Promise<Daemon>;
  removeDaemon(id: string): Promise<void>;
}
