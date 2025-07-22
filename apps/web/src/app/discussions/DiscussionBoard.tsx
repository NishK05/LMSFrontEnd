import React, { useState } from 'react'
import { DiscussionProvider, useDiscussionContext } from './DiscussionContext'
import { DiscussionSidebar } from './DiscussionSidebar'
import { DiscussionThreadList } from './DiscussionThreadList'
import {
  fetchDiscussionPost,
  createDiscussionPost,
  createDiscussionReply,
  updateDiscussionPost,
  updateDiscussionReply,
  deleteDiscussionPost,
  deleteDiscussionReply,
  uploadDiscussionAttachment,
} from './api'
import { DiscussionPost, DiscussionReply, DiscussionUser } from './types'
import { useSession } from 'next-auth/react'

function flattenReplies(replies: DiscussionReply[]): DiscussionReply[] {
  // Flatten all replies into a single array, preserving order
  const result: DiscussionReply[] = []
  function walk(reply: DiscussionReply) {
    result.push(reply)
    if (reply.replies && reply.replies.length > 0) {
      reply.replies.forEach(walk)
    }
  }
  replies.forEach(walk)
  return result
}

function flattenRepliesWithDepth(replies: DiscussionReply[], depth = 1): Array<{ reply: DiscussionReply, depth: number }> {
  // Flatten replies into a list with depth info
  const result: Array<{ reply: DiscussionReply, depth: number }> = []
  function walk(reply: DiscussionReply, d: number) {
    result.push({ reply, depth: d })
    if (reply.replies && reply.replies.length > 0) {
      reply.replies.forEach(child => walk(child, d + 1))
    }
  }
  replies.forEach(r => walk(r, depth))
  return result
}

function DiscussionReplyFlatList({ replies, repliesById, onReply, onEdit, onDelete, session }: {
  replies: DiscussionReply[],
  repliesById: Record<string, DiscussionReply>,
  onReply: (parentReply: DiscussionReply) => void,
  onEdit: (reply: DiscussionReply) => void,
  onDelete: (reply: DiscussionReply) => void,
  session: any
}) {
  const flatReplies = flattenRepliesWithDepth(replies)
  return (
    <div>
      {flatReplies.map(({ reply, depth }) => {
        let indentPx = 0
        if (depth === 2) indentPx = 32
        else if (depth >= 3) indentPx = 64
        const parent = reply.parentReplyId ? repliesById[reply.parentReplyId] : undefined
        // Soft delete logic
        const isDeleted = reply.isDeleted
        const showAnonymous = isDeleted && reply.privacy === 'ANONYMOUS'
        const displayName = isDeleted ? (showAnonymous ? 'Anonymous' : 'Deleted User') : reply.author.name
        const displayBody = isDeleted ? 'This reply was deleted.' : reply.body
        const canEditDelete = !isDeleted && (session?.user?.id === reply.author.id || ['TEACHER', 'ADMIN'].includes(session?.user?.role))
        return (
          <div key={reply.id} className="pl-0 mb-2 border-l-2 border-purple-100" style={{ marginLeft: indentPx }}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-purple-900">{displayName}</span>
              {!isDeleted && ['TEACHER', 'ADMIN', 'COLLABORATOR'].includes(reply.author.role) && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{reply.author.role}</span>
              )}
              {reply.isEndorsed && !isDeleted && <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">Endorsed</span>}
              <span className="text-xs text-purple-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
            </div>
            {parent && (
              <div className="text-xs text-purple-500 mb-1">Replying to <span className="font-semibold">{parent.author.name}</span></div>
            )}
            <div className={`mb-1 ${isDeleted ? 'italic text-purple-400' : 'text-purple-800'}`}>{displayBody}</div>
            {!isDeleted && reply.attachmentUrl && (
              <a href={reply.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Attachment</a>
            )}
            <div className="flex gap-2 mt-1">
              {!isDeleted && <button className="text-xs text-purple-500 hover:underline" onClick={() => onReply(reply)}>Reply</button>}
              {canEditDelete && <button className="text-xs text-blue-500 hover:underline" onClick={() => onEdit(reply)}>Edit</button>}
              {canEditDelete && <button className="text-xs text-red-500 hover:underline" onClick={() => onDelete(reply)}>Delete</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DiscussionPostModal({ open, onClose, onSubmit, initial, isReply, parent }: {
  open: boolean,
  onClose: () => void,
  onSubmit: (data: any) => void,
  initial?: Partial<DiscussionPost | DiscussionReply>,
  isReply?: boolean,
  parent?: DiscussionPost | DiscussionReply
}) {
  const { tags, selectedCourse } = useDiscussionContext()
  const { data: session } = useSession()
  const [title, setTitle] = useState((initial as any)?.title || '')
  const [body, setBody] = useState(initial?.body || '')
  const [attachment, setAttachment] = useState<File | null>(null)
  // Determine parent post privacy for replies
  const parentPrivacy = isReply && parent && 'privacy' in parent ? parent.privacy : undefined
  const userRole = session?.user?.role
  // For replies to PRIVATE posts, force privacy to PRIVATE
  const [privacy, setPrivacy] = useState<"PUBLIC" | "PRIVATE" | "ANONYMOUS">(
    isReply && parentPrivacy === 'PRIVATE' ? 'PRIVATE' : ((initial as any)?.privacy || 'PUBLIC')
  )
  const [tagId, setTagId] = useState(tags[0]?.id || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    setTagId(tags[0]?.id || '')
  }, [tags])

  // If replying to a PRIVATE post, only allow teachers/admins
  const canReplyToPrivate = !isReply || parentPrivacy !== 'PRIVATE' || userRole === 'TEACHER' || userRole === 'ADMIN'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!canReplyToPrivate) {
      setError('Only teachers/admins can reply to private posts.')
      return
    }
    if (!isReply) {
      if (!tagId) {
        setError('Please select a tag/category.')
        return
      }
      if (!title.trim()) {
        setError('Please enter a title.')
        return
      }
    }
    setLoading(true)
    let attachmentUrl
    if (attachment) {
      const res = await uploadDiscussionAttachment(attachment)
      if (res.success && res.data) attachmentUrl = res.data.url
    }
    onSubmit({
      ...(isReply ? {} : { title: title.trim(), tagId }),
      body,
      privacy: isReply && parentPrivacy === 'PRIVATE' ? 'PRIVATE' : privacy,
      attachmentUrl,
      authorId: session?.user?.id,
      courseId: selectedCourse?.id,
      type: isReply ? undefined : 'POST',
    })
    setLoading(false)
    onClose()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
        <h2 className="text-lg font-bold mb-4">{isReply ? 'Reply' : 'New Post'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Only show title and tag for new posts, not replies */}
          {!isReply && (
            <div>
              <label className="block text-xs mb-1">Title</label>
              <input
                type="text"
                className="w-full border border-purple-200 rounded p-2"
                placeholder="Post title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
          )}
          <textarea
            className="w-full border border-purple-200 rounded p-2"
            rows={isReply ? 3 : 5}
            placeholder={isReply ? 'Write your reply...' : 'Write your post...'}
            value={body}
            onChange={e => setBody(e.target.value)}
            required
          />
          {/* Only show tag/category for new posts, not replies */}
          {!isReply && (
            <div>
              <label className="block text-xs mb-1">Tag/Category</label>
              <select
                className="w-full border border-purple-200 rounded p-2"
                value={tagId}
                onChange={e => setTagId(e.target.value)}
                required
              >
                <option value="">Select a tag/category</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs mb-1">Attachment (optional, max 5MB)</label>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.py,.txt,.csv" onChange={handleFileChange} />
          </div>
          <div>
            <label className="block text-xs mb-1">Privacy</label>
            {/* Privacy logic for replies */}
            {isReply && parentPrivacy === 'PRIVATE' ? (
              <input type="text" className="w-full border border-purple-200 rounded p-2 bg-gray-100" value="Private (staff/collab only)" disabled />
            ) : isReply ? (
              <select value={privacy} onChange={e => setPrivacy(e.target.value as any)} className="border border-purple-200 rounded px-2 py-1">
                <option value="PUBLIC">Regular</option>
                <option value="ANONYMOUS">Anonymous</option>
              </select>
            ) : (
              <select value={privacy} onChange={e => setPrivacy(e.target.value as any)} className="border border-purple-200 rounded px-2 py-1">
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private (staff/collab only)</option>
                <option value="ANONYMOUS">Anonymous</option>
              </select>
            )}
          </div>
          {error && <div className="text-red-600 text-xs">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded" disabled={loading}>{loading ? 'Posting...' : isReply ? 'Reply' : 'Post'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DiscussionThreadPanel({ post, onBack }: { post: DiscussionPost, onBack: () => void }) {
  const { data: session } = useSession()
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyParent, setReplyParent] = useState<DiscussionReply | null>(null)
  const [editReply, setEditReply] = useState<DiscussionReply | null>(null)
  const [replies, setReplies] = useState(post.replies)
  const [loading, setLoading] = useState(false)

  // Build a flat map of all replies by id for easy lookup
  const repliesById: Record<string, DiscussionReply> = {}
  function buildReplyMap(replies: DiscussionReply[]) {
    for (const r of replies) {
      repliesById[r.id] = r
      if (r.replies && r.replies.length > 0) {
        buildReplyMap(r.replies)
      }
    }
  }
  buildReplyMap(replies)

  // Always fetch latest post (and replies) when opening or after posting a reply
  const refreshReplies = async () => {
    setLoading(true)
    const res = await fetchDiscussionPost(post.id)
    if (res.success && res.data) {
      setReplies(res.data.replies)
    }
    setLoading(false)
  }

  React.useEffect(() => {
    refreshReplies()
    // eslint-disable-next-line
  }, [post.id])

  const handleReply = (parent?: DiscussionReply) => {
    setReplyParent(parent || null)
    setEditReply(null)
    setShowReplyModal(true)
  }

  const handleEditReply = (reply: DiscussionReply) => {
    setEditReply(reply)
    setReplyParent(null)
    setShowReplyModal(true)
  }

  const handleDeleteReply = async (reply: DiscussionReply) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return
    await deleteDiscussionReply(String(reply.id), session?.user?.id || '', session?.user?.role || '')
    await refreshReplies()
  }

  const handleReplySubmit = async (data: any) => {
    if (editReply) {
      // Update reply
      await updateDiscussionReply(editReply.id, {
        body: data.body,
        privacy: data.privacy,
        attachmentUrl: data.attachmentUrl,
      })
    } else {
      // Persist reply in the backend
      await createDiscussionReply({
        postId: post.id,
        parentReplyId: replyParent?.id || null,
        authorId: data.authorId,
        body: data.body,
        privacy: data.privacy,
        attachmentUrl: data.attachmentUrl,
      })
    }
    setShowReplyModal(false)
    setReplyParent(null)
    setEditReply(null)
    await refreshReplies()
  }

  // Post edit/delete permissions
  const isDeleted = post.isDeleted
  const showAnonymous = isDeleted && post.privacy === 'ANONYMOUS'
  const displayName = isDeleted ? (showAnonymous ? 'Anonymous' : 'Deleted User') : post.author.name
  const displayBody = isDeleted ? 'This post was deleted.' : post.body
  const canEditDeletePost = !isDeleted && (((session?.user?.id ?? '') === (post.author.id ?? '')) || ['TEACHER', 'ADMIN'].includes(session?.user?.role))

  const handleEditPost = () => {
    setEditReply(null)
    setReplyParent(null)
    setShowReplyModal(true)
  }

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return
    await deleteDiscussionPost(post.id, session?.user?.id || '', session?.user?.role || '')
    onBack()
  }

  return (
    <div className="flex-1 flex flex-col gap-4">
      <button className="text-purple-500 hover:underline mb-2" onClick={onBack}>&larr; Back to Threads</button>
      <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-purple-900 text-xl">{post.title}</span>
          {post.isPinned && <span className="ml-2 text-yellow-500">📌</span>}
          {post.isResolved && <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">Resolved</span>}
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-purple-800">{displayName}</span>
          {!isDeleted && ['TEACHER', 'ADMIN', 'COLLABORATOR'].includes(post.author.role) && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{post.author.role}</span>
          )}
          <span className="text-xs text-purple-400">{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
        <div className={`mb-2 ${isDeleted ? 'italic text-purple-400' : 'text-purple-800'}`}>{displayBody}</div>
        {!isDeleted && post.attachmentUrl && (
          <a href={post.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Attachment</a>
        )}
        <div className="flex gap-2 mt-2">
          {!isDeleted && <button className="text-xs text-purple-500 hover:underline" onClick={() => handleReply()}>Reply</button>}
          {canEditDeletePost && <button className="text-xs text-blue-500 hover:underline" onClick={handleEditPost}>Edit</button>}
          {canEditDeletePost && <button className="text-xs text-red-500 hover:underline" onClick={handleDeletePost}>Delete</button>}
          {/* TODO: Pin, Resolve, Endorse, Delete, etc. */}
        </div>
      </div>
      <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-4">
        <div className="font-bold text-purple-900 mb-2">Replies</div>
        {loading ? (
          <div className="text-purple-400">Loading replies...</div>
        ) : replies.length === 0 ? (
          <div className="text-purple-400">No replies yet.</div>
        ) : (
          <div className="space-y-4">
            <DiscussionReplyFlatList
              replies={replies}
              repliesById={repliesById}
              onReply={handleReply}
              onEdit={handleEditReply}
              onDelete={handleDeleteReply}
              session={session}
            />
          </div>
        )}
      </div>
      <DiscussionPostModal open={showReplyModal} onClose={() => { setShowReplyModal(false); setEditReply(null); setReplyParent(null) }} onSubmit={handleReplySubmit} isReply={!!(replyParent || editReply)} parent={replyParent || editReply || undefined} initial={editReply || undefined} />
    </div>
  )
}

export function DiscussionBoard() {
  const [selectedPost, setSelectedPost] = useState<DiscussionPost | null>(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const { posts, setPosts, selectedCourse, tags } = useDiscussionContext()
  const { data: session } = useSession()
  const [postError, setPostError] = useState('')

  const handleThreadClick = async (post: DiscussionPost) => {
    // Optionally fetch full post with replies
    setSelectedPost(post)
  }

  const handleNewPost = () => {
    setShowPostModal(true)
  }

  const handlePostSubmit = async (data: any) => {
    setPostError('')
    if (!selectedCourse || !data.tagId) {
      setPostError('Please select a course and tag.')
      return
    }
    const res = await createDiscussionPost({
      ...data,
      courseId: selectedCourse.id,
      authorId: session?.user?.id,
      type: 'POST',
      title: data.title || 'Untitled',
    })
    if (res.success && res.data) {
      setPosts([res.data, ...posts])
    } else {
      setPostError(res.error || 'Failed to create post')
    }
    setShowPostModal(false)
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-64">
        <DiscussionSidebar />
      </div>
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-purple-900">Discussion Board</h1>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg" onClick={handleNewPost}>New Post</button>
        </div>
        {!selectedPost ? (
          <div>
            <DiscussionThreadList onThreadDoubleClick={handleThreadClick} />
          </div>
        ) : (
          <DiscussionThreadPanel post={selectedPost} onBack={() => setSelectedPost(null)} />
        )}
        <DiscussionPostModal open={showPostModal} onClose={() => setShowPostModal(false)} onSubmit={handlePostSubmit} />
      </div>
    </div>
  )
}

// Wrap with provider for use in /app/discussions/page.tsx
export default function DiscussionBoardWithProvider() {
  return (
    <DiscussionProvider>
      <DiscussionBoard />
    </DiscussionProvider>
  )
} 