import { Router } from 'express'

const router = Router()

// Get all lessons for a course
router.get('/course/:courseId', (req, res) => {
  res.json({ message: 'Get lessons for course' })
})

// Get lesson by ID
router.get('/:id', (req, res) => {
  res.json({ message: 'Get lesson by ID' })
})

// Create lesson
router.post('/', (req, res) => {
  res.json({ message: 'Create lesson' })
})

// Update lesson
router.put('/:id', (req, res) => {
  res.json({ message: 'Update lesson' })
})

// Delete lesson
router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete lesson' })
})

export default router 