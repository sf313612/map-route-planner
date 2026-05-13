import { useEffect } from "react";
import type { Job } from "../types/job";
import type { ServerMessage } from "../types/ws";
import { SocketService } from "../services/socket";

type UseJobSocketParams = {
  jobs: Job[];
  updateJob: (jobId: string, patch: Partial<Job>) => void;
};

export function useJobSocket({ jobs, updateJob }: UseJobSocketParams) {
  useEffect(() => {
    const token = window.localStorage.getItem("token");

    if (!token) {
      return;
    }

    const socketService = new SocketService();

    socketService.connect(token);

    socketService.onMessage((message: ServerMessage) => {
      if (message.type === "status_update") {
        updateJob(message.jobId, {
          status: message.status as Job["status"],
          progress: message.progress ?? 0,
          errorMessage: message.message,
        });
      }

      if (message.type === "progress") {
        updateJob(message.jobId, {
          progress: message.progress,
        });
      }

      if (message.type === "completion") {
        updateJob(message.jobId, {
          status: message.status as Job["status"],
          result: message.result,
          errorMessage: message.message,
          progress: 100,
        });
      }
    });

    jobs.forEach((job) => {
      socketService.subscribe(job.jobId);
    });

    return () => {
      socketService.disconnect();
    };
  }, [jobs, updateJob]);
}
