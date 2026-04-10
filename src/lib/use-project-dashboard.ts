"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardData } from "@/lib/types";

export function useProjectDashboard(projectId: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/dashboard`, { cache: "no-store" });
    const payload = await res.json();

    if (!res.ok) {
      setError(payload.error || "Failed to load dashboard");
      return;
    }

    setData(payload);
    setError(null);
  }, [projectId]);

  useEffect(() => {
    fetchDashboard();
    const timer = window.setInterval(fetchDashboard, 15000);
    return () => window.clearInterval(timer);
  }, [fetchDashboard]);

  return {
    data,
    error,
    refresh: fetchDashboard
  };
}
