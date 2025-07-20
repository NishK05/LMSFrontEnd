const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
const fetch = require('node-fetch')

const prisma = new PrismaClient()
const UPLOADS_DIR = path.join(__dirname, 'uploads')

async function reingestAllFiles() {
  console.log('🔄 Starting re-ingestion of all files from database...')
  
  try {
    // Get all files with their course associations
    const files = await prisma.file.findMany({
      include: {
        courses: true
      }
    })
    
    console.log(`📁 Found ${files.length} files in database`)
    
    if (files.length === 0) {
      console.log('❌ No files found in database')
      return
    }
    
    // Group files by course for ingestion
    const courseFiles = new Map()
    
    for (const file of files) {
      for (const course of file.courses) {
        if (!courseFiles.has(course.id)) {
          courseFiles.set(course.id, [])
        }
        courseFiles.get(course.id).push(file)
      }
    }
    
    console.log(`📚 Files grouped by ${courseFiles.size} courses`)
    
    // Ingest files for each course
    for (const [courseId, filesForCourse] of courseFiles) {
      console.log(`\n🎯 Processing course: ${courseId}`)
      console.log(`   Files: ${filesForCourse.map(f => f.filename).join(', ')}`)
      
      for (const file of filesForCourse) {
        try {
          const filePath = path.join(UPLOADS_DIR, file.path, file.filename)
          
          if (!fs.existsSync(filePath)) {
            console.log(`   ⚠️  File not found on disk: ${filePath}`)
            continue
          }
          
          console.log(`   📤 Ingesting: ${file.filename}`)
          
          // Create form data for ingestion
          const form = new FormData()
          form.append('class_id', courseId)
          form.append('document_id', file.id)
          form.append('files', fs.createReadStream(filePath), { filename: file.filename })
          
          // Call Python ingestion endpoint
          const response = await fetch('http://localhost:8000/ingest', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
          })
          
          if (response.ok) {
            const result = await response.json()
            console.log(`   ✅ Success: ${result.message}`)
          } else {
            const errorText = await response.text()
            console.log(`   ❌ Failed: ${response.status} - ${errorText}`)
          }
          
        } catch (error) {
          console.log(`   ❌ Error ingesting ${file.filename}: ${error.message}`)
        }
      }
    }
    
    console.log('\n🎉 Re-ingestion complete!')
    
  } catch (error) {
    console.error('❌ Error during re-ingestion:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the re-ingestion
reingestAllFiles() 