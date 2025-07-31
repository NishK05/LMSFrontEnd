import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import OpenAI from 'openai'

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
  const { userId, role } = req.query;
  
  try {
    let whereClause: any = {
      assignment: { courseId }
    };
    
    // If student, only show published grades
    if (role === 'STUDENT') {
      whereClause.isPublished = true;
    }
    
    const grades = await prisma.grade.findMany({
      where: whereClause
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

// Bulk save/publish grades
router.post('/:courseId/grades/bulk', requireAuth, async (req, res) => {
  const { courseId } = req.params
  const grades = req.body.grades // Expecting { grades: [ ... ] }
  if (!Array.isArray(grades)) {
    return res.status(400).json({ success: false, error: 'grades array required' })
  }
  try {
    const results = await Promise.all(grades.map(async (g: any) => {
      // Upsert by assignmentId+studentId
      return prisma.grade.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId: g.assignmentId,
            studentId: g.studentId,
          },
        },
        update: {
          score: g.score,
          comment: g.comment,
          status: g.status,
          dueDateOverride: g.dueDateOverride || null,
          isPublished: g.publish ? true : g.isPublished, // Set isPublished if publish flag is true
          rubricSelections: g.rubricSelections || null,
        },
        create: {
          assignmentId: g.assignmentId,
          studentId: g.studentId,
          score: g.score,
          comment: g.comment,
          status: g.status,
          dueDateOverride: g.dueDateOverride || null,
          isPublished: g.publish ? true : false, // Default to false unless publish flag is true
          rubricSelections: g.rubricSelections || null,
        },
      })
    }))
    res.json({ success: true, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save grades' })
  }
})

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

// Rubric Management Endpoints
// GET /api/gradebook/:courseId/assignments/:assignmentId/rubrics
router.get('/:courseId/assignments/:assignmentId/rubrics', requireAuth, async (req, res) => {
  const { assignmentId } = req.params;
  try {
    const rubrics = await prisma.rubric.findMany({ 
      where: { assignmentId },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, data: rubrics });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch rubrics' });
  }
});

// POST /api/gradebook/:courseId/assignments/:assignmentId/rubrics
router.post('/:courseId/assignments/:assignmentId/rubrics', requireAuth, async (req, res) => {
  const { assignmentId } = req.params;
  const { name, type, content } = req.body;
  
  if (!name || !content) {
    return res.status(400).json({ success: false, error: 'Name and content are required' });
  }

  try {
    // Check if assignment exists
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    // Check if we already have 3 rubrics
    const existingRubrics = await prisma.rubric.count({ where: { assignmentId } });
    if (existingRubrics >= 3) {
      return res.status(400).json({ success: false, error: 'Maximum 3 rubrics allowed per assignment' });
    }

    // Deactivate all other rubrics if this one should be active
    if (req.body.isActive) {
      await prisma.rubric.updateMany({
        where: { assignmentId },
        data: { isActive: false }
      });
    }

    const rubric = await prisma.rubric.create({
      data: {
        assignmentId,
        name,
        type: type || 'MANUAL',
        content,
        isActive: req.body.isActive || false,
      }
    });

    res.status(201).json({ success: true, data: rubric });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create rubric' });
  }
});

// PUT /api/gradebook/:courseId/assignments/:assignmentId/rubrics/:rubricId
router.put('/:courseId/assignments/:assignmentId/rubrics/:rubricId', requireAuth, async (req, res) => {
  const { rubricId } = req.params;
  const { name, content, isActive } = req.body;
  
  try {
    const rubric = await prisma.rubric.findUnique({ where: { id: rubricId } });
    if (!rubric) {
      return res.status(404).json({ success: false, error: 'Rubric not found' });
    }

    // If activating this rubric, deactivate others
    if (isActive) {
      await prisma.rubric.updateMany({
        where: { assignmentId: rubric.assignmentId },
        data: { isActive: false }
      });
    }

    const updatedRubric = await prisma.rubric.update({
      where: { id: rubricId },
      data: {
        name: name || rubric.name,
        content: content || rubric.content,
        isActive: isActive !== undefined ? isActive : rubric.isActive,
      }
    });

    res.json({ success: true, data: updatedRubric });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update rubric' });
  }
});

// DELETE /api/gradebook/:courseId/assignments/:assignmentId/rubrics/:rubricId
router.delete('/:courseId/assignments/:assignmentId/rubrics/:rubricId', requireAuth, async (req, res) => {
  const { rubricId } = req.params;
  
  try {
    await prisma.rubric.delete({ where: { id: rubricId } });
    res.json({ success: true, message: 'Rubric deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete rubric' });
  }
});

// POST /api/gradebook/:courseId/assignments/:assignmentId/rubrics/:rubricId/activate
router.post('/:courseId/assignments/:assignmentId/rubrics/:rubricId/activate', requireAuth, async (req, res) => {
  const { rubricId } = req.params;
  
  try {
    const rubric = await prisma.rubric.findUnique({ where: { id: rubricId } });
    if (!rubric) {
      return res.status(404).json({ success: false, error: 'Rubric not found' });
    }

    // Deactivate all rubrics for this assignment
    await prisma.rubric.updateMany({
      where: { assignmentId: rubric.assignmentId },
      data: { isActive: false }
    });

    // Activate the selected rubric
    const activatedRubric = await prisma.rubric.update({
      where: { id: rubricId },
      data: { isActive: true }
    });

    res.json({ success: true, data: activatedRubric });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to activate rubric' });
  }
});

// Helper function to compute total points (adapted from legacy code)
function computeTotalPoints(rubric: any): number {
  if (!rubric || !rubric.sections) return 0;
  return rubric.sections.reduce((sum: number, section: any) => {
    let sectionTotal = 0;
    
    // Add points from section-level items
    sectionTotal += (section.rubricItems || []).reduce((s: number, item: any) => s + (item.points || 0), 0);
    
    // Add points from part-level items
    sectionTotal += (section.parts || []).reduce((partSum: number, part: any) => {
      return partSum + (part.rubricItems || []).reduce((itemSum: number, item: any) => itemSum + (item.points || 0), 0);
    }, 0);
    
    return sum + sectionTotal;
  }, 0);
}

// Helper function to add stable IDs to rubric structure (adapted from legacy code)
function addIdsToRubric(rubric: any) {
  if (!rubric || !rubric.sections) return rubric;
  rubric.sections.forEach((sec: any, sIdx: number) => {
    if (!sec.id) sec.id = `section-${sIdx}`;

    // section-level items
    (sec.rubricItems || []).forEach((it: any, iIdx: number) => {
      if (!it.id) it.id = `item-${sIdx}-${iIdx}`;
    });

    // parts and their items
    (sec.parts || []).forEach((part: any, pIdx: number) => {
      if (!part.id) part.id = `part-${sIdx}-${pIdx}`;
      (part.rubricItems || []).forEach((it: any, iIdx: number) => {
        if (!it.id) it.id = `item-${sIdx}-${pIdx}-${iIdx}`;
      });
    });
  });
  return rubric;
}

// POST /api/gradebook/:courseId/assignments/:assignmentId/rubrics/ai-generate
router.post('/:courseId/assignments/:assignmentId/rubrics/ai-generate', requireAuth, async (req, res) => {
  const { assignmentId } = req.params;
  const { promptImage, solutionImages, rubricName } = req.body;
  
  if (!promptImage || !solutionImages || !Array.isArray(solutionImages) || solutionImages.length === 0) {
    return res.status(400).json({ success: false, error: 'Prompt image and at least one solution image are required' });
  }

  if (!rubricName || !rubricName.trim()) {
    return res.status(400).json({ success: false, error: 'Rubric name is required' });
  }

  try {
    // Check if assignment exists and get its details
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    // Check if we already have 3 rubrics
    const existingRubrics = await prisma.rubric.count({ where: { assignmentId } });
    if (existingRubrics >= 3) {
      return res.status(400).json({ success: false, error: 'Maximum 3 rubrics allowed per assignment' });
    }

    // Import OpenAI (you'll need to install this: npm install openai)
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Prepare images for GPT-4 Vision
    const images: string[] = [];
    
    // Add prompt image
    images.push(promptImage);
    
    // Add solution images
    images.push(...solutionImages);

    // Build vision parts for GPT-4o (adapted from legacy code)
    const visionParts = images.flatMap((img, idx) => [
      { type: 'text', text: idx === 0 ? 'Prompt image:' : `Solution image ${idx}` },
      { type: 'image_url', image_url: { url: img } },
    ]);

    // Generate rubric using GPT-4 Vision (adapted from legacy prompt)
    const gptResp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `
You are an expert Discrete-Math / Probability TA who writes **Gradescope-style rubrics in pure JSON**.

Design requirements
1. Create one top-level **section** for every fully-correct solution path you identify in the solution image(s).
2. For each section provide one of two kinds of rubric items:
   • rubricItems – criteria that belong directly to that section.
   • Optional parts – for prompts that have sub-parts (e.g. "(a), (b) …"). Each part contains its own rubricItems.
3. Every rubric item must reference only work that is **explicitly visible** in the solution image; do not invent style/clarity comments.
4. Give each rubric item a positive points value. The sum of points in **any single section path** must equal the assignment total (${assignment.maxScore}).
5. Be maximally specific: include exact numeric answers, equation forms, variable names, etc.
6. JSON schema (return **only** this object – no markdown):

{
  "sections": [
    {
      "title": "string",
      "rubricItems": [
        { "title": "string", "points": int, "feedback": "string" }
      ],
      "parts": [
        {
          "title": "string",
          "rubricItems": [
            { "title": "string", "points": int, "feedback": "string" }
          ]
        }
      ]
    }
  ]
}

Return NOTHING except valid JSON.
          `.trim()
        },
        {
          role: 'user',
          content: visionParts
        },
        {
          role: 'user',
          content: `The assignment is worth ${assignment.maxScore} points. Generate a rubric.`
        }
      ],
      max_tokens: 800,
    });

    // Parse the response (adapted from legacy parsing logic)
    let raw = gptResp.choices[0].message?.content ?? '';
    
    // Remove markdown fences if present
    raw = raw.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```[a-zA-Z]*\n/, '').replace(/```$/, '').trim();
    }
    
    // Try to parse first JSON block
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }
    
    const generatedRubric = JSON.parse(raw);
    
    // Add stable IDs to the rubric structure
    const rubricWithIds = addIdsToRubric(generatedRubric);
    
    // Validate point totals
    const totalPoints = computeTotalPoints(rubricWithIds);
    const isValid = Math.abs(totalPoints - assignment.maxScore) < 0.01; // Allow small floating point differences

    // Create the rubric in the database
    const rubric = await prisma.rubric.create({
      data: {
        assignmentId,
        name: rubricName.trim(),
        type: 'AI_GENERATED',
        content: rubricWithIds,
        isActive: false, // Don't auto-activate AI rubrics
      }
    });

    res.status(201).json({ 
      success: true, 
      data: rubric,
      validation: {
        totalPoints,
        isValid,
        expectedPoints: assignment.maxScore
      }
    });

  } catch (error) {
    console.error('AI rubric generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate AI rubric. Please try again or create a manual rubric instead.' 
    });
  }
});

// AI Grading endpoint
router.post('/:courseId/assignments/:assignmentId/ai-grade', requireAuth, async (req, res) => {
  const { courseId, assignmentId } = req.params
  const { studentId, submissionId } = req.body

  if (!studentId) {
    return res.status(400).json({ success: false, error: 'studentId is required' })
  }

  try {
    // Get the active rubric for this assignment
    const rubricsRes = await fetch(`http://localhost:3000/api/gradebook/${courseId}/assignments/${assignmentId}/rubrics`)
    const rubricsData = await rubricsRes.json() as any
    
    if (!rubricsData.success) {
      return res.status(400).json({ success: false, error: 'Failed to fetch rubrics' })
    }

    const activeRubric = rubricsData.data.find((r: any) => r.isActive)
    if (!activeRubric) {
      return res.status(400).json({ success: false, error: 'No active rubric found for this assignment' })
    }

    // Get the submission file using the provided submissionId
    const submissionRes = await fetch(`http://localhost:3000/api/assignments/${assignmentId}/submissions/${studentId}`)
    const submissionData = await submissionRes.json() as any
    
    if (!submissionData.success || !submissionData.data) {
      return res.status(400).json({ success: false, error: 'No submission found for this student' })
    }

    // Find the specific submission by ID if provided, otherwise use the latest
    let submission
    if (submissionId) {
      submission = Array.isArray(submissionData.data) 
        ? submissionData.data.find((s: any) => s.id === submissionId)
        : submissionData.data.id === submissionId ? submissionData.data : null
    } else {
      // Use the latest submission (first in array or single submission)
      submission = Array.isArray(submissionData.data) ? submissionData.data[0] : submissionData.data
    }
    
    if (!submission) {
      return res.status(400).json({ success: false, error: 'No submission found for this student' })
    }

    const file = submission.file

    // Convert file to base64 for GPT-4 Vision
    const fileRes = await fetch(`http://localhost:3000/api/files/download/${file.id}`)
    if (!fileRes.ok) {
      return res.status(400).json({ success: false, error: 'Failed to download submission file' })
    }

    const fileBuffer = await fileRes.arrayBuffer()
    const base64Image = Buffer.from(fileBuffer).toString('base64')
    const dataUrl = `data:${file.mimetype};base64,${base64Image}`

    // Prepare GPT-4 Vision request
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const visionParts = [
      { type: 'text', text: 'Student submission:' },
      { type: 'image_url', image_url: { url: dataUrl } }
    ]

    const systemPrompt = `You are an auto-grader.

You receive two things:
  1. rubric JSON (contains unique "id" for every rubricItem)
  2. student-answer image(s).

Task:
  • Decide **which rubricItems are fully satisfied** by the student.
  • Compute an integer total by summing the *points* for every satisfied item.

Response format (MUST be pure JSON – no markdown):
{
  "total": int,                       // sum of points for satisfied items
  "hits": [                           // one element **per satisfied item only**
    {
      "section": "string",           // section.title
      "criterion": "string",         // rubricItem.title
      "itemId": "string",           // rubricItem.id (exact match!)
      "points": int,                 // the rubricItem.points value
      "comment": "string"           // short justification referencing student work
    }
  ]
}

Do NOT include items that are not satisfied.  Do NOT add fields.  Return only JSON.`

    // Get assignment details for max score
    const assignmentRes = await fetch(`http://localhost:3000/api/gradebook/${courseId}/assignments`)
    const assignmentData = await assignmentRes.json() as any
    const assignment = assignmentData.data?.find((a: any) => a.id === assignmentId)
    
    const userPrompt = `Rubric JSON:\n${JSON.stringify(activeRubric.content)}\n\nThe assignment is worth ${assignment?.maxScore || 100} points. Provide grading.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: visionParts as any },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800,
    })

    let raw = response.choices[0].message?.content ?? ''
    console.log('GPT grading raw response:', raw)
    
    // Clean the response
    raw = raw.trim()
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```[a-zA-Z]*\n/, '').replace(/```$/, '').trim()
    }
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      raw = raw.slice(firstBrace, lastBrace + 1)
    }

    // Parse JSON and clean trailing commas
    const cleanJson = (txt: string) => {
      return txt.replace(/,\s*([}\]])/g, '$1')
    }
    
    const parsed = JSON.parse(cleanJson(raw))
    let hits = Array.isArray(parsed.hits) ? parsed.hits : []
    let total = parsed.total || 0

    // Normalize rubric to map titles -> item data
    const norm = (rub: any) => {
      const map: Record<string, any> = {}
      if (!rub || !rub.sections || !Array.isArray(rub.sections)) {
        return map
      }
      
      rub.sections.forEach((sec: any) => {
        if (!sec || !sec.title) return
        
        // Handle section-level rubricItems
        if (sec.rubricItems && Array.isArray(sec.rubricItems)) {
          sec.rubricItems.forEach((it: any) => { 
            if (it && it.title) {
              map[`${sec.title}||${it.title}`] = it 
            }
          })
        }
        
        // Handle part-level rubricItems
        if (sec.parts && Array.isArray(sec.parts)) {
          sec.parts.forEach((p: any) => {
            if (p && p.rubricItems && Array.isArray(p.rubricItems)) {
              p.rubricItems.forEach((it: any) => { 
                if (it && it.title) {
                  map[`${sec.title}||${it.title}`] = it 
                }
              })
            }
          })
        }
      })
      return map
    }

    const rubricMap = norm(activeRubric.content)

    // Create id→points map
    const idMap: Record<string, number> = {}
    const idToItemMap: Record<string, any> = {}
    
    if (activeRubric.content && activeRubric.content.sections && Array.isArray(activeRubric.content.sections)) {
      activeRubric.content.sections.forEach((sec: any) => {
        if (!sec) return
        
        // Handle section-level rubricItems
        if (sec.rubricItems && Array.isArray(sec.rubricItems)) {
          sec.rubricItems.forEach((it: any) => { 
            if (it && it.id) {
              idMap[it.id] = it.points || 0
              idToItemMap[it.id] = it
            }
          })
        }
        
        // Handle part-level rubricItems
        if (sec.parts && Array.isArray(sec.parts)) {
          sec.parts.forEach((p: any) => {
            if (p && p.rubricItems && Array.isArray(p.rubricItems)) {
              p.rubricItems.forEach((it: any) => { 
                if (it && it.id) {
                  idMap[it.id] = it.points || 0
                  idToItemMap[it.id] = it
                }
              })
            }
          })
        }
      })
    }

    // Recompute total based on rubric points and collect selected item IDs
    total = 0
    const selectedItemIds: string[] = []
    const feedbackTexts: string[] = []
    
    hits = hits.map((h: any) => {
      const key = `${h.section}||${h.criterion}`
      const points = h.itemId && idMap[h.itemId] != null ? idMap[h.itemId] : (rubricMap[key]?.points || 0)
      total += points
      
      if (h.itemId) {
        selectedItemIds.push(h.itemId)
      }
      
      if (h.comment) {
        feedbackTexts.push(h.comment)
      }
      
      return {
        section: h.section,
        criterion: h.criterion,
        itemId: h.itemId || (rubricMap[key]?.id ?? null),
        points,
        comment: h.comment || ''
      }
    })

    // Create feedback text
    const feedbackText = feedbackTexts.join('\n\n')

    res.json({
      success: true,
      data: {
        score: total,
        feedback: feedbackText,
        rubricSelections: selectedItemIds,
        hits: hits
      }
    })

  } catch (error) {
    console.error('AI grading error:', error)
    res.status(500).json({ success: false, error: 'Failed to grade with AI' })
  }
})

// Bulk AI Grading endpoint
router.post('/:courseId/assignments/:assignmentId/ai-grade-bulk', requireAuth, async (req, res) => {
  const { courseId, assignmentId } = req.params

  try {
    // Get all students with submissions for this assignment
    const submissionsRes = await fetch(`http://localhost:3000/api/assignments/${assignmentId}/submissions`)
    const submissionsData = await submissionsRes.json() as any
    
    if (!submissionsData.success) {
      return res.status(400).json({ success: false, error: 'Failed to fetch submissions' })
    }

    const submissions = submissionsData.data || []
    
    // Get the active rubric
    const rubricsRes = await fetch(`http://localhost:3000/api/gradebook/${courseId}/assignments/${assignmentId}/rubrics`)
    const rubricsData = await rubricsRes.json() as any
    
    if (!rubricsData.success) {
      return res.status(400).json({ success: false, error: 'Failed to fetch rubrics' })
    }

    const activeRubric = rubricsData.data.find((r: any) => r.isActive)
    if (!activeRubric) {
      return res.status(400).json({ success: false, error: 'No active rubric found for this assignment' })
    }

    // Grade each submission
    const results = []
    for (const submission of submissions) {
      try {
        // Get the latest submission for this student
        const studentSubmissionRes = await fetch(`http://localhost:3000/api/assignments/${assignmentId}/submissions/${submission.studentId}`)
        const studentSubmissionData = await studentSubmissionRes.json() as any
        
        if (!studentSubmissionData.success || !studentSubmissionData.data) {
          console.error(`No submission found for student ${submission.studentId}`)
          results.push({
            studentId: submission.studentId,
            error: 'No submission found'
          })
          continue
        }

        // Use the latest submission (first in array or single submission)
        const latestSubmission = Array.isArray(studentSubmissionData.data) 
          ? studentSubmissionData.data[0] 
          : studentSubmissionData.data

        const file = latestSubmission.file
        
        // Convert file to base64
        const fileRes = await fetch(`http://localhost:3000/api/files/download/${file.id}`)
        if (!fileRes.ok) {
          console.error(`Failed to download file for submission ${submission.id}`)
          continue
        }

        const fileBuffer = await fileRes.arrayBuffer()
        const base64Image = Buffer.from(fileBuffer).toString('base64')
        const dataUrl = `data:${file.mimetype};base64,${base64Image}`

        // Prepare GPT-4 Vision request
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        
        const visionParts = [
          { type: 'text', text: 'Student submission:' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]

        const systemPrompt = `You are an auto-grader.

You receive two things:
  1. rubric JSON (contains unique "id" for every rubricItem)
  2. student-answer image(s).

Task:
  • Decide **which rubricItems are fully satisfied** by the student.
  • Compute an integer total by summing the *points* for every satisfied item.

Response format (MUST be pure JSON – no markdown):
{
  "total": int,                       // sum of points for satisfied items
  "hits": [                           // one element **per satisfied item only**
    {
      "section": "string",           // section.title
      "criterion": "string",         // rubricItem.title
      "itemId": "string",           // rubricItem.id (exact match!)
      "points": int,                 // the rubricItem.points value
      "comment": "string"           // short justification referencing student work
    }
  ]
}

Do NOT include items that are not satisfied.  Do NOT add fields.  Return only JSON.`

        // Get assignment details for max score
        const assignmentRes = await fetch(`http://localhost:3000/api/gradebook/${courseId}/assignments`)
        const assignmentData = await assignmentRes.json() as any
        const assignment = assignmentData.data?.find((a: any) => a.id === assignmentId)
        
        const userPrompt = `Rubric JSON:\n${JSON.stringify(activeRubric.content)}\n\nThe assignment is worth ${assignment?.maxScore || 100} points. Provide grading.`

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: visionParts as any },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 800,
        })

        let raw = response.choices[0].message?.content ?? ''
        
        // Clean the response
        raw = raw.trim()
        if (raw.startsWith('```')) {
          raw = raw.replace(/^```[a-zA-Z]*\n/, '').replace(/```$/, '').trim()
        }
        const firstBrace = raw.indexOf('{')
        const lastBrace = raw.lastIndexOf('}')
        if (firstBrace !== -1 && lastBrace !== -1) {
          raw = raw.slice(firstBrace, lastBrace + 1)
        }

        // Parse JSON and clean trailing commas
        const cleanJson = (txt: string) => {
          return txt.replace(/,\s*([}\]])/g, '$1')
        }
        
        const parsed = JSON.parse(cleanJson(raw))
        let hits = Array.isArray(parsed.hits) ? parsed.hits : []
        let total = parsed.total || 0

        // Normalize rubric to map titles -> item data
        const norm = (rub: any) => {
          const map: Record<string, any> = {}
          if (!rub || !rub.sections || !Array.isArray(rub.sections)) {
            return map
          }
          
          rub.sections.forEach((sec: any) => {
            if (!sec || !sec.title) return
            
            // Handle section-level rubricItems
            if (sec.rubricItems && Array.isArray(sec.rubricItems)) {
              sec.rubricItems.forEach((it: any) => { 
                if (it && it.title) {
                  map[`${sec.title}||${it.title}`] = it 
                }
              })
            }
            
            // Handle part-level rubricItems
            if (sec.parts && Array.isArray(sec.parts)) {
              sec.parts.forEach((p: any) => {
                if (p && p.rubricItems && Array.isArray(p.rubricItems)) {
                  p.rubricItems.forEach((it: any) => { 
                    if (it && it.title) {
                      map[`${sec.title}||${it.title}`] = it 
                    }
                  })
                }
              })
            }
          })
          return map
        }

        const rubricMap = norm(activeRubric.content)

        // Create id→points map
        const idMap: Record<string, number> = {}
        
        if (activeRubric.content && activeRubric.content.sections && Array.isArray(activeRubric.content.sections)) {
          activeRubric.content.sections.forEach((sec: any) => {
            if (!sec) return
            
            // Handle section-level rubricItems
            if (sec.rubricItems && Array.isArray(sec.rubricItems)) {
              sec.rubricItems.forEach((it: any) => { 
                if (it && it.id) {
                  idMap[it.id] = it.points || 0
                }
              })
            }
            
            // Handle part-level rubricItems
            if (sec.parts && Array.isArray(sec.parts)) {
              sec.parts.forEach((p: any) => {
                if (p && p.rubricItems && Array.isArray(p.rubricItems)) {
                  p.rubricItems.forEach((it: any) => { 
                    if (it && it.id) {
                      idMap[it.id] = it.points || 0
                    }
                  })
                }
              })
            }
          })
        }

        // Recompute total based on rubric points and collect selected item IDs
        total = 0
        const selectedItemIds: string[] = []
        const feedbackTexts: string[] = []
        
        hits = hits.map((h: any) => {
          const key = `${h.section}||${h.criterion}`
          const points = h.itemId && idMap[h.itemId] != null ? idMap[h.itemId] : (rubricMap[key]?.points || 0)
          total += points
          
          if (h.itemId) {
            selectedItemIds.push(h.itemId)
          }
          
          if (h.comment) {
            feedbackTexts.push(h.comment)
          }
          
          return {
            section: h.section,
            criterion: h.criterion,
            itemId: h.itemId || (rubricMap[key]?.id ?? null),
            points,
            comment: h.comment || ''
          }
        })

        // Create feedback text
        const feedbackText = feedbackTexts.join('\n\n')

        results.push({
          studentId: submission.studentId,
          score: total,
          feedback: feedbackText,
          rubricSelections: selectedItemIds,
          hits: hits
        })

      } catch (error) {
        console.error(`Error grading submission for student ${submission.studentId}:`, error)
        results.push({
          studentId: submission.studentId,
          error: 'Failed to grade with AI'
        })
      }
    }

    res.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Bulk AI grading error:', error)
    res.status(500).json({ success: false, error: 'Failed to grade with AI' })
  }
})

export default router 