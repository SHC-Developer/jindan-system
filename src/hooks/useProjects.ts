import { useState, useEffect, useCallback } from 'react';
import {
  fetchProjects,
  createProject as createProjectApi,
  updateProjectName as updateProjectNameApi,
  deleteProject as deleteProjectApi,
} from '../lib/projects-firestore';
import type { Project } from '../types/project';

export function useProjects(createdBy?: string): {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  updateProjectName: (projectId: string, name: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
} {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchProjects(true);
      setProjects(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로젝트 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createProject = useCallback(
    async (name: string): Promise<Project> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('프로젝트 이름을 입력하세요.');
      const created = await createProjectApi(trimmed, createdBy);
      setProjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    },
    [createdBy]
  );

  const updateProjectName = useCallback(async (projectId: string, name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('프로젝트 이름을 입력하세요.');
    await updateProjectNameApi(projectId, trimmed);
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name: trimmed } : p))
    );
  }, []);

  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    await deleteProjectApi(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  return {
    projects,
    loading,
    error,
    refetch: load,
    createProject,
    updateProjectName,
    deleteProject,
  };
}
