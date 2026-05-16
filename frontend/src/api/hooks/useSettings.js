import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.js";

export function useSignupSettings() {
  return useQuery({
    queryKey: ["settings", "signup"],
    queryFn: async () => (await api.get("/api/settings/signup")).data
  });
}

export function useUpdateSignupSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.put("/api/settings/signup", payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "signup"] })
  });
}
