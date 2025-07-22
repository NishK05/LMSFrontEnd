import {
  DiscussionPost,
  DiscussionReply,
  DiscussionTag,
  DiscussionCourse,
  DiscussionApiResponse,
  DiscussionFilter,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// --- POSTS ---
export async function fetchDiscussionPosts(courseId: string, filter?: DiscussionFilter, search?: string): Promise<DiscussionApiResponse<DiscussionPost[]>> {
  const res = await fetch(`${API_BASE}/discussions/${courseId}/posts`)
  return res.json()
}

export async function fetchDiscussionPost(postId: string): Promise<DiscussionApiResponse<DiscussionPost>> {
  const res = await fetch(`${API_BASE}/discussions/posts/${postId}`)
  return res.json()
}

export async function createDiscussionPost(post: Partial<DiscussionPost>): Promise<DiscussionApiResponse<DiscussionPost>> {
  const res = await fetch(`${API_BASE}/discussions/${post.courseId}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post),
  })
  return res.json()
}

export async function updateDiscussionPost(postId: string, updates: Partial<DiscussionPost>): Promise<DiscussionApiResponse<DiscussionPost>> {
  const res = await fetch(`${API_BASE}/discussions/posts/${postId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  return res.json()
}

export async function deleteDiscussionPost(postId: string, userId: string, userRole: string): Promise<DiscussionApiResponse<null>> {
  const res = await fetch(`${API_BASE}/discussions/posts/${postId}?userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`, {
    method: 'DELETE',
  })
  return res.json()
}

// --- REPLIES ---
export async function createDiscussionReply(reply: Partial<DiscussionReply>): Promise<DiscussionApiResponse<DiscussionReply>> {
  const res = await fetch(`${API_BASE}/discussions/${reply.postId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reply),
  })
  return res.json()
}

export async function updateDiscussionReply(replyId: string, updates: Partial<DiscussionReply>): Promise<DiscussionApiResponse<DiscussionReply>> {
  const res = await fetch(`${API_BASE}/discussions/replies/${replyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  return res.json()
}

export async function deleteDiscussionReply(replyId: string, userId: string, userRole: string): Promise<DiscussionApiResponse<null>> {
  const res = await fetch(`${API_BASE}/discussions/replies/${replyId}?userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`, {
    method: 'DELETE',
  })
  return res.json()
}

// --- TAGS ---
export async function fetchDiscussionTags(courseId: string): Promise<DiscussionApiResponse<DiscussionTag[]>> {
  const res = await fetch(`${API_BASE}/discussions/${courseId}/tags`)
  return res.json()
}

export async function createDiscussionTag(courseId: string, name: string, createdById: string): Promise<DiscussionApiResponse<DiscussionTag>> {
  const res = await fetch(`${API_BASE}/discussions/${courseId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, createdById }),
  })
  return res.json()
}

export async function deleteDiscussionTag(tagId: string): Promise<DiscussionApiResponse<null>> {
  const res = await fetch(`${API_BASE}/discussions/tags/${tagId}`, {
    method: 'DELETE',
  })
  return res.json()
}

// --- COURSES (for sidebar) ---
export async function fetchDiscussionCourses(userId: string): Promise<DiscussionApiResponse<DiscussionCourse[]>> {
  const res = await fetch(`${API_BASE}/discussions/courses?userId=${userId}`)
  return res.json()
}

// --- FILE UPLOAD (for attachments) ---
export async function uploadDiscussionAttachment(file: File): Promise<DiscussionApiResponse<{ url: string }>> {
  // TODO: Implement file upload endpoint if needed
  return { success: true, data: { url: '' } }
} 