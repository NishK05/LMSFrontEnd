import React, { createContext, useContext, useState, ReactNode } from 'react'
import {
  DiscussionCourse,
  DiscussionTag,
  DiscussionFilter,
  DiscussionPost,
} from './types'

interface DiscussionContextValue {
  courses: DiscussionCourse[]
  setCourses: (courses: DiscussionCourse[]) => void
  selectedCourse: DiscussionCourse | null
  setSelectedCourse: (course: DiscussionCourse | null) => void
  tags: DiscussionTag[]
  setTags: (tags: DiscussionTag[]) => void
  selectedTag: DiscussionTag | null
  setSelectedTag: (tag: DiscussionTag | null) => void
  filter: DiscussionFilter
  setFilter: (filter: DiscussionFilter) => void
  search: string
  setSearch: (search: string) => void
  posts: DiscussionPost[]
  setPosts: (posts: DiscussionPost[]) => void
  loading: boolean
  setLoading: (loading: boolean) => void
}

const DiscussionContext = createContext<DiscussionContextValue | undefined>(undefined)

export function DiscussionProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<DiscussionCourse[]>([])
  const [selectedCourse, setSelectedCourse] = useState<DiscussionCourse | null>(null)
  const [tags, setTags] = useState<DiscussionTag[]>([])
  const [selectedTag, setSelectedTag] = useState<DiscussionTag | null>(null)
  const [filter, setFilter] = useState<DiscussionFilter>('ALL')
  const [search, setSearch] = useState('')
  const [posts, setPosts] = useState<DiscussionPost[]>([])
  const [loading, setLoading] = useState(false)

  // Optionally, fetch courses/tags/posts here or in a useEffect in the main board component

  const value: DiscussionContextValue = {
    courses,
    setCourses,
    selectedCourse,
    setSelectedCourse,
    tags,
    setTags,
    selectedTag,
    setSelectedTag,
    filter,
    setFilter,
    search,
    setSearch,
    posts,
    setPosts,
    loading,
    setLoading,
  }

  return (
    <DiscussionContext.Provider value={value}>
      {children}
    </DiscussionContext.Provider>
  )
}

export function useDiscussionContext() {
  const ctx = useContext(DiscussionContext)
  if (!ctx) throw new Error('useDiscussionContext must be used within a DiscussionProvider')
  return ctx
} 