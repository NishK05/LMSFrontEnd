import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { createError } from '../middleware/errorHandler'

const router: Router = Router()
const prisma = new PrismaClient()

// Get all courses with instructor information
router.get('/', async (req, res, next) => {
  try {
    const { instructor } = req.query;
    const whereClause = instructor
      ? { instructorId: instructor as string }
      : {};

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      data: courses,
    })
  } catch (error) {
    next(createError('Failed to fetch courses', 500))
  }
})

// Get course by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lessons: true,
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assignments: true, // <-- Add this line
      },
    })

    if (!course) {
      return next(createError('Course not found', 404))
    }

    res.json({
      success: true,
      data: course,
    })
  } catch (error) {
    next(createError('Failed to fetch course', 500))
  }
})

// Create course
router.post('/', async (req, res, next) => {
  try {
    const { title, description, instructorId, isFree, price, isPublished } = req.body

    // Validate required fields
    if (!title || !description || !instructorId) {
      return next(createError('Title, description, and instructor are required', 400))
    }

    // Check if instructor exists and is a teacher
    const instructor = await prisma.user.findFirst({
      where: {
        id: instructorId,
        role: 'TEACHER',
      },
    })

    if (!instructor) {
      return next(createError('Instructor not found or not a teacher', 400))
    }

    // Generate slug from title
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Check if slug already exists
    const existingCourse = await prisma.course.findUnique({
      where: { slug },
    })

    if (existingCourse) {
      return next(createError('A course with this title already exists', 400))
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        slug,
        instructorId,
        isFree: isFree ?? true,
        price: isFree ? null : price,
        isPublished: isPublished ?? false,
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully',
    })
  } catch (error) {
    next(createError('Failed to create course', 500))
  }
})

// Update course
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Check if course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id },
    })

    if (!existingCourse) {
      return next(createError('Course not found', 404))
    }

    // If instructor is being changed, validate the new instructor
    if (updateData.instructorId && updateData.instructorId !== existingCourse.instructorId) {
      const instructor = await prisma.user.findFirst({
        where: {
          id: updateData.instructorId,
          role: 'TEACHER',
        },
      })

      if (!instructor) {
        return next(createError('Instructor not found or not a teacher', 400))
      }
    }

    // If title is being changed, generate new slug
    if (updateData.title && updateData.title !== existingCourse.title) {
      const slug = updateData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      
      // Check if new slug already exists
      const existingSlug = await prisma.course.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      })

      if (existingSlug) {
        return next(createError('A course with this title already exists', 400))
      }

      updateData.slug = slug
    }

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.json({
      success: true,
      data: course,
      message: 'Course updated successfully',
    })
  } catch (error) {
    next(createError('Failed to update course', 500))
  }
})

// Delete course
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id },
    })

    if (!course) {
      return next(createError('Course not found', 404))
    }

    // Delete course (this will cascade delete related records due to onDelete: Cascade)
    await prisma.course.delete({
      where: { id },
    })

    res.json({
      success: true,
      message: 'Course deleted successfully',
    })
  } catch (error) {
    next(createError('Failed to delete course', 500))
  }
})

// Enroll a student in a course
router.post('/:courseId/enroll', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.body;

    // Check if course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return next(createError('Course not found', 404));

    // Check if user exists and is a student
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT') return next(createError('User not found or not a student', 400));

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) return next(createError('Student already enrolled', 400));

    // Enroll student
    await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        role: 'STUDENT',
      },
    });

    res.json({ success: true, message: 'Student enrolled successfully' });
  } catch (error) {
    next(createError('Failed to enroll student', 500));
  }
});

export default router 