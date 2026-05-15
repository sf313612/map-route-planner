import { useEffect, useMemo, useRef, useState } from "react";
import type { Job } from "../types/job";
import type { ServerMessage } from "../types/ws";
import { getRouteSearchJob } from "../services/api";
import { connectJobSocket } from "../services/socket";
import type { SocketConnectionStatus } from "../services/socket";

type UseJobSocketParams = {
  jobs: Job[];
  refreshKey?: number;
  updateJob: (jobId: string, patch: Partial<Job>) => void;
};

type RealtimeStatus = SocketConnectionStatus | "fallback";

const ACTIVE_STATUSES = new Set<Job["status"]>(["CREATED", "PROCESSING"]);

export function useJobSocket({ jobs, refreshKey = 0, updateJob }: UseJobSocketParams) {
  const socketRef = useRef<Awaited<ReturnType<typeof connectJobSocket>> | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<RealtimeStatus>("connecting");
  const jobIds = useMemo(() => jobs.map((job) => job.jobId), [jobs]);
  const activeJobIds = useMemo(
    () =>
      jobs
        .filter((job) => ACTIVE_STATUSES.has(job.status))
        .map((job) => job.jobId),
    [jobs]
  );

  useEffect(() => {
    let isCurrent = true;

    async function connect() {
      const socketService = await connectJobSocket();

      if (!isCurrent) {
        socketService.disconnect();
        return;
      }

      socketRef.current = socketService;

      socketService.onStatus((status) => {
        setConnectionStatus(status);
      });

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
    }

    void connect();

    return () => {
      isCurrent = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [refreshKey, updateJob]);

  useEffect(() => {
    jobIds.forEach((jobId) => {
      socketRef.current?.subscribe(jobId);
    });
  }, [jobIds]);

  useEffect(() => {
    if (connectionStatus === "connected" || activeJobIds.length === 0) {
      return;
    }

    setConnectionStatus("fallback");

    const pollJobs = async () => {
      await Promise.all(
        activeJobIds.map(async (jobId) => {
          try {
            const job = await getRouteSearchJob(jobId);
            updateJob(jobId, job);
          } catch {
            // The socket reconnect loop remains the primary recovery signal.
          }
        })
      );
    };

    void pollJobs();
    const intervalId = window.setInterval(() => {
      void pollJobs();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeJobIds, connectionStatus, updateJob]);

  return {
    connectionStatus,
  };
}
