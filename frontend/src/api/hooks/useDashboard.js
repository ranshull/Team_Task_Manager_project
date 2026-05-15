import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.js";

export function useDashboard(projectId) {
  return useQuery({
    queryKey: ["dashboard", projectId || "all"],
    queryFn: async () => (
      await api.get("/api/dashboard", {
        params: projectId ? { project_id: projectId } : {}
      })
    ).data
  });
}
