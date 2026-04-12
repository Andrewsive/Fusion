"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardData } from "@/lib/types";

type Options = {
  /** 为 true 时不轮询，避免编辑文档时被刷新覆盖 */
  pausePolling?: boolean;
};

export function useProjectDashboard(projectId: string, options?: Options) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pausePolling = options?.pausePolling ?? false;

  const fetchDashboard = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/dashboard`, { cache: "no-store" });
    const payload = await res.json();

    if (!res.ok) {
      setError(payload.error || "Failed to load dashboard");
      return;
    }

    const normalized: DashboardData = {
      ...payload,
      documents: Array.isArray(payload.documents) ? payload.documents : [],
      me: payload.me ?? null
    };

    setData(normalized);
    setError(null);
  }, [projectId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (pausePolling) return undefined;
    const timer = window.setInterval(fetchDashboard, 15000);
    return () => window.clearInterval(timer);
  }, [fetchDashboard, pausePolling]);

  return {
    data,
    error,
    refresh: fetchDashboard
  };
}
