import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.js";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/api/dashboard")).data
  });
}
