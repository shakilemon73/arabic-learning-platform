# Overview

This is an Arabic language learning platform that provides online courses with live classes. The application is designed specifically for Bengali speakers who want to learn Arabic to better understand the Quran and Hadith. It features course enrollment with payment processing, live class participation, user progress tracking, and certificate generation.

**Migration Status: ✅ COMPLETE**
- Successfully migrated from Replit agent to standard Replit environment
- Demo authentication system implemented for testing all features
- Live class platform with screen sharing, real-time chat, and homework submission fully operational
- All 11 checklist items completed successfully

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
- **Framework**: Express.js server with TypeScript
- **Authentication**: Replit Auth with OpenID Connect for secure user authentication
- **Session Management**: Express sessions stored in PostgreSQL using connect-pg-simple
- **API Design**: RESTful endpoints with proper error handling and request logging middleware

## Database Design
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Database**: PostgreSQL via Neon serverless connection
- **Schema**: Comprehensive tables for users, course modules, live classes, instructors, class attendance, and session storage
- **Features**: User progress tracking, payment status, course enrollment status, and attendance records

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