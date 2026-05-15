import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.js";

export function useProjectTasks(projectId) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/tasks`)).data,
    enabled: Boolean(projectId)
  });
}

export function useProjectTaskQueries(projects) {
  return useQueries({
    queries: projects.map((project) => ({
      queryKey: ["tasks", project.id],
      queryFn: async () => (await api.get(`/api/projects/${project.id}/tasks`)).data,
      enabled: Boolean(project.id)
    }))
  });
}

export function useTask(taskId) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => (await api.get(`/api/tasks/${taskId}`)).data,
    enabled: Boolean(taskId)
  });
}

export function useCreateTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post(`/api/projects/${projectId}/tasks`, payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
  });
}

export function useUpdateTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => (await api.put(`/api/tasks/${id}`, payload)).data,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId || task.project_id] });
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}

export function useDeleteTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}
