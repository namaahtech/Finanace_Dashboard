"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Grid3x3, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { ProjectCard } from "./ProjectCard";
import { ProjectKanban } from "./ProjectKanban";

interface Project {
  id: string;
  name: string;
  description?: string;
  progress: number;
  phase: string;
  dueDate?: string;
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
  };
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  initialProjectId?: string;
}

export function ProjectModal({ isOpen, onClose, projects, initialProjectId }: ProjectModalProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (isOpen && initialProjectId) {
      const proj = projects.find(p => p.id === initialProjectId);
      if (proj) {
        setSelectedProject(proj);
        setViewMode("kanban");
      }
    } else if (!isOpen) {
      setSelectedProject(null);
      setViewMode("list");
    }
  }, [isOpen, initialProjectId, projects]);

  if (!isOpen) return null;

  const handleProjectClick = (project: Project) => {
    setViewMode("kanban");
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setViewMode("list");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-auto rounded-2xl border border-theme-border bg-theme-surface shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-5 border-b border-theme-border bg-theme-surface/95 backdrop-blur-md flex items-center justify-between">
          <div>
            {selectedProject ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToList}
                  className="p-1 rounded-lg hover:bg-theme-raised transition-colors"
                  title="Back to list"
                >
                  <X size={18} className="text-theme-muted hover:text-theme-fg transition-colors" />
                </button>
                <h2 className="text-lg font-black text-theme-fg">{selectedProject.name}</h2>
              </div>
            ) : (
              <h2 className="text-lg font-black text-theme-fg">My Assigned Projects</h2>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!selectedProject && (
              <div className="flex items-center gap-1 p-1 bg-theme-page rounded-lg border border-theme-border">
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    viewMode === "list"
                      ? "bg-theme-surface text-theme-fg shadow-sm"
                      : "text-theme-muted hover:text-theme-fg hover:bg-theme-raised"
                  )}
                  title="List view"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => setViewMode("kanban")}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    viewMode === "kanban"
                      ? "bg-theme-surface text-theme-fg shadow-sm"
                      : "text-theme-muted hover:text-theme-fg hover:bg-theme-raised"
                  )}
                  title="Kanban view"
                >
                  <Grid3x3 size={16} />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-theme-raised transition-colors text-theme-muted hover:text-theme-fg"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {selectedProject ? (
            <ProjectKanban
              projectId={selectedProject.id}
              projectName={selectedProject.name}
              progress={selectedProject.progress}
              onClose={handleBackToList}
            />
          ) : viewMode === "list" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-theme-muted font-bold">No assigned projects yet</p>
                  <p className="text-[12px] text-theme-subtle mt-1">Check back later for new assignments</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} onClick={() => handleProjectClick(project)}>
                    <ProjectCard {...project} onClick={() => handleProjectClick(project)} />
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-theme-muted font-bold">No assigned projects yet</p>
                  <p className="text-[12px] text-theme-subtle mt-1">Check back later for new assignments</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} onClick={() => handleProjectClick(project)}>
                    <ProjectCard {...project} onClick={() => handleProjectClick(project)} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
