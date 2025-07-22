import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router: Router = Router()
const prisma = new PrismaClient()

// Get all courses for sidebar (enrolled for user)
router.get('/courses', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' })
    // Get courses where user is enrolled
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: userId as string },
      select: { course: { select: { id: true, title: true } } },
      orderBy: { course: { title: 'asc' } },
    })
    // Get courses where user is instructor
    const teachingCourses = await prisma.course.findMany({
      where: { instructorId: userId as string },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    })
    // Merge and dedupe
    const allCourses = [...enrollments.map(e => e.course), ...teachingCourses]
    const seen = new Set()
    const uniqueCourses = allCourses.filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
    res.json({ success: true, data: uniqueCourses })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch courses' })
  }
})

// Get tags for a course
router.get('/:courseId/tags', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params
    const tags = await prisma.discussionTag.findMany({
      where: { courseId },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: tags })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch tags' })
  }
})

// Create a new tag
router.post('/:courseId/tags', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params
    const { name, createdById } = req.body
    if (!name || !createdById) return res.status(400).json({ success: false, error: 'Name and createdById required' })
    const tag = await prisma.discussionTag.create({
      data: { courseId, name, createdById },
    })
    res.status(201).json({ success: true, data: tag })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create tag' })
  }
})

// Delete a tag
router.delete('/tags/:tagId', async (req: Request, res: Response) => {
  try {
    const { tagId } = req.params
    await prisma.discussionTag.delete({ where: { id: tagId } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete tag' })
  }
})

// Get posts for a course
router.get('/:courseId/posts', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params
    // TODO: Add filter/search logic
    const posts = await prisma.discussionPost.findMany({
      where: { courseId },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        tag: true,
        replies: {
          include: {
            author: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: posts })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch posts' })
  }
})

// Get a single post (with replies)
router.get('/posts/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params
    // Fetch all replies for this post, including author
    const allReplies = await prisma.discussionReply.findMany({
      where: { postId },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    // Build 1-level nested reply tree
    const replyMap: Record<string, any> = {}
    allReplies.forEach(r => {
      replyMap[r.id] = { ...r, replies: [] }
    })
    const topLevelReplies = []
    allReplies.forEach(r => {
      if (r.parentReplyId && replyMap[r.parentReplyId]) {
        replyMap[r.parentReplyId].replies.push(replyMap[r.id])
      } else if (!r.parentReplyId) {
        topLevelReplies.push(replyMap[r.id])
      }
    })
    // Fetch the post
    const post = await prisma.discussionPost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        tag: true,
      },
    })
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' })
    res.json({ success: true, data: { ...post, replies: topLevelReplies } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch post' })
  }
})

// Create a new post
router.post('/:courseId/posts', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params
    const { authorId, title, body, type, tagId, privacy, attachmentUrl } = req.body
    if (!authorId || !title || !body || !type || !tagId || !privacy) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }
    // Generate a unique code for cross-linking
    const uniqueCode = `#${Math.floor(Math.random() * 100000)}`
    const post = await prisma.discussionPost.create({
      data: {
        courseId,
        authorId,
        title,
        body,
        type,
        tagId,
        privacy,
        uniqueCode,
        attachmentUrl,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        tag: true,
        replies: true,
      },
    })
    res.status(201).json({ success: true, data: post })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create post' })
  }
})

// Update a post
router.put('/posts/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params
    const updates = req.body
    const post = await prisma.discussionPost.update({
      where: { id: postId },
      data: updates,
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        tag: true,
        replies: true,
      },
    })
    res.json({ success: true, data: post })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update post' })
  }
})

// Delete a post (hard delete for teachers/admins or author, else 403)
router.delete('/posts/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params
    // TODO: Use real auth middleware. For now, mock user from req.query
    const userId = req.query.userId as string
    const userRole = req.query.userRole as string
    const post = await prisma.discussionPost.findUnique({ where: { id: postId } })
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' })
    const isTeacher = userRole === 'TEACHER' || userRole === 'ADMIN'
    const isAuthor = userId === post.authorId
    if (isTeacher || isAuthor) {
      // Hard delete: delete all replies, then the post
      await prisma.discussionReply.deleteMany({ where: { postId } })
      await prisma.discussionPost.delete({ where: { id: postId } })
      return res.json({ success: true })
    } else {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this post' })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete post' })
  }
})

// HARD DELETE a post (for teachers/admins only)
router.delete('/posts/:postId/hard', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params
    // TODO: Add auth middleware to restrict to teachers/admins
    await prisma.discussionPost.delete({ where: { id: postId } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to hard delete post' })
  }
})

// Create a new reply
router.post('/:courseId/replies', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params
    const { postId, parentReplyId, authorId, body, privacy, attachmentUrl } = req.body
    if (!postId || !authorId || !body || !privacy) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }
    // Generate a unique code for cross-linking
    const uniqueCode = `#${Math.floor(Math.random() * 100000)}`
    const reply = await prisma.discussionReply.create({
      data: {
        postId,
        parentReplyId,
        authorId,
        body,
        privacy,
        uniqueCode,
        attachmentUrl,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        replies: true,
      },
    })
    res.status(201).json({ success: true, data: reply })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create reply' })
  }
})

// Update a reply
router.put('/replies/:replyId', async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params
    const updates = req.body
    const reply = await prisma.discussionReply.update({
      where: { id: replyId },
      data: updates,
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        replies: true,
      },
    })
    res.json({ success: true, data: reply })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update reply' })
  }
})

// Delete a reply (hard delete for teachers/admins, soft delete for author, else 403)
router.delete('/replies/:replyId', async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params
    // TODO: Use real auth middleware. For now, mock user from req.query
    const userId = req.query.userId as string
    const userRole = req.query.userRole as string
    const reply = await prisma.discussionReply.findUnique({ where: { id: replyId } })
    if (!reply) return res.status(404).json({ success: false, error: 'Reply not found' })
    const isTeacher = userRole === 'TEACHER' || userRole === 'ADMIN'
    const isAuthor = userId === reply.authorId
    if (isTeacher) {
      // Hard delete: delete all child replies, then the reply
      await prisma.discussionReply.deleteMany({ where: { parentReplyId: replyId } })
      await prisma.discussionReply.delete({ where: { id: replyId } })
      return res.json({ success: true })
    } else if (isAuthor) {
      // Soft delete
      const newPrivacy = reply.privacy === 'PUBLIC' ? 'ANONYMOUS' : reply.privacy
      await prisma.discussionReply.update({
        where: { id: replyId },
        data: { isDeleted: true, privacy: newPrivacy },
      })
      return res.json({ success: true })
    } else {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this reply' })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete reply' })
  }
})

// HARD DELETE a reply (for teachers/admins only)
router.delete('/replies/:replyId/hard', async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params
    // TODO: Add auth middleware to restrict to teachers/admins
    await prisma.discussionReply.delete({ where: { id: replyId } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to hard delete reply' })
  }
})

export default router 