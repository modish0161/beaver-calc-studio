import { useCallback } from "react";

interface ProjectData {
  id: string;
  name: string;
  calculator: string;
  formData: Record<string, any>;
  savedAt: string;
  projectInfo?: {
    projectName?: string;
    reference?: string;
    preparedBy?: string;
    checkedBy?: string;
  };
}

const STORAGE_KEY = "beaver-saved-projects";

function getProjects(): ProjectData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setProjects(projects: ProjectData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function useProjectStorage(calculatorKey: string) {
  const saveProject = useCallback(
    (
      name: string,
      formData: Record<string, any>,
      projectInfo?: ProjectData["projectInfo"],
    ) => {
      const projects = getProjects();
      const project: ProjectData = {
        id: `${calculatorKey}-${Date.now()}`,
        name,
        calculator: calculatorKey,
        formData,
        savedAt: new Date().toISOString(),
        projectInfo,
      };
      projects.unshift(project);
      // Keep max 50 saves per calculator
      const filtered = projects
        .filter((p) => p.calculator === calculatorKey)
        .slice(0, 50);
      const others = projects.filter((p) => p.calculator !== calculatorKey);
      setProjects([...filtered, ...others]);
      return project.id;
    },
    [calculatorKey],
  );

  const loadProject = useCallback((id: string): ProjectData | null => {
    return getProjects().find((p) => p.id === id) || null;
  }, []);

  const listProjects = useCallback((): ProjectData[] => {
    return getProjects().filter((p) => p.calculator === calculatorKey);
  }, [calculatorKey]);

  const deleteProject = useCallback((id: string) => {
    setProjects(getProjects().filter((p) => p.id !== id));
  }, []);

  return { saveProject, loadProject, listProjects, deleteProject };
}

export type { ProjectData };
