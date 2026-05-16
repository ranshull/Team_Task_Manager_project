import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.js";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get("/api/projects")).data
  });
}

export function useProject(id) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => (await api.get(`/api/projects/${id}`)).data,
    enabled: Boolean(id)
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post("/api/projects", payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] })
  });
}

export function useUpdateProject(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.put(`/api/projects/${id}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/projects/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}

export function useAddMember(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email) => (await api.post(`/api/projects/${projectId}/members`, { email })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] })
  });
}
