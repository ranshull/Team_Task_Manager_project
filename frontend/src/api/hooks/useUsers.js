import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.js";

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/api/users")).data,
    enabled
  });
}

export function useUserSearch(query, enabled = true) {
  const normalized = query.trim();
  return useQuery({
    queryKey: ["users", "search", normalized],
    queryFn: async () => (await api.get("/api/users/search", { params: { q: normalized } })).data,
    enabled: enabled && normalized.length > 0
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }) => (await api.patch(`/api/users/${id}/role`, { role })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] })
  });
}
