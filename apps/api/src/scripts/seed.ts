import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create sample teachers
  const teacher1 = await prisma.user.upsert({
    where: { email: 'teacher1@university.edu' },
    update: {},
    create: {
      email: 'teacher1@university.edu',
      name: 'Dr. Sarah Johnson',
      password: 'password123',
      role: 'TEACHER',
    },
  })

  const teacher2 = await prisma.user.upsert({
    where: { email: 'teacher2@university.edu' },
    update: {},
    create: {
      email: 'teacher2@university.edu',
      name: 'Prof. Michael Chen',
      password: 'password123',
      role: 'TEACHER',
    },
  })

  // Create sample students
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@university.edu' },
    update: {},
    create: {
      email: 'student1@university.edu',
      name: 'Alex Rodriguez',
      password: 'password123',
      role: 'STUDENT',
    },
  })

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@university.edu' },
    update: {},
    create: {
      email: 'student2@university.edu',
      name: 'Emma Wilson',
      password: 'password123',
      role: 'STUDENT',
    },
  })

  // Create sample courses
  const course1 = await prisma.course.upsert({
    where: { slug: 'introduction-to-web-development' },
    update: {},
    create: {
      title: 'Introduction to Web Development',
      description: 'Learn the fundamentals of web development including HTML, CSS, and JavaScript. This course covers everything from basic markup to interactive web applications.',
      slug: 'introduction-to-web-development',
      instructorId: teacher1.id,
      isPublished: true,
      isFree: true,
    },
  })

  const course2 = await prisma.course.upsert({
    where: { slug: 'advanced-react-patterns' },
    update: {},
    create: {
      title: 'Advanced React Patterns',
      description: 'Master advanced React concepts including hooks, context, performance optimization, and state management patterns.',
      slug: 'advanced-react-patterns',
      instructorId: teacher2.id,
      isPublished: true,
      isFree: false,
      price: 99.99,
    },
  })

  const course3 = await prisma.course.upsert({
    where: { slug: 'database-design-principles' },
    update: {},
    create: {
      title: 'Database Design Principles',
      description: 'Learn the fundamentals of database design, normalization, and SQL. Perfect for beginners and intermediate developers.',
      slug: 'database-design-principles',
      instructorId: teacher1.id,
      isPublished: true,
      isFree: true,
    },
  })

  // Create sample lessons for course 1
  const lesson1_1 = await prisma.lesson.upsert({
    where: { id: 'lesson1_1' },
    update: {},
    create: {
      id: 'lesson1_1',
      title: 'HTML Fundamentals',
      description: 'Learn the basics of HTML markup and document structure',
      content: 'HTML is the standard markup language for creating web pages...',
      courseId: course1.id,
      order: 1,
      isPublished: true,
    },
  })

  const lesson1_2 = await prisma.lesson.upsert({
    where: { id: 'lesson1_2' },
    update: {},
    create: {
      id: 'lesson1_2',
      title: 'CSS Styling',
      description: 'Style your HTML with CSS to create beautiful web pages',
      content: 'CSS (Cascading Style Sheets) is used to style and layout web pages...',
      courseId: course1.id,
      order: 2,
      isPublished: true,
    },
  })

  const lesson1_3 = await prisma.lesson.upsert({
    where: { id: 'lesson1_3' },
    update: {},
    create: {
      id: 'lesson1_3',
      title: 'JavaScript Basics',
      description: 'Add interactivity to your web pages with JavaScript',
      content: 'JavaScript is a programming language that enables interactive web pages...',
      courseId: course1.id,
      order: 3,
      isPublished: true,
    },
  })

  // Create sample lessons for course 2
  const lesson2_1 = await prisma.lesson.upsert({
    where: { id: 'lesson2_1' },
    update: {},
    create: {
      id: 'lesson2_1',
      title: 'React Hooks Deep Dive',
      description: 'Master useState, useEffect, and custom hooks',
      content: 'React Hooks are functions that allow you to use state and other React features...',
      courseId: course2.id,
      order: 1,
      isPublished: true,
    },
  })

  const lesson2_2 = await prisma.lesson.upsert({
    where: { id: 'lesson2_2' },
    update: {},
    create: {
      id: 'lesson2_2',
      title: 'Context API and State Management',
      description: 'Learn advanced state management patterns in React',
      content: 'The Context API provides a way to pass data through the component tree...',
      courseId: course2.id,
      order: 2,
      isPublished: true,
    },
  })

  // Create sample lessons for course 3
  const lesson3_1 = await prisma.lesson.upsert({
    where: { id: 'lesson3_1' },
    update: {},
    create: {
      id: 'lesson3_1',
      title: 'Database Fundamentals',
      description: 'Understanding databases and their importance',
      content: 'A database is an organized collection of structured information...',
      courseId: course3.id,
      order: 1,
      isPublished: true,
    },
  })

  const lesson3_2 = await prisma.lesson.upsert({
    where: { id: 'lesson3_2' },
    update: {},
    create: {
      id: 'lesson3_2',
      title: 'SQL Basics',
      description: 'Learn to query databases with SQL',
      content: 'SQL (Structured Query Language) is used to communicate with databases...',
      courseId: course3.id,
      order: 2,
      isPublished: true,
    },
  })

  // Create sample assignments
  const assignment1 = await prisma.assignment.upsert({
    where: { id: 'assignment1' },
    update: {},
    create: {
      id: 'assignment1',
      courseId: course1.id,
      title: 'Build a Personal Portfolio',
      description: 'Create a personal portfolio website using HTML, CSS, and JavaScript',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  })

  const assignment2 = await prisma.assignment.upsert({
    where: { id: 'assignment2' },
    update: {},
    create: {
      id: 'assignment2',
      courseId: course1.id,
      title: 'Interactive Form Validation',
      description: 'Build a form with client-side validation using JavaScript',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
  })

  const assignment3 = await prisma.assignment.upsert({
    where: { id: 'assignment3' },
    update: {},
    create: {
      id: 'assignment3',
      courseId: course2.id,
      title: 'Custom Hook Library',
      description: 'Create a library of reusable custom hooks',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    },
  })

  const assignment4 = await prisma.assignment.upsert({
    where: { id: 'assignment4' },
    update: {},
    create: {
      id: 'assignment4',
      courseId: course3.id,
      title: 'Database Schema Design',
      description: 'Design a database schema for an e-commerce application',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    },
  })

  // Enroll students in courses
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student1.id, courseId: course1.id } },
    update: {},
    create: {
      userId: student1.id,
      courseId: course1.id,
      progress: 33, // 1 out of 3 lessons completed
      role: 'STUDENT',
    },
  })

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student1.id, courseId: course2.id } },
    update: {},
    create: {
      userId: student1.id,
      courseId: course2.id,
      progress: 50, // 1 out of 2 lessons completed
      role: 'STUDENT',
    },
  })

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student2.id, courseId: course1.id } },
    update: {},
    create: {
      userId: student2.id,
      courseId: course1.id,
      progress: 66, // 2 out of 3 lessons completed
      role: 'STUDENT',
    },
  })

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student2.id, courseId: course3.id } },
    update: {},
    create: {
      userId: student2.id,
      courseId: course3.id,
      progress: 0, // Not started
      role: 'STUDENT',
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log(`Created ${teacher1.name} and ${teacher2.name} as teachers`)
  console.log(`Created ${student1.name} and ${student2.name} as students`)
  console.log(`Created 3 courses with lessons and assignments`)
  console.log(`Enrolled students in various courses`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 