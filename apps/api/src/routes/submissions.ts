import { Router, Request, Response } from 'express'
import multer from 'multer'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const router: Router = Router({ mergeParams: true })
const prisma = new PrismaClient()
const UPLOADS_DIR = path.join(__dirname, '../../uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR)
  },
  filename: (req, file, cb) => {
    const { assignmentId } = req.params
    const studentId = req.body.userId || 'unknown'
    const timestamp = Date.now()
    cb(null, `${assignmentId}-${studentId}-${timestamp}-${file.originalname}`)
  },
})
const upload = multer({ storage })

async function isStudentEnrolled(studentId: string, assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true },
  })
  if (!assignment) return false
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: studentId, courseId: assignment.courseId },
  })
  return !!enrollment
}

// POST /api/assignments/:assignmentId/submissions
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params
    const studentId = req.body.userId
    if (!studentId) return res.status(400).json({ success: false, error: 'Missing userId' })
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' })
    const enrolled = await isStudentEnrolled(studentId, assignmentId)
    if (!enrolled) return res.status(403).json({ success: false, error: 'Not enrolled in course' })
    const fileMeta = await prisma.file.create({
      data: {
        filename: req.file.filename,
        path: '',
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedBy: studentId,
        assignmentId: assignmentId, // assignmentId is a valid field
      },
    })
    const maxOrder = await prisma.submission.aggregate({
      where: { assignmentId, studentId },
      _max: { order: true },
    })
    const nextOrder = (maxOrder._max.order || 0) + 1
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } })
    let status = 'ON_TIME'
    if (assignment && assignment.dueDate && new Date() > assignment.dueDate) {
      status = 'LATE'
    }
    const submission = await prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        fileId: fileMeta.id,
        order: nextOrder,
        status,
      },
      include: { file: true },
    })
    res.json({ success: true, data: submission })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to submit assignment' })
  }
})

// GET /api/assignments/:assignmentId/submissions/self (latest)
router.get('/self', async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params
    const studentId = req.query.userId as string
    if (!studentId) return res.status(400).json({ success: false, error: 'Missing userId' })
    const enrolled = await isStudentEnrolled(studentId, assignmentId)
    if (!enrolled) return res.status(403).json({ success: false, error: 'Not enrolled in course' })
    const submission = await prisma.submission.findFirst({
      where: { assignmentId, studentId },
      orderBy: { createdAt: 'desc' },
      include: { file: true },
    })
    if (!submission) return res.json({ success: true, data: null })
    res.json({ success: true, data: submission })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch submission' })
  }
})

// GET /api/assignments/:assignmentId/submissions/history/self (all)
router.get('/history/self', async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params
    const studentId = req.query.userId as string
    if (!studentId) return res.status(400).json({ success: false, error: 'Missing userId' })
    const enrolled = await isStudentEnrolled(studentId, assignmentId)
    if (!enrolled) return res.status(403).json({ success: false, error: 'Not enrolled in course' })
    const submissions = await prisma.submission.findMany({
      where: { assignmentId, studentId },
      orderBy: { order: 'desc' },
      include: { file: true },
    })
    res.json({ success: true, data: submissions })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' })
  }
})

// GET /api/assignments/:assignmentId/submissions (teacher: all for assignment)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params
    // TODO: Add teacher permission check
    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
      orderBy: [{ studentId: 'asc' }, { order: 'desc' }],
      include: { file: true, student: true },
    })
    res.json({ success: true, data: submissions })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' })
  }
})

// GET /api/assignments/:assignmentId/submissions/:studentId (teacher: all for student)
router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const { assignmentId, studentId } = req.params
    // TODO: Add teacher permission check
    const submissions = await prisma.submission.findMany({
      where: { assignmentId, studentId },
      orderBy: { order: 'desc' },
      include: { file: true, student: true },
    })
    res.json({ success: true, data: submissions })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' })
  }
})

// POST /api/assignments/:assignmentId/submissions/:studentId/recover
// Set a specific submission as the latest (default) submission
router.post('/:studentId/recover', async (req: Request, res: Response) => {
  try {
    const { assignmentId, studentId } = req.params
    const { submissionId } = req.body
    
    if (!submissionId) {
      return res.status(400).json({ success: false, error: 'submissionId is required' })
    }

    // TODO: Add teacher permission check
    
    // Get the submission to recover
    const submissionToRecover = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { file: true }
    })
    
    if (!submissionToRecover) {
      return res.status(404).json({ success: false, error: 'Submission not found' })
    }
    
    // Get the current highest order for this assignment/student
    const maxOrder = await prisma.submission.aggregate({
      where: { assignmentId, studentId },
      _max: { order: true },
    })
    
    const newOrder = (maxOrder._max.order || 0) + 1
    
    // Update the submission to have the highest order (making it the latest)
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: { order: newOrder },
      include: { file: true, student: true }
    })
    
    res.json({ success: true, data: updatedSubmission })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to recover submission' })
  }
})

export default router 