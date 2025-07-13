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