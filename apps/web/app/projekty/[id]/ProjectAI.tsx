"use client";

import { AIAssistant } from "@/components/editor/AIAssistant";

interface ProjectAIProps {
  projectName: string;
  projectDescription: string;
  projectCategory: string;
}

export function ProjectAI({ projectName, projectDescription, projectCategory }: ProjectAIProps) {
  return (
    <AIAssistant
      context={{
        type: "project",
        projectName,
        projectDescription,
        projectCategory,
      }}
    />
  );
}
