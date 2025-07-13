// This file should be moved to /pages/api/auth/[...nextauth].ts for NextAuth v4
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      // Check if user exists in DB
      const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
      if (!dbUser) {
        // Create user with default role STUDENT
        await prisma.user.create({
          data: {
            email: user.email!,
            name: user.name || '',
            role: 'STUDENT',
            password: '', // Not used for OAuth
          },
        })
      }
      return true
    },
    async jwt({ token, user }) {
      // Always fetch from DB to get latest info
      const dbUser = await prisma.user.findUnique({ where: { email: token.email as string } })
      if (dbUser) {
        token.id = dbUser.id
        token.role = dbUser.role
        token.name = dbUser.name
        token.email = dbUser.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.name = token.name as string
        session.user.email = token.email as string
      }
      return session
    },
  },
}) 