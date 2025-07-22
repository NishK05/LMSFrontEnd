import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const router: Router = Router()

// Placeholder auth/permissions middleware
function requireAuth(req: Request, res: Response, next: Function) {
  // TODO: Implement real auth/permissions
  next()
}

// GET /api/gradebook/courses (user's courses)
router.get('/courses', requireAuth, async (req, res) => {
  const userId = req.query.userId as string
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' })
  try {
    // Courses where user is enrolled
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      select: { course: true }
    })
    // Courses where user is instructor
    const teaching = await prisma.course.findMany({
      where: { instructorId: userId }
    })
    // Merge and dedupe
    const allCourses = [...enrollments.map(e => e.course), ...teaching]
    const seen = new Set()
    const uniqueCourses = allCourses.filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
    // Return only needed fields
    const result = uniqueCourses.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      instructorId: c.instructorId,
      isPublished: c.isPublished,
      isFree: c.isFree,
      price: c.price,
      latePenalty: c.latePenalty ?? null
    }))
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch courses' })
  }
})

// CRUD /api/gradebook/:courseId/sections
router.get('/:courseId/sections', requireAuth, (req, res) => {
  res.json({ success: true, data: [{ id: 'section1', name: 'Homework', weight: 40 }] })
})
router.post('/:courseId/sections', requireAuth, (req, res) => {
  res.status(201).json({ success: true, data: { id: 'section2', ...req.body } })
})
router.put('/:courseId/sections/:sectionId', requireAuth, (req, res) => {
  res.json({ success: true, data: { id: req.params.sectionId, ...req.body } })
})
router.delete('/:courseId/sections/:sectionId', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Section deleted' })
})

// CRUD /api/gradebook/:courseId/assignments
router.get('/:courseId/assignments', requireAuth, (req, res) => {
  res.json({ success: true, data: [{ id: 'assignment1', name: 'Quiz 1', sectionId: 'section1' }] })
})
router.post('/:courseId/assignments', requireAuth, (req, res) => {
  res.status(201).json({ success: true, data: { id: 'assignment2', ...req.body } })
})
router.put('/:courseId/assignments/:assignmentId', requireAuth, (req, res) => {
  res.json({ success: true, data: { id: req.params.assignmentId, ...req.body } })
})
router.delete('/:courseId/assignments/:assignmentId', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Assignment deleted' })
})

// GET/POST /api/gradebook/:courseId/grades
router.get('/:courseId/grades', requireAuth, (req, res) => {
  res.json({ success: true, data: [{ assignmentId: 'assignment1', studentId: 'student1', score: 95 }] })
})
router.post('/:courseId/grades', requireAuth, (req, res) => {
  res.status(201).json({ success: true, data: req.body })
})

// GET/PUT /api/gradebook/:courseId/late-penalty
router.get('/:courseId/late-penalty', requireAuth, (req, res) => {
  res.json({ success: true, data: { latePenalty: 10 } })
})
router.put('/:courseId/late-penalty', requireAuth, (req, res) => {
  res.json({ success: true, data: { latePenalty: req.body.latePenalty } })
})

// GET /api/gradebook/:courseId/students
router.get('/:courseId/students', requireAuth, (req, res) => {
  res.json({ success: true, data: [{ id: 'student1', name: 'Alice' }, { id: 'student2', name: 'Bob' }] })
})

export default router 