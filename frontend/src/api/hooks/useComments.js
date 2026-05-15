import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.js";

export function useComments(taskId) {
  return useQuery({
    queryKey: ["comments", taskId],
    queryFn: async () => (await api.get(`/api/tasks/${taskId}/comments`)).data,
    enabled: Boolean(taskId)
  });
}

export function usePostComment(taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.post(`/api/tasks/${taskId}/comments`, { body })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", taskId] })
  });
}

export function useDeleteComment(taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => api.delete(`/api/comments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", taskId] })
  });
}
