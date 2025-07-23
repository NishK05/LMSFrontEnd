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
router.get('/:courseId/sections', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  try {
    const sections = await prisma.gradeSection.findMany({ where: { courseId } });
    res.json({ success: true, data: sections });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch sections' });
  }
});

router.post('/:courseId/sections', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const sections: any[] = req.body.sections; // Expecting { sections: [...] }
  if (!Array.isArray(sections)) {
    return res.status(400).json({ success: false, error: 'Sections array required' });
  }
  try {
    // Get all existing section IDs for this course
    const existing = await prisma.gradeSection.findMany({
      where: { courseId },
      select: { id: true }
    });
    const existingIds = new Set(existing.map(s => s.id));
    const incomingIds = new Set(sections.map(s => s.id).filter(Boolean));

    // Upsert (create or update) each section
    const upserts = await Promise.all(sections.map(section =>
      prisma.gradeSection.upsert({
        where: { id: section.id || '' }, // '' will never match, so will create
        update: {
          name: section.name,
          weight: section.weight,
          order: section.order,
        },
        create: {
          courseId,
          name: section.name,
          weight: section.weight,
          order: section.order,
        }
      })
    ));

    // Delete sections that are in DB but not in the incoming array
    const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
    if (toDelete.length > 0) {
      await prisma.gradeSection.deleteMany({
        where: { id: { in: toDelete } }
      });
    }

    // Return updated list
    const updated = await prisma.gradeSection.findMany({ where: { courseId } });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save sections' });
  }
});
router.put('/:courseId/sections/:sectionId', requireAuth, (req, res) => {
  res.json({ success: true, data: { id: req.params.sectionId, ...req.body } })
})
router.delete('/:courseId/sections/:sectionId', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Section deleted' })
})

// CRUD /api/gradebook/:courseId/assignments
router.get('/:courseId/assignments', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  try {
    const assignments = await prisma.assignment.findMany({ where: { courseId } });
    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
  }
});

router.post('/:courseId/assignments', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const { name, dueDate, sectionId, description, maxScore, type } = req.body;
  if (!name || !dueDate || !sectionId) {
    return res.status(400).json({ success: false, error: 'Name, dueDate, and sectionId are required' });
  }
  try {
    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        sectionId,
        name,
        dueDate: new Date(dueDate),
        description,
        maxScore: maxScore ?? 100,
        type: type ?? 'STANDARD',
      }
    });
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create assignment' });
  }
});

router.put('/:courseId/assignments/:assignmentId', requireAuth, async (req, res) => {
  const { assignmentId } = req.params;
  const { name, dueDate, sectionId, description, maxScore, type } = req.body;
  if (!name || !dueDate || !sectionId) {
    return res.status(400).json({ success: false, error: 'Name, dueDate, and sectionId are required' });
  }
  try {
    const assignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        name,
        dueDate: new Date(dueDate),
        sectionId,
        description,
        maxScore: maxScore ?? 100,
        type: type ?? 'STANDARD',
      }
    });
    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update assignment' });
  }
});

router.delete('/:courseId/assignments/:assignmentId', requireAuth, async (req, res) => {
  const { assignmentId } = req.params;
  try {
    // Delete all grades for this assignment first
    await prisma.grade.deleteMany({ where: { assignmentId } });
    // Now delete the assignment
    await prisma.assignment.delete({ where: { id: assignmentId } });
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete assignment' });
  }
});

// GET/POST /api/gradebook/:courseId/grades
router.get('/:courseId/grades', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  try {
    const grades = await prisma.grade.findMany({
      where: {
        assignment: { courseId }
      }
    });
    res.json({ success: true, data: grades });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch grades' });
  }
});

router.post('/:courseId/grades', requireAuth, async (req, res) => {
  const { assignmentId, studentId, score, submittedAt, status, comment } = req.body;
  if (!assignmentId || !studentId) {
    return res.status(400).json({ success: false, error: 'assignmentId and studentId are required' });
  }
  try {
    const grade = await prisma.grade.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        }
      },
      update: {
        score,
        submittedAt: submittedAt ? new Date(submittedAt) : null,
        status,
        comment,
      },
      create: {
        assignmentId,
        studentId,
        score,
        submittedAt: submittedAt ? new Date(submittedAt) : null,
        status,
        comment,
      }
    });
    res.status(201).json({ success: true, data: grade });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save grade' });
  }
});

// GET/PUT /api/gradebook/:courseId/late-penalty
router.get('/:courseId/late-penalty', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
    res.json({ success: true, data: { latePenalty: course.latePenalty ?? 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch late penalty' });
  }
});
router.put('/:courseId/late-penalty', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const { latePenalty } = req.body;
  if (typeof latePenalty !== 'number') {
    return res.status(400).json({ success: false, error: 'latePenalty must be a number' });
  }
  try {
    const course = await prisma.course.update({
      where: { id: courseId },
      data: { latePenalty },
    });
    res.json({ success: true, data: { latePenalty: course.latePenalty } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save late penalty' });
  }
});

// GET/PUT /api/gradebook/:courseId/rounding
router.get('/:courseId/rounding', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
    res.json({ success: true, data: { rounding: course.rounding ?? 2 } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch rounding' });
  }
});

router.put('/:courseId/rounding', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const { rounding } = req.body;
  if (typeof rounding !== 'number' || rounding < 0 || rounding > 5) {
    return res.status(400).json({ success: false, error: 'rounding must be an integer between 0 and 5' });
  }
  try {
    const course = await prisma.course.update({
      where: { id: courseId },
      data: { rounding },
    });
    res.json({ success: true, data: { rounding: course.rounding } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save rounding' });
  }
});

// GET /api/gradebook/:courseId/students
router.get('/:courseId/students', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: { user: { select: { id: true, name: true } } }
    });
    const students = enrollments.map(e => ({ id: e.user.id, name: e.user.name }));
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
});

// GET/POST /api/gradebook/:courseId/letter-grades
router.get('/:courseId/letter-grades', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  try {
    const splits = await prisma.letterGradeSplit.findMany({ where: { courseId } });
    res.json({ success: true, data: splits });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch letter grade splits' });
  }
});

router.post('/:courseId/letter-grades', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const splits: any[] = req.body.splits; // Expecting { splits: [...] }
  if (!Array.isArray(splits)) {
    return res.status(400).json({ success: false, error: 'Splits array required' });
  }
  try {
    // Get all existing split IDs for this course
    const existing = await prisma.letterGradeSplit.findMany({
      where: { courseId },
      select: { id: true }
    });
    const existingIds = new Set(existing.map(s => s.id));
    const incomingIds = new Set(splits.map(s => s.id).filter(Boolean));

    // Upsert (create or update) each split
    const upserts = await Promise.all(splits.map(split =>
      prisma.letterGradeSplit.upsert({
        where: { id: split.id || '' }, // '' will never match, so will create
        update: {
          label: split.label,
          minPercent: split.minPercent,
          order: split.order,
        },
        create: {
          courseId,
          label: split.label,
          minPercent: split.minPercent,
          order: split.order,
        }
      })
    ));

    // Delete splits that are in DB but not in the incoming array
    const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
    if (toDelete.length > 0) {
      await prisma.letterGradeSplit.deleteMany({
        where: { id: { in: toDelete } }
      });
    }

    // Return updated list
    const updated = await prisma.letterGradeSplit.findMany({ where: { courseId } });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save letter grade splits' });
  }
});

export default router 