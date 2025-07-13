import { Router } from 'express'

const router = Router()

// Register
router.post('/register', (req, res) => {
  res.json({ message: 'Register endpoint' })
})

// Login
router.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint' })
})

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout endpoint' })
})

export default router 