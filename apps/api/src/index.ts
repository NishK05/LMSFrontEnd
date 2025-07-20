import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

import { errorHandler } from './middleware/errorHandler'
import authRoutes from './routes/auth'
import courseRoutes from './routes/courses'
import lessonRoutes from './routes/lessons'
import userRoutes from './routes/users'
import filesRoutes from './routes/files'
import chatRoutes from './routes/chat'

dotenv.config()

const app: Express = express()
const PORT = process.env.PORT || 3001

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(limiter)
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/users', userRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/chat', chatRoutes)

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Re-ingest all files on startup
async function reingestFilesOnStartup() {
  try {
    console.log('🔄 Checking for files to re-ingest on startup...')
    const { PrismaClient } = require('@prisma/client')
    const fs = require('fs')
    const path = require('path')
    const FormData = require('form-data')
    const fetch = require('node-fetch')
    
    const prisma = new PrismaClient()
    const UPLOADS_DIR = path.join(__dirname, '../uploads')
    
    const files = await prisma.file.findMany({
      include: { courses: true }
    })
    
    if (files.length === 0) {
      console.log('📁 No files found in database to re-ingest')
      return
    }
    
    console.log(`📁 Found ${files.length} files, checking if they need re-ingestion...`)
    
    // Group files by course
    const courseFiles = new Map()
    for (const file of files) {
      for (const course of file.courses) {
        if (!courseFiles.has(course.id)) {
          courseFiles.set(course.id, [])
        }
        courseFiles.get(course.id).push(file)
      }
    }
    
    // Check if Qdrant has collections for these courses
    for (const [courseId, filesForCourse] of courseFiles) {
      try {
        const response = await fetch(`http://localhost:8000/check-collection/${courseId}`)
        if (!response.ok) {
          console.log(`📤 Re-ingesting files for course ${courseId}...`)
          for (const file of filesForCourse) {
            const filePath = path.join(UPLOADS_DIR, file.path, file.filename)
            if (fs.existsSync(filePath)) {
              const form = new FormData()
              form.append('class_id', courseId)
              form.append('document_id', file.id)
              form.append('files', fs.createReadStream(filePath), { filename: file.filename })
              
              await fetch('http://localhost:8000/ingest', {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
              })
              console.log(`   ✅ Re-ingested: ${file.filename}`)
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(`⚠️  Could not check collection for course ${courseId}: ${errorMessage}`)
      }
    }
    
    await prisma.$disconnect()
    console.log('✅ Startup re-ingestion check complete')
  } catch (error) {
    console.error('❌ Error during startup re-ingestion:', error)
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  
  // Run re-ingestion check after server starts
  setTimeout(reingestFilesOnStartup, 2000) // Wait 2 seconds for Python service to be ready
})

export default app 