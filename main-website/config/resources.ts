// ─────────────────────────────────────────────────────────────────────────────
// Static resource catalogue.
//
// Not CMS content: these five entries were hardcoded in the React page and the
// backend has no `resources` collection, so they stay in the repo — the same
// treatment locationLandings gets.
//
// This module deliberately holds NO "use client" directive. The resource
// definitions are read by server code (generateStaticParams, generateMetadata)
// as well as by the client view, and values exported from a client module
// arrive on the server as opaque client references rather than real objects.
// ─────────────────────────────────────────────────────────────────────────────
import { BookOpen, Bot, FileQuestion, FileText, PlayCircle } from "lucide-react";

export const resources = {
  lms: {
    icon: BookOpen,
    title: "Learning Management System",
    desc: "Access all your enrolled course materials, assignments, and progress tracking in one unified LMS.",
  },

  "glory-ai": {
    icon: Bot,
    title: "Glory-AI Assistant",
    desc: "Your 24/7 AI tutor that answers doubts, suggests resources, and helps you stay on track.",
  },

  "interview-questions": {
    icon: FileQuestion,
    title: "Interview Questions Bank",
    desc: "Curated, role-specific interview questions with model answers from real hiring rounds.",
  },

  "course-material": {
    icon: FileText,
    title: "Course Material Library",
    desc: "Downloadable PDFs, cheatsheets, and reference materials for every module.",
  },

  "video-lectures": {
    icon: PlayCircle,
    title: "Video Lecture Vault",
    desc: "On-demand HD recordings of every session — revise anytime, on any device.",
  },
} as const;

export type ResourceSlug = keyof typeof resources;

export const RESOURCE_SLUGS = Object.keys(resources) as ResourceSlug[];

export const isResourceSlug = (s: string): s is ResourceSlug => s in resources;

export const getResource = (s: ResourceSlug) => resources[s];
