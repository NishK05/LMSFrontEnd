// Discussion Board Types

export type DiscussionPrivacy = 'PUBLIC' | 'PRIVATE' | 'ANONYMOUS'
export type DiscussionPostType = 'QUESTION' | 'POST'
export type DiscussionThreadStatus = 'OPEN' | 'RESOLVED'

export interface DiscussionTag {
  id: string
  courseId: string
  name: string
  createdById: string
  createdAt: string
}

export interface DiscussionPost {
  id: string
  courseId: string
  authorId: string
  title: string
  body: string
  type: DiscussionPostType
  tag: DiscussionTag
  privacy: DiscussionPrivacy
  isPinned: boolean
  isResolved: boolean
  isDeleted: boolean
  uniqueCode: string
  attachmentUrl?: string
  createdAt: string
  updatedAt: string
  author: DiscussionUser
  replies: DiscussionReply[]
}

export interface DiscussionReply {
  id: string
  postId: string
  parentReplyId?: string | null
  authorId: string
  body: string
  privacy: DiscussionPrivacy
  isEndorsed: boolean
  isDeleted: boolean
  uniqueCode: string
  attachmentUrl?: string
  createdAt: string
  updatedAt: string
  author: DiscussionUser
  replies?: DiscussionReply[] // 1-level nesting
}

export interface DiscussionUser {
  id: string
  name: string
  email: string
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'COLLABORATOR'
  avatar?: string
}

export interface DiscussionCourse {
  id: string
  title: string
  tags: DiscussionTag[]
}

// For filters/search
export type DiscussionFilter =
  | 'ALL'
  | 'UNREAD'
  | 'NEW_REPLIES'
  | 'UNANSWERED'
  | 'UNRESOLVED'
  | 'ENDORSED'
  | 'WATCHING'
  | 'STARRED'
  | 'PRIVATE'
  | 'PUBLIC'
  | 'STAFF'
  | 'ME'

// API response types
export interface DiscussionApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
} 