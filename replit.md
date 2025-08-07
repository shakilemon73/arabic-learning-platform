# Overview

This is an Arabic language learning platform that provides online courses with live classes. The application is designed specifically for Bengali speakers who want to learn Arabic to better understand the Quran and Hadith. It features course enrollment with payment processing, live class participation, user progress tracking, and certificate generation.

**Migration Status: ✅ COMPLETE - SUPABASE BACKEND**
- Successfully migrated from Express server to Supabase-only architecture
- Replaced Express backend with direct Supabase API calls
- Implemented Supabase authentication with login/signup components
- Application now runs as pure frontend with Supabase backend
- All authentication flows updated to use Supabase Auth
- Fixed Vite host allowlist configuration for Replit deployment
- Migration checklist completed successfully

**Recent Changes (2025-01-07):**
✅ **MAJOR ARCHITECTURE CLEANUP COMPLETED**
- **Removed Express server code conflicts**: Deleted server/routes.ts, server/storage.ts, server/replitAuth.ts, server/demoAuth.ts, server/db.ts
- **Fixed Vite configuration conflicts**: Removed vite.dynamic.config.ts, updated server/index.ts to use main vite.config.ts
- **Cleaned up unused dependencies**: Removed Drizzle ORM schema files (shared/schema.ts) as app uses Supabase directly
- **Fixed TypeScript property name mismatches**: Updated all camelCase properties to snake_case to match Supabase database schema
- **Created proper type definitions**: Added client/src/lib/types.ts with comprehensive TypeScript interfaces
- **Added centralized API utilities**: Created client/src/lib/api.ts for consistent data fetching patterns
- **Fixed authentication flow**: Resolved mixed auth system conflicts, now purely Supabase Auth
- **Environment configuration**: Proper environment variable handling with fallbacks

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript running on Vite for fast development
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **State Management**: TanStack Query for server state and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom Islamic-themed color palette and Bengali typography support

## Backend Architecture
- **Framework**: Pure Supabase Backend-as-a-Service (BaaS) - No Express server
- **Authentication**: Supabase Auth with JWT tokens and secure session management
- **Database**: PostgreSQL via Supabase with real-time subscriptions
- **API Design**: Direct Supabase client calls from frontend using centralized API utilities
- **Type Safety**: Custom TypeScript interfaces matching Supabase database schema (snake_case)
- **Data Fetching**: TanStack Query for caching and state management
- **Deployment**: Vite-only frontend with Replit host configuration

## Database Design
- **Database**: PostgreSQL via Supabase with real-time capabilities
- **Schema**: Comprehensive tables for users, course modules, live classes, instructors, class attendance, and session storage
- **Features**: User progress tracking, payment status, course enrollment status, and attendance records
- **Real-time**: Supabase real-time subscriptions for live features

## Payment Processing
- **Provider**: Bangladeshi mobile banking (bKash, Nagad, Rocket) for course enrollment payments (600 BDT)
- **Integration**: Local payment methods with manual verification for Nagad/Rocket and automated verification for bKash
- **Security**: Payment records stored in PostgreSQL database with status tracking and manual verification workflow

## Authentication & Authorization
- **Provider**: Replit Auth with automatic user provisioning (Production) / Demo Auth System (Development)
- **Demo Auth**: Three demo users available - Sarah Ahmed (Teacher), Ahmad Hassan & Fatima Khan (Students)
- **Session Storage**: PostgreSQL-backed sessions with 7-day TTL
- **Security**: HTTPS-only cookies, CSRF protection, and secure session management
- **User Management**: Automatic user creation on first login with profile management

## Localization & Cultural Design
- **Languages**: Primary Bengali interface with Arabic content
- **Cultural Elements**: Islamic color scheme (green, gold), Arabic typography, and culturally appropriate design patterns
- **Typography**: Hind Siliguri font for Bengali text with proper Arabic script support

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit Auth service for user management
- **Hosting**: Replit platform with automatic deployment

## Payment Services
- **Bangladeshi Mobile Banking**: bKash, Nagad, and Rocket payment gateway integration
- **Features**: Payment record tracking, manual verification workflow, payment status management

## UI & Design
- **shadcn/ui**: Component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **Drizzle Kit**: Database migration and schema management
- **TanStack Query**: Server state management and caching