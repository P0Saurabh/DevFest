import React from 'react';
import { Github, Calendar, ArrowUpRight } from 'lucide-react';

export interface ProjectProps {
  title: string;
  description: string;
  thumbnail?: string; // Optional image URL
  tags: string[];
  repoUrl?: string;
  demoUrl?: string;
  date?: string;
  role?: string; // e.g., "Frontend", "DevOps", "Full Stack"
}

interface ProjectOverviewCardProps {
  project: ProjectProps;
  className?: string;
}

const ProjectOverviewCard: React.FC<ProjectOverviewCardProps> = ({ 
  project, 
  className = '' 
}) => {
  const { title, description, thumbnail, tags, repoUrl, demoUrl, date, role } = project;

  return (
    <div 
      className={`
        group relative flex flex-col overflow-hidden rounded-xl 
        border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950
        transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50
        ${className}
      `}
    >
      {/* 1. Thumbnail Section (Optional) */}
      {thumbnail ? (
        <div className="relative h-48 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          <img 
            src={thumbnail} 
            alt={title} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      ) : (
        // Fallback pattern if no image is provided
        <div className="h-32 w-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900" />
      )}

      {/* 2. Content Section */}
      <div className="flex flex-1 flex-col p-6">
        
        {/* Header: Role & Date */}
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
             {role || 'Project'}
          </span>
          {date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {date}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-xl font-bold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
          {title}
        </h3>

        {/* Description */}
        <p className="mb-6 line-clamp-3 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>

        {/* Tech Stack Tags */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span 
              key={tag} 
              className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 3. Footer: Action Buttons */}
        <div className="mt-auto flex items-center gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {repoUrl && (
            <a 
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-white"
            >
              <Github className="h-4 w-4" />
              Source
            </a>
          )}
          
          {demoUrl && (
            <a 
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-105 dark:bg-white dark:text-black"
            >
              Live Demo
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectOverviewCard;