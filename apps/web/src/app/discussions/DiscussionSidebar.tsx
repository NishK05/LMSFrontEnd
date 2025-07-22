import React, { useEffect, useState } from 'react'
import { useDiscussionContext } from './DiscussionContext'
import { fetchDiscussionCourses, fetchDiscussionTags, createDiscussionTag } from './api'
import { useSession } from 'next-auth/react'

export function DiscussionSidebar() {
  const {
    courses,
    setCourses,
    setSelectedCourse,
    selectedCourse,
    tags,
    setTags,
    selectedTag,
    setSelectedTag,
    filter,
    setFilter,
    loading,
    setLoading,
  } = useDiscussionContext()
  const { data: session } = useSession()
  const userId = session?.user?.id
  const userRole = session?.user?.role
  const [showTagModal, setShowTagModal] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [tagError, setTagError] = useState('')

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetchDiscussionCourses(userId).then(res => {
      if (res.success && res.data) {
        setCourses(res.data)
        setSelectedCourse(res.data[0] || null)
      }
      setLoading(false)
    })
    // eslint-disable-next-line
  }, [userId])

  useEffect(() => {
    if (selectedCourse) {
      setLoading(true)
      fetchDiscussionTags(selectedCourse.id).then(res => {
        if (res.success && res.data) setTags(res.data)
        setLoading(false)
      })
    }
    // eslint-disable-next-line
  }, [selectedCourse])

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    setTagError('')
    if (!newTag.trim()) {
      setTagError('Tag name required')
      return
    }
    if (!selectedCourse || !userId) return
    const res = await createDiscussionTag(selectedCourse.id, newTag.trim(), userId)
    if (res.success && res.data) {
      setTags([...tags, res.data])
      setShowTagModal(false)
      setNewTag('')
    } else {
      setTagError(res.error || 'Failed to create tag')
    }
  }

  // Only allow teachers/admins/collaborators to create tags
  const canCreateTag = userRole === 'TEACHER' || userRole === 'ADMIN' || userRole === 'COLLABORATOR'

  return (
    <aside className="w-full md:w-64 bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-4 flex flex-col gap-6">
      {/* Course List */}
      <div>
        <div className="font-bold text-purple-900 mb-2">Courses</div>
        <ul className="space-y-1">
          {courses.map(course => (
            <li key={course.id}>
              <button
                className={`w-full text-left px-2 py-1 rounded hover:bg-purple-100 ${selectedCourse?.id === course.id ? 'bg-purple-200 font-semibold' : ''}`}
                onClick={() => setSelectedCourse(course)}
              >
                {course.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Tag/Category List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-purple-900">Tags/Categories</span>
          {selectedCourse && canCreateTag && (
            <button className="text-xs px-2 py-1 bg-purple-200 rounded hover:bg-purple-300" onClick={() => setShowTagModal(true)}>
              + New
            </button>
          )}
        </div>
        <ul className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <li key={tag.id}>
              <button
                className={`px-3 py-1 rounded-full text-xs ${selectedTag?.id === tag.id ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Tag Modal */}
      {showTagModal && canCreateTag && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-xl">
            <h2 className="text-lg font-bold mb-4">Create Tag/Category</h2>
            <form onSubmit={handleCreateTag} className="space-y-3">
              <input
                type="text"
                className="w-full border border-purple-200 rounded p-2"
                placeholder="Tag name"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                required
              />
              {tagError && <div className="text-red-600 text-xs">{tagError}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" className="px-3 py-1 bg-gray-200 rounded" onClick={() => setShowTagModal(false)}>Cancel</button>
                <button type="submit" className="px-3 py-1 bg-purple-600 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Filter Dropdown */}
      <div>
        <label className="block text-xs text-purple-700 mb-1">Filter</label>
        <select
          className="w-full px-2 py-1 rounded border border-purple-200"
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
        >
          <option value="ALL">All</option>
          <option value="UNREAD">Unread</option>
          <option value="NEW_REPLIES">New Replies</option>
          <option value="UNANSWERED">Unanswered</option>
          <option value="UNRESOLVED">Unresolved</option>
          <option value="ENDORSED">Endorsed</option>
          <option value="WATCHING">Watching</option>
          <option value="STARRED">Starred</option>
          <option value="PRIVATE">Private</option>
          <option value="PUBLIC">Public</option>
          <option value="STAFF">Staff</option>
          <option value="ME">Me</option>
        </select>
      </div>
    </aside>
  )
} 