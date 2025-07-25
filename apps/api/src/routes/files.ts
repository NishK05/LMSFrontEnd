import { Router, Request, Response } from 'express'
import multer, { StorageEngine } from 'multer'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'
// Use require for node-fetch v2 compatibility
const fetch = require('node-fetch')
const FormData = require('form-data')

const router: Router = Router()
const prisma = new PrismaClient()
const UPLOADS_DIR = path.join(__dirname, '../../uploads')

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

// Set up multer storage
const storage: StorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR)
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  },
})
const upload = multer({ storage })

// Helper: Remove file from disk
function removeFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    // Ignore
  }
}

// Helper: Remove folder recursively
function removeFolder(folderPath: string) {
  try {
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true })
    }
  } catch (err) {
    // Ignore
  }
}

// Upload files/folders (multi-class support, overwrite, folder hierarchy)
router.post('/upload', upload.any(), async (req: Request, res: Response) => {
  try {
    // Expect: req.body.classIds (comma-separated), req.body.folderPath (optional for folders)
    // req.files: array of files (multer)
    const { classIds, folderPath, protect, assignmentId } = req.body
    const classIdArr = classIds ? classIds.split(',') : []
    const userId = req.body.userId || 'unknown' // In real app, get from session/JWT
    if (!req.files || classIdArr.length === 0) {
      return res.status(400).json({ success: false, error: 'Files and classIds are required' })
    }
    const files = req.files as Express.Multer.File[]
    const results = []
    for (const file of files) {
      // Overwrite logic: for each class, if file with same name exists in same folder, remove old file and metadata
      for (const courseId of classIdArr) {
        const existing = await prisma.file.findFirst({
          where: {
            filename: file.originalname,
            courses: { some: { id: courseId } },
            path: folderPath || '',
          },
          include: { courses: true },
        })
        if (existing) {
          // Remove file from disk if not referenced by other courses
          if (existing.courses.length === 1) {
            removeFile(path.join(UPLOADS_DIR, existing.path, existing.filename))
          }
          // Remove metadata
          await prisma.file.delete({ where: { id: existing.id } })
        }
      }
      // Save file metadata (one record, connect to all selected courses)
      const relPath = folderPath ? folderPath.replace(/^\/+/g, '').replace(/\/+$/g, '') : ''
      const filePath = relPath ? path.join(relPath, file.originalname) : file.originalname
      const absFilePath = path.join(UPLOADS_DIR, filePath)
      let protectedFilePath: string | null = null
      // If protect is true and PDF, run dual_trojan.py to create protected version
      if ((protect === 'true' || protect === true) && file.mimetype === 'application/pdf') {
        const protectedName = file.originalname.replace(/\.pdf$/i, '-protected.pdf')
        protectedFilePath = relPath ? path.join(relPath, protectedName) : protectedName
        const absProtectedPath = path.join(UPLOADS_DIR, protectedFilePath)
        // Call dual_trojan.py
        const { spawnSync } = require('child_process')
        const scriptPath = path.join(__dirname, '../../dual_trojan.py')
        const result = spawnSync('python3', [scriptPath, absFilePath, absProtectedPath], { encoding: 'utf-8' })
        console.log('dual_trojan.py stdout:', result.stdout)
        console.log('dual_trojan.py stderr:', result.stderr)
        if (result.error || result.status !== 0) {
          console.error('Watermarking failed:', result.error || result.stderr)
          protectedFilePath = null
        }
      }
      // Create or connect folder metadata
      let folder = null
      if (relPath) {
        folder = await prisma.folder.upsert({
          where: { path: relPath },
          update: {},
          create: {
            name: relPath.split('/').pop() || relPath,
            path: relPath,
          },
        })
      }
      // Create file metadata
      const fileCreateData: any = {
        filename: file.originalname,
        path: relPath,
        size: file.size,
        mimetype: file.mimetype,
        uploadedBy: userId,
        folderId: folder ? folder.id : undefined,
        protect: protect === 'true' || protect === true ? true : false,
        originalPath: filePath,
        protectedPath: protectedFilePath || undefined,
        courses: {
          connect: classIdArr.map((id: string) => ({ id })),
        },
      }
      if (assignmentId) fileCreateData.assignmentId = assignmentId
      const fileMeta = await prisma.file.create({ data: fileCreateData })
      results.push(fileMeta)
      // --- Trigger Python microservice ingest ---
      try {
        const ingestUrl = process.env.CLASSGPT_INGEST_URL || 'http://localhost:8000/ingest'
        const fileFullPath = path.join(UPLOADS_DIR, relPath, file.originalname)
        const form = new FormData()
        form.append('class_id', classIdArr[0])
        form.append('document_id', fileMeta.id)
        form.append('files', fs.createReadStream(fileFullPath), { filename: fileMeta.filename })
        await fetch(ingestUrl, {
          method: 'POST',
          body: form,
          headers: form.getHeaders(),
        })
      } catch (err) {
        console.error('Failed to trigger Python ingest for file:', file.originalname, err)
      }
      // --- End Python microservice ingest ---
    }
    res.json({ success: true, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to upload files' })
  }
})

// List files/folders for a course (including shared)
router.get('/course/:courseId', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params
    // List all folders and files for this course (including shared)
    const folders = await prisma.folder.findMany({
      where: {
        courses: { some: { id: courseId } },
      },
      include: {
        files: {
          where: { courses: { some: { id: courseId } } },
        },
      },
    })
    const files = await prisma.file.findMany({
      where: {
        courses: { some: { id: courseId } },
        folderId: null,
      },
      select: {
        id: true,
        filename: true,
        path: true,
        size: true,
        mimetype: true,
        uploadedBy: true,
        uploadedAt: true,
        protect: true,
        assignmentId: true, // include assignmentId for frontend tagging
      } as any, // allow 'protect' and 'assignmentId' field
    })
    res.json({ success: true, data: { folders, files } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list files/folders' })
  }
})

// Move file/folder
router.post('/move', async (req: Request, res: Response) => {
  try {
    // Expect: id, newFolderPath
    const { id, newFolderPath, type } = req.body
    if (!id || !newFolderPath) return res.status(400).json({ success: false, error: 'id and newFolderPath required' })
    if (type === 'file') {
      const file = await prisma.file.findUnique({ where: { id } })
      if (!file) return res.status(404).json({ success: false, error: 'File not found' })
      const oldPath = path.join(UPLOADS_DIR, file.path, file.filename)
      const newDir = path.join(UPLOADS_DIR, newFolderPath)
      if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true })
      fs.renameSync(oldPath, path.join(newDir, file.filename))
      // Update metadata
      await prisma.file.update({ where: { id }, data: { path: newFolderPath } })
      res.json({ success: true })
    } else if (type === 'folder') {
      const folder = await prisma.folder.findUnique({ where: { id } })
      if (!folder) return res.status(404).json({ success: false, error: 'Folder not found' })
      const oldPath = path.join(UPLOADS_DIR, folder.path)
      const newPath = path.join(UPLOADS_DIR, newFolderPath)
      fs.renameSync(oldPath, newPath)
      // Update metadata
      await prisma.folder.update({ where: { id }, data: { path: newFolderPath, name: newFolderPath.split('/').pop() || newFolderPath } })
      res.json({ success: true })
    } else {
      res.status(400).json({ success: false, error: 'Invalid type' })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to move file/folder' })
  }
})

// Rename file/folder
router.post('/rename', async (req: Request, res: Response) => {
  try {
    // Expect: id, newName, type
    const { id, newName, type } = req.body
    if (!id || !newName) return res.status(400).json({ success: false, error: 'id and newName required' })
    if (type === 'file') {
      const file = await prisma.file.findUnique({ where: { id } })
      if (!file) return res.status(404).json({ success: false, error: 'File not found' })
      const oldPath = path.join(UPLOADS_DIR, file.path, file.filename)
      const newPath = path.join(UPLOADS_DIR, file.path, newName)
      fs.renameSync(oldPath, newPath)
      await prisma.file.update({ where: { id }, data: { filename: newName } })
      res.json({ success: true })
    } else if (type === 'folder') {
      const folder = await prisma.folder.findUnique({ where: { id } })
      if (!folder) return res.status(404).json({ success: false, error: 'Folder not found' })
      const oldPath = path.join(UPLOADS_DIR, folder.path)
      const newPath = path.join(UPLOADS_DIR, folder.path.split('/').slice(0, -1).concat(newName).join('/'))
      fs.renameSync(oldPath, newPath)
      await prisma.folder.update({ where: { id }, data: { path: newPath.replace(UPLOADS_DIR + '/', ''), name: newName } })
      res.json({ success: true })
    } else {
      res.status(400).json({ success: false, error: 'Invalid type' })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to rename file/folder' })
  }
})

// Delete file/folder
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Expect: id, type (file/folder) in query
    const { type } = req.query
    const { id } = req.params
    if (type === 'file') {
      const file = await prisma.file.findUnique({
        where: { id },
        include: { courses: true },
      })
      if (!file) return res.status(404).json({ success: false, error: 'File not found' })
      // Remove original file
      removeFile(path.join(UPLOADS_DIR, file.path, file.filename))
      // Remove protected file if it exists
      if (file.protectedPath) {
        removeFile(path.join(UPLOADS_DIR, file.protectedPath))
      }
      await prisma.file.delete({ where: { id } })
      // --- Trigger Python microservice delete-file-chunks ---
      try {
        // Get all course IDs this file belonged to
        const courseIds = file.courses?.map((c: any) => c.id) || []
        const deleteUrl = process.env.CLASSGPT_DELETE_CHUNKS_URL || 'http://localhost:8000/delete-file-chunks'
        for (const classId of courseIds) {
          const resp = await fetch(deleteUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ class_id: classId, filename: file.filename })
          })
          const text = await resp.text()
          console.log(`[DELETE] Qdrant response for class ${classId}, file ${file.filename}:`, text)
        }
      } catch (err) {
        console.error('Failed to trigger Python delete-file-chunks for file:', file.filename, err)
      }
      // --- End Python microservice delete-file-chunks ---
      res.json({ success: true })
    } else if (type === 'folder') {
      const folder = await prisma.folder.findUnique({ where: { id } })
      if (!folder) return res.status(404).json({ success: false, error: 'Folder not found' })
      removeFolder(path.join(UPLOADS_DIR, folder.path))
      await prisma.folder.delete({ where: { id } })
      res.json({ success: true })
    } else {
      res.status(400).json({ success: false, error: 'Invalid type' })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete file/folder' })
  }
})

// Download/view file
router.get('/download/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userRole = (req.query.userRole || '').toString().toUpperCase()
    const file = await prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        path: true,
        size: true,
        mimetype: true,
        uploadedBy: true,
        uploadedAt: true,
        folderId: true,
        protectedPath: true,
        originalPath: true,
      } as any,
    })
    if (!file) return res.status(404).json({ success: false, error: 'File not found' })
    let filePath = path.join(UPLOADS_DIR, file.path, file.filename)
    // Serve protected version for students if it exists
    if (userRole === 'STUDENT' && file.protectedPath) {
      filePath = path.join(UPLOADS_DIR, file.protectedPath)
      if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Protected file not found on disk' })
      return res.download(filePath, file.filename.replace(/\.pdf$/i, '-protected.pdf'))
    }
    // Otherwise serve original
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'File not found on disk' })
    res.download(filePath, file.filename)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to download file' })
  }
})

// Preview file (inline)
router.get('/preview/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userRole = (req.query.userRole || '').toString().toUpperCase()
    const file = await prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        path: true,
        size: true,
        mimetype: true,
        uploadedBy: true,
        uploadedAt: true,
        folderId: true,
        protectedPath: true,
        originalPath: true,
      } as any,
    })
    if (!file) return res.status(404).json({ success: false, error: 'File not found' })
    let filePath = path.join(UPLOADS_DIR, file.path, file.filename)
    // Serve protected version for students if it exists
    if (userRole === 'STUDENT' && file.protectedPath) {
      filePath = path.join(UPLOADS_DIR, file.protectedPath)
      if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Protected file not found on disk' })
      res.setHeader('Content-Type', file.mimetype)
      res.setHeader('Content-Disposition', 'inline; filename="' + file.filename.replace(/\.pdf$/i, '-protected.pdf') + '"')
      // Allow embedding in iframe from localhost:3000
      res.setHeader('X-Frame-Options', 'ALLOW-FROM http://localhost:3000')
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://localhost:3000")
      fs.createReadStream(filePath).pipe(res)
      return
    }
    // Otherwise serve original
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'File not found on disk' })
    res.setHeader('Content-Type', file.mimetype)
    res.setHeader('Content-Disposition', 'inline; filename="' + file.filename + '"')
    // Allow embedding in iframe from localhost:3000
    res.setHeader('X-Frame-Options', 'ALLOW-FROM http://localhost:3000')
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://localhost:3000")
    fs.createReadStream(filePath).pipe(res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to preview file' })
  }
})

export default router 