import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { createError } from '../middleware/errorHandler'

// Chat types (defined locally to avoid import issues)
interface ChatRequest {
  message: string
  courseId?: string
  userId: string
}

interface ChatResponse {
  success: boolean
  data?: {
    message: string
    sources?: string[]
  }
  error?: string
}

const router: Router = Router()

// In-memory chat sessions (in production, this would be stored in a database)
const chatSessions = new Map<string, any[]>()

// ClassGPT service URL
const CLASSGPT_URL = process.env.CLASSGPT_URL || 'http://localhost:8000'

// Get chat history for a user
router.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const messages = chatSessions.get(userId) || []
    
    res.json({
      success: true,
      data: messages
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history'
    })
  }
})

// Send a message
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message, courseId, userId }: ChatRequest = req.body

    if (!message || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Message and userId are required'
      })
    }

    // Get or create chat session
    if (!chatSessions.has(userId)) {
      chatSessions.set(userId, [])
    }
    const session = chatSessions.get(userId)!

    // Add user message
    const userMessage = {
      id: `user_${Date.now()}`,
      content: message,
      role: 'user' as const,
      timestamp: new Date(),
      courseId
    }
    session.push(userMessage)

    // Generate bot response using ClassGPT service
    let botResponse = "I'm here to help you with your studies! Ask me anything about your courses, assignments, or learning materials."
    let sources: string[] = []
    
    try {
      // If courseId is provided, use ClassGPT service for course-specific responses
      if (courseId) {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          include: {
            lessons: true,
            instructor: true
          }
        })
        
        if (course) {
          // Try to use ClassGPT service
          try {
            const classgptResponse = await fetch(`${CLASSGPT_URL}/ask`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                class_id: courseId,
                question: message
              }),
            })
            
                         if (classgptResponse.ok) {
               const classgptData = await classgptResponse.json() as { answer?: string; sources?: string[] }
               botResponse = classgptData.answer || botResponse
               sources = classgptData.sources || []
             } else {
              console.error('ClassGPT service error:', await classgptResponse.text())
              // Fallback to course-specific response
              botResponse = `I can help you with "${course.title}"! This course has ${course.lessons.length} lessons and is taught by ${course.instructor.name}. What would you like to know about this course?`
            }
                     } catch (classgptError) {
             console.error('ClassGPT service unavailable:', classgptError)
             // Provide a more intelligent fallback response based on the question
             const question = message.toLowerCase()
             if (question.includes('what') || question.includes('explain') || question.includes('tell me')) {
               botResponse = `I can help you with "${course.title}"! This course has ${course.lessons.length} lessons and is taught by ${course.instructor.name}. 

To get detailed answers about course content, I need to connect to the AI service. For now, you can:
- Ask about specific lessons in this course
- Request study tips for this subject
- Ask about course structure and requirements

What specific aspect of ${course.title} would you like to know more about?`
             } else {
               botResponse = `I can help you with "${course.title}"! This course has ${course.lessons.length} lessons and is taught by ${course.instructor.name}. What would you like to know about this course?`
             }
           }
        }
      } else {
        // For general questions, provide a helpful response
        botResponse = "I'm here to help you with your studies! To get the most relevant answers, please ask questions about specific courses you're enrolled in. You can also ask about general study tips, time management, or learning strategies."
      }
    } catch (error) {
      console.error('Error generating response:', error)
      botResponse = "I'm having trouble processing your request right now. Please try again in a moment."
    }

    // Add bot response
    const botMessage = {
      id: `bot_${Date.now()}`,
      content: botResponse,
      role: 'assistant' as const,
      timestamp: new Date(),
      courseId
    }
    session.push(botMessage)

    // Keep only last 50 messages to prevent memory issues
    if (session.length > 50) {
      session.splice(0, session.length - 50)
    }

    const response: ChatResponse = {
      success: true,
      data: {
        message: botResponse,
        sources: sources.length > 0 ? sources : undefined
      }
    }

    res.json(response)
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process message'
    })
  }
})

// Clear chat history for a user
router.delete('/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    chatSessions.delete(userId)
    
    res.json({
      success: true,
      message: 'Chat history cleared'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear chat history'
    })
  }
})

export default router 