import React, { useEffect, useState } from 'react'
import { useDiscussionContext } from './DiscussionContext'
import { fetchDiscussionPosts } from './api'

export function DiscussionThreadList({ onThreadDoubleClick }: { onThreadDoubleClick?: (post: any) => void }) {
  const {
    selectedCourse,
    selectedTag,
    filter,
    search,
    setSearch,
    posts,
    setPosts,
    loading,
    setLoading,
  } = useDiscussionContext()
  const [localSearch, setLocalSearch] = useState('')

  useEffect(() => {
    if (selectedCourse) {
      setLoading(true)
      fetchDiscussionPosts(selectedCourse.id, filter, search).then(res => {
        if (res.success && res.data) setPosts(res.data)
        setLoading(false)
      })
    }
    // eslint-disable-next-line
  }, [selectedCourse, filter, search])

  return (
    <section className="flex-1 flex flex-col gap-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          className="flex-1 px-3 py-2 border border-purple-200 rounded-lg"
          placeholder="Search posts..."
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') setSearch(localSearch)
          }}
        />
        <button
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          onClick={() => setSearch(localSearch)}
        >
          Search
        </button>
      </div>
      {/* Thread List */}
      <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-4">
        {loading ? (
          <div className="text-purple-400">Loading threads...</div>
        ) : posts.length === 0 ? (
          <div className="text-purple-400">No threads found.</div>
        ) : (
          <ul className="divide-y divide-purple-50">
            {posts.map(post => (
              <li
                key={post.id}
                className="py-3 flex items-center gap-4 cursor-pointer hover:bg-purple-50 rounded-lg px-2"
                onDoubleClick={() => onThreadDoubleClick && onThreadDoubleClick(post)}
              >
                {/* Tag */}
                <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">{post.tag.name}</span>
                {/* Title */}
                <span className="font-semibold text-purple-900 flex-1">{post.title}</span>
                {/* Author + Badge */}
                <span className="text-xs text-purple-600 flex items-center gap-1">
                  {post.author.name}
                  {['TEACHER', 'ADMIN', 'COLLABORATOR'].includes(post.author.role) && (
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{post.author.role}</span>
                  )}
                </span>
                {/* Date */}
                <span className="text-xs text-purple-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                {/* Comment Count */}
                <span className="text-xs text-purple-500">{post.replies.length} comments</span>
                {/* Pin */}
                {post.isPinned && <span className="ml-2 text-yellow-500">📌</span>}
                {/* Unread (stub) */}
                {/* TODO: Add unread logic */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
} 