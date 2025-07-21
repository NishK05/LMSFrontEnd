'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@lms/ui'
import { Send, Bot, User, Trash2 } from 'lucide-react'

interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  courseId?: string
}

interface CourseOption {
  id: string
  title: string
}

interface ChatInterfaceProps {
  courseId?: string
}

export function ChatInterface({ courseId: initialCourseId }: ChatInterfaceProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(initialCourseId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const userId = session?.user?.id
  const userRole = session?.user?.role

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history on component mount
  useEffect(() => {
    if (userId) {
      loadChatHistory()
    }
  }, [userId])

  // Fetch enrolled courses for students
  useEffect(() => {
    if (userRole === 'STUDENT' && userId) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/enrollments?userId=${userId}`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch courses'))
        .then(data => {
          const courseList = (data.data || []).map((c: any) => ({ id: c.id, title: c.title }))
          setCourses(courseList)
          if (courseList.length > 0) {
            setSelectedCourseId(courseList[0].id)
          }
        })
        .catch(() => setCourses([]))
    }
  }, [userId, userRole])

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/history/${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setMessages(data.data.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })))
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  // Update: use selectedCourseId for sending messages
  const sendMessage = async () => {
    if (!inputMessage.trim() || !userId || isLoading) return
    const courseIdToSend = userRole === 'STUDENT' ? selectedCourseId : initialCourseId
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: inputMessage.trim(),
      role: 'user',
      timestamp: new Date(),
      courseId: courseIdToSend
    }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          courseId: courseIdToSend,
          userId
        }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const botMessage: ChatMessage = {
            id: `bot_${Date.now()}`,
            content: data.data.message,
            role: 'assistant',
            timestamp: new Date(),
            courseId: courseIdToSend
          }
          setMessages(prev => [...prev, botMessage])
        }
      } else {
        setError('Failed to send message')
      }
    } catch (error) {
      setError('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = async () => {
    if (!userId) return
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/history/${userId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to clear chat:', error)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full bg-white/80 rounded-2xl shadow-lg border border-purple-100">
      {/* Course Context Dropdown for Students */}
      {userRole === 'STUDENT' && courses.length > 0 && (
        <div className="p-4 border-b border-purple-100 bg-purple-50/50">
          <label htmlFor="course-context" className="block text-sm font-medium text-purple-700 mb-1">Course Context</label>
          <select
            id="course-context"
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
            className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-purple-900"
          >
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>
      )}
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">AI Learning Assistant</h3>
            <p className="text-sm text-purple-600">Ask me anything about your courses</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clearChat}
          className="text-purple-600 border-purple-200 hover:bg-purple-50"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Welcome!</h3>
            <p className="text-purple-600 max-w-md mx-auto">
              Ask me anything about your courses, assignments, or learning materials. 
              I'm here to help you succeed in your studies!
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 text-purple-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-purple-200' : 'text-purple-500'
                }`}
              >
                {formatTime(message.timestamp)}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-purple-600" />
            </div>
            <div className="bg-purple-50 text-purple-900 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-2">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-purple-100">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 