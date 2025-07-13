import { Router } from 'express'
import { PrismaClient, UserRole } from '@prisma/client'
import { createError } from '../middleware/errorHandler'

const router: Router = Router()
const prisma = new PrismaClient()

// Get users with optional role filter
router.get('/', async (req, res, next) => {
  try {
    const { role } = req.query
    
    const whereClause = role && Object.values(UserRole).includes(role as UserRole) 
      ? { role: role as UserRole } 
      : {}
    
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      data: users,
    })
  } catch (error) {
    next(createError('Failed to fetch users', 500))
  }
})

// Get user profile
router.get('/profile', (req, res) => {
  res.json({ message: 'Get user profile' })
})

// Update user profile
router.put('/profile', (req, res) => {
  res.json({ message: 'Update user profile' })
})

// Get user enrollments
router.get('/enrollments', async (req, res, next) => {
  try {
    // In a real app, get userId from session/JWT
    const { userId } = req.query;
    if (!userId) return next(createError('User ID required', 400));

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: userId as string },
      include: {
        course: {
          include: {
            instructor: { select: { name: true, email: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: enrollments.map(e => ({
        id: e.course.id,
        title: e.course.title,
        description: e.course.description,
        instructor: e.course.instructor,
        progress: e.progress,
      })),
    });
  } catch (error) {
    next(createError('Failed to fetch enrollments', 500));
  }
});

// Get user assignments
router.get('/assignments', async (req, res, next) => {
  try {
    // In a real app, get userId from session/JWT
    const { userId } = req.query;
    if (!userId) return next(createError('User ID required', 400));

    // Get user's enrolled courses
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: userId as string },
      include: {
        course: {
          include: {
            assignments: true,
          },
        },
      },
    });

    // Flatten assignments from all enrolled courses
    const assignments = enrollments.flatMap(enrollment =>
      enrollment.course.assignments.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate.toISOString(),
        courseTitle: enrollment.course.title,
      }))
    );

    // Sort by due date (earliest first)
    assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    res.json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    next(createError('Failed to fetch assignments', 500));
  }
});

// Get user progress
router.get('/progress', (req, res) => {
  res.json({ message: 'Get user progress' })
})

export default router 