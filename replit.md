# Overview

This project is an Arabic language learning platform with live online classes, designed for Bengali speakers to learn Arabic for Quran and Hadith understanding. It supports course enrollment, payment processing, live class participation, progress tracking, and certificate generation. The platform features a single, focused live class system with enterprise-grade video SDK comparable to leading platforms and a robust authentication system, built on a pure Supabase backend.

## Recent Changes (Aug 21, 2025)
- Simplified video conferencing system to use only the recommended `/live-class` page
- Removed redundant video conferencing pages: `/live-classes`, `/video-meet`, `/enterprise-meet`, `/video-rooms`
- Updated navigation to focus on the main live class functionality
- Streamlined user experience with a single video conferencing solution

# User Preferences

Preferred communication style: Simple, everyday language.
Code style: Clean, focused implementation without demo components.
Enterprise video: Production-grade features with direct Supabase integration.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript on Vite.
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS.
- **State Management**: TanStack Query for server state and data fetching.
- **Routing**: Wouter for lightweight client-side routing.
- **Styling**: Tailwind CSS with custom Islamic-themed color palette and Bengali typography.
- **Video SDK**: Enterprise Video SDK v2.0 with advanced WebRTC capabilities.

## Enterprise Video Architecture
- **SFU (Selective Forwarding Unit)**: Scalable media distribution for 1000+ participants with load balancing.
- **Adaptive Bitrate**: AI-driven quality optimization based on real-time network conditions.
- **Audio Processing**: Professional pipeline with ML-based noise suppression and echo cancellation.
- **Network Resilience**: TURN servers, packet loss recovery, and multi-path optimization.
- **Recording System**: Server-side recording with multi-stream composition and cloud storage.
- **Real-time Analytics**: Performance monitoring and quality adaptation with comprehensive metrics.

## Backend Architecture
- **Framework**: Pure Supabase Backend-as-a-Service (BaaS) – no custom Express server.
- **Authentication**: Supabase Auth with JWT tokens and secure session management.
- **Database**: PostgreSQL via Supabase with real-time subscriptions and comprehensive enterprise video schema.
- **API Design**: Direct Supabase client calls from frontend using centralized API utilities with URL and anon key.
- **Enterprise Video**: Direct Supabase API integration for SFU management, recording sessions, network metrics, and participant tracking.
- **Type Safety**: Custom TypeScript interfaces matching Supabase database schema (snake_case).
- **Data Fetching**: TanStack Query for caching and state management.
- **Video Infrastructure**: WebRTC with TURN servers and SFU architecture backed by Supabase database.
- **Deployment**: Vite-only frontend with Replit host configuration.

## Database Design
- **Database**: PostgreSQL via Supabase with real-time capabilities and enterprise video infrastructure.
- **Core Schema**: Comprehensive tables for users, courses, live classes, instructors, attendance, and session storage.
- **Enterprise Video Schema**: Advanced tables for SFU instances, recording sessions, network quality metrics, audio processing events, quality adaptations, performance alerts, and enterprise participant tracking.
- **Integration Method**: Direct Supabase API calls using URL and anon key for all database operations.
- **Features**: User progress tracking, payment status, course enrollment status, attendance records, and comprehensive video analytics.
- **Real-time**: Supabase real-time subscriptions for live features and video conference updates.

## Payment Processing
- **Provider**: Bangladeshi mobile banking (bKash, Nagad, Rocket) for course enrollment payments.
- **Integration**: Local payment methods with manual verification for Nagad/Rocket and automated verification for bKash.
- **Security**: Payment records stored in PostgreSQL with status tracking.

## Authentication & Authorization
- **Provider**: Supabase Auth (previously Replit Auth in development) for user management and authentication.
- **User Management**: Automatic user creation on first login with profile management.
- **Security**: Enhanced login system with rate limiting, secure WebRTC implementation, and robust error handling.

## Localization & Cultural Design
- **Languages**: Primary Bengali interface with Arabic content.
- **Cultural Elements**: Islamic color scheme (green, gold), Arabic typography, and culturally appropriate design patterns.
- **Typography**: Hind Siliguri font for Bengali text with proper Arabic script support.

# External Dependencies

## Core Infrastructure
- **Database**: Supabase (PostgreSQL).
- **Authentication**: Supabase Auth.
- **Hosting**: Replit.

## Payment Services
- **Bangladeshi Mobile Banking**: bKash, Nagad, and Rocket payment gateway integration.

## UI & Design
- **shadcn/ui**: Component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.

## Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Type safety.
- **TanStack Query**: Server state management and caching.