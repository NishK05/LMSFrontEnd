// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN = 'ADMIN'
}

// Course types
export interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  image?: string;
  instructorId: string;
  instructor: User;
  isPublished: boolean;
  isFree: boolean;
  price?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Lesson types
export interface Lesson {
  id: string;
  title: string;
  description?: string;
  content: string;
  courseId: string;
  course: Course;
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Enrollment types
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  user: User;
  course: Course;
  progress: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Progress types
export interface Progress {
  id: string;
  userId: string;
  lessonId: string;
  user: User;
  lesson: Lesson;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Form types
export interface CourseFormData {
  title: string;
  description: string;
  image?: string;
  isFree: boolean;
  price?: number;
}

export interface LessonFormData {
  title: string;
  description?: string;
  content: string;
  order: number;
}

// LMS Files System Types
export interface LMSFile {
  id: string
  filename: string
  path: string
  size: number
  mimetype: string
  uploadedBy: string
  uploadedAt: string
  folderId?: string | null
  visibleInClasses: string[] // course IDs
  assignmentId?: string | null // assignment this file is attached to
  protect?: boolean // whether the file is protected (for teacher/admin tag)
}

export interface LMSFolder {
  id: string
  name: string
  path: string
  createdAt: string
  parentId?: string | null
  children?: LMSFolder[]
  files?: LMSFile[]
  visibleInClasses: string[] // course IDs
}

export type FileManagerMode = 'teacher' | 'student'

export interface FileManagerState {
  currentPath: string
  folders: LMSFolder[]
  files: LMSFile[]
  loading: boolean
  error: string
  uploadProgress: number
  selectedFiles: File[]
  selectedClasses: string[]
}

// Chat types
export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  courseId?: string
}

export interface ChatRequest {
  message: string
  courseId?: string
  userId: string
}

export interface ChatResponse {
  success: boolean
  data?: {
    message: string
    sources?: string[]
  }
  error?: string
}

export interface ChatSession {
  id: string
  userId: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
} 