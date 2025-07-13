# LMS Monorepo - Learning Management System

A modern Learning Management System built with Next.js, TypeScript, and Express, organized as a pnpm monorepo.

## 🏗️ Project Structure

```
LMSFrontEnd/
├── apps/
│   ├── web/                 # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   └── lib/         # Utility functions
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   └── api/                 # Express.js backend API
│       ├── src/
│       │   ├── controllers/ # Route controllers
│       │   ├── middleware/  # Express middleware
│       │   ├── routes/      # API routes
│       │   ├── services/    # Business logic
│       │   └── utils/       # Utility functions
│       ├── prisma/          # Database schema and migrations
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── ui/                  # Shared UI components (shadcn/ui)
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   └── lib/         # Utility functions
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   └── types/               # Shared TypeScript types
│       ├── src/
│       │   └── index.ts     # Type definitions
│       ├── package.json
│       └── tsconfig.json
├── package.json             # Root package.json
├── pnpm-workspace.yaml      # pnpm workspace configuration
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- PostgreSQL database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LMSFrontEnd
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment files
   cp apps/api/env.example apps/api/.env
   cp apps/web/env.example apps/web/.env
   
   # Edit the files with your configuration
   # - Set up your PostgreSQL database URL
   # - Configure JWT secrets
   # - Set NextAuth secrets
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   pnpm db:generate
   
   # Push schema to database
   pnpm db:push
   ```

5. **Start development servers**
   ```bash
   # Start all applications
   pnpm dev
   
   # Or start individually:
   pnpm --filter web dev    # Frontend (http://localhost:3000)
   pnpm --filter api dev    # Backend (http://localhost:3001)
   ```

## 📦 Available Scripts

### Root Level Scripts
- `pnpm dev` - Start all applications in development mode
- `pnpm build` - Build all applications
- `pnpm lint` - Run linting across all packages
- `pnpm type-check` - Run TypeScript type checking
- `pnpm clean` - Clean all build artifacts

### Database Scripts
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Prisma Studio

## 🛠️ Technology Stack

### Frontend (apps/web)
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI components
- **NextAuth.js** - Authentication

### Backend (apps/api)
- **Express.js** - Node.js web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### Shared Packages
- **@lms/ui** - Reusable UI components
- **@lms/types** - Shared TypeScript types

## 🗄️ Database Schema

The application uses PostgreSQL with the following main entities:

- **Users** - Students, instructors, and admins
- **Courses** - Learning content with lessons
- **Lessons** - Individual learning units
- **Enrollments** - Student course registrations
- **Progress** - Student lesson completion tracking

## 🔐 Authentication

The system supports multiple user roles:
- **Student** - Can enroll in courses and track progress
- **Instructor** - Can create and manage courses
- **Admin** - Full system access

Authentication is handled via NextAuth.js with JWT tokens.

## 🎨 UI Components

The UI package includes pre-built components from shadcn/ui:
- Buttons, inputs, forms
- Cards, modals, dialogs
- Navigation, dropdowns
- Progress indicators
- And more...

## 📝 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages

### Package Dependencies
- Use workspace dependencies (`workspace:*`) for internal packages
- Keep dependencies up to date
- Use exact versions for critical packages

### Database Changes
- Always create migrations for schema changes
- Test migrations on development data first
- Document breaking changes

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Connect your repository
2. Set environment variables
3. Deploy automatically on push

### Backend (Railway/Render)
1. Connect your repository
2. Set environment variables
3. Configure PostgreSQL database
4. Deploy automatically on push

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review existing issues and discussions