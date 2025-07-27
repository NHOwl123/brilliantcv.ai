# brilliantcv.ai - AI-Powered Job Application Assistant

## Overview

brilliantcv.ai is a full-stack web application that helps job seekers create tailored resumes, cover letters, and interview preparation materials using AI. The platform will be deployed as brilliantcv.ai and hosted on Vercel for global market appeal using the internationally recognized "CV" terminology. The platform uses modern web technologies with a React frontend, Express backend, PostgreSQL database, and integrates with OpenAI for content generation and Stripe for payments.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### January 26, 2025 - Deployment Status (PAUSED)
- ✅ Microsoft 365 email infrastructure fully operational with mark@brilliantcv.ai
- ✅ Desktop Outlook integration working with external email delivery confirmed
- ✅ Custom domain brilliantcv.ai DNS configured and pointing to Vercel
- ✅ Created optimized vercel.json with static build configuration
- ✅ Generated pre-built static files in public/ directory to bypass build issues
- ✅ Build process verified working locally with npm run build
- ✅ Identified correct Stripe environment variables for production
- ✅ Successfully uploaded all working files to GitHub brilliantcv.ai repository
- ✅ Deployed to Vercel with all 9 environment variables configured
- ✅ Fixed vercel.json routing configuration to serve from dist/public
- ✅ Updated vercel.json with simplified configuration for better deployment
- ✅ Updated vercel.json with ultra-simple configuration
- ✅ Confirmed Vercel deployment process works with Under Construction page
- ✅ Domain brilliantcv.ai successfully connecting to Vercel deployments
- ✅ brilliantcv.ai domain live with Under Construction page
- ✅ Updated main app vercel.json with production-ready configuration
- ✅ Updated GitHub vercel.json with production configuration
- ✅ Build process starting successfully - dependencies installing
- ✅ Build completed successfully on Vercel
- ✅ Deployment completed - main application should be live
- ✅ Found correct deployment URL: brilliantcv4-ai.vercel.app
- ✅ Updated vercel.json with working routing configuration
- ✅ Confirmed public folder exists in GitHub repository
- ✅ Located built files in dist/public/ ready for upload
- ✅ All 9 environment variables verified in Vercel
- ✅ Identified deployment issue: Empty public folder in GitHub
- ✅ Uploaded all 3 built files to GitHub public folder:
  - public/index.html (382 bytes)
  - public/assets/index-Bx7LCRcy.css (65KB)
  - public/assets/index-Cal7zyEs.js (503KB)
- 🔄 Testing deployment after file upload complete

### January 25, 2025 - Subscription System Completion
- ✅ Fixed subscription status issues preventing proration
- ✅ Implemented proration simulation for tier changes  
- ✅ Removed downgrade-to-free option (Free is trial-only)
- ✅ Premium→Standard downgrade working with proration credit
- ✅ Updated pricing cards and subscription management UI
- ✅ Business model: Free trial → Standard/Premium (no downgrades to free)

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the client-side application
- **Vite** as the build tool and development server
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** for server state management and API calls
- **Tailwind CSS** with **shadcn/ui** components for styling
- **React Hook Form** with Zod validation for form handling

### Backend Architecture
- **Express.js** server with TypeScript
- **RESTful API** design for client-server communication
- **Session-based authentication** using Replit Auth with OpenID Connect
- **PostgreSQL** database with **Drizzle ORM** for type-safe database operations
- **Neon Database** as the PostgreSQL provider

### Key Technologies
- **Node.js** runtime with ES modules
- **TypeScript** for type safety across the entire stack
- **Zod** for runtime schema validation
- **Express sessions** stored in PostgreSQL for authentication state

## Key Components

### Authentication System
- **Replit Auth** integration using OpenID Connect
- Session management with PostgreSQL storage using `connect-pg-simple`
- Protected routes with authentication middleware
- User profile management with subscription tracking

### AI Integration
- **OpenAI GPT-4o** for content generation
- Job description analysis and skill matching
- Tailored resume generation based on user profile and job requirements
- Cover letter generation with personalization
- Interview preparation assistance

### Payment System
- **Stripe** integration for subscription management
- Three-tier pricing model (Free, Standard, Premium)
- Usage tracking and application count limits
- Subscription status management
- Free tier for trial purposes only - no downgrades from paid plans

### Database Schema
- **Users table**: Authentication and subscription data
- **User profiles**: Professional information, skills, certifications
- **Work experience**: Employment history with detailed descriptions
- **Education**: Academic background
- **Job applications**: Application tracking and generated content
- **Sessions**: Authentication session storage

### Document Generation
- PDF and Word document export capabilities
- Resume and cover letter formatting
- Application history and tracking

## Data Flow

1. **User Authentication**: Users authenticate via Replit Auth, creating sessions stored in PostgreSQL
2. **Profile Setup**: Users complete their professional profile, work experience, and education
3. **Job Application Process**:
   - User inputs job description
   - AI analyzes job requirements and matches with user profile
   - System generates tailored resume and cover letter
   - Documents can be exported in multiple formats
   - Application is saved to history
4. **Subscription Management**: Stripe handles payment processing and subscription updates
5. **Usage Tracking**: Application counts are tracked per user based on subscription tier

## External Dependencies

### Core Services
- **OpenAI API**: Content generation and job analysis
- **Stripe**: Payment processing and subscription management
- **Neon Database**: PostgreSQL hosting
- **Replit Auth**: Authentication provider

### Development Tools
- **Vite**: Frontend build tool with hot module replacement
- **Drizzle Kit**: Database schema management and migrations
- **ESBuild**: Backend bundling for production

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **Tailwind CSS**: Utility-first CSS framework

## Launch Timeline

### Current Phase (Testing)
- **Test pricing**: Standard $1, Premium $2 for easy proration testing
- **Subscription system**: Fully functional with proration simulation  
- **Free tier**: Trial-only (5 applications), no downgrades from paid plans
- **Next 2 days**: Complete testing, acquire brilliantcv.ai domain, prepare for launch

### Production Deployment
- **Platform**: Vercel hosting for scalability and performance
- **Domain**: brilliantcv.ai (acquired and configured)
- **Current URL**: brilliant3-ai.vercel.app (transitioning to custom domain)
- **Status**: Fully launched - awaiting DNS propagation (24-48 hours)
- **Email**: Microsoft 365 Business configured with professional email addresses
- **Primary Email**: mark@brilliantcv.ai
- **Business Infrastructure**: Complete and operational

### Development Environment
- **Vite dev server** for frontend with proxy to Express backend
- **TSX** for running TypeScript backend in development
- Hot module replacement for efficient development workflow

### Production Build
- **Vite build** generates optimized frontend assets
- **ESBuild** bundles backend into single JavaScript file
- Static files served by Express in production
- Environment variables for API keys and database connections

### Database Management
- **Drizzle migrations** for schema changes
- Connection pooling with Neon's serverless PostgreSQL
- Session table required for Replit Auth compliance

### Configuration
- TypeScript path aliases for clean imports
- Tailwind configured with custom design tokens
- PostCSS for CSS processing
- Environment-specific configurations for development and production

The application follows a modern full-stack architecture with clear separation of concerns, type safety throughout, and scalable design patterns suitable for a SaaS job application platform.