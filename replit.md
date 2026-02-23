# Holy GuacAmoli!

## Overview
Holy GuacAmoli! is a multi-game party platform built for Amoli's birthday, featuring BlitzGrid (a 5x5 trivia grid game) and Sort Circuit (a multiplayer ordering game). The project aims to provide engaging, real-time interactive game experiences with a focus on a unique pastel aesthetic and host-controlled gameplay. It is a full-stack TypeScript application with a React frontend and an Express.js backend. The platform also includes a guest-first player profile system with personality traits and badges, and a new "Meme No Harm" game integrating live GIPHY search.

## User Preferences
Preferred communication style: Simple, everyday language.

### Design Preferences
- **Pastel Aesthetic**: User strongly prefers soft pastel colors with multi-color gradients (rose→pink→fuchsia for BlitzGrid, emerald→teal→cyan for Sort Circuit, violet→purple→indigo for PsyOp)
- **Decorative Elements**: Semi-circle shapes in card corners, layered gradients, soft shadows
- **Dark Theme Only**: App uses a permanent dark arcade theme for neon glow effects
- **Footer Branding**: "made with ♥ by Amoli" using Heart icon (not emoji) with pastel gradient on name
- **Emojis**: User likes emojis - keep emoji avatars and emoji usage in the app

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, React Context for local state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth transitions and interactions
- **Build Tool**: Vite with path aliases

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Pattern**: REST API with typed routes defined in shared/routes.ts
- **Validation**: Zod schemas for request/response validation
- **Storage Layer**: DatabaseStorage class implementing IStorage interface for data access

### Data Model
- **Core Entities**: Boards, Categories, Questions (with options, correctAnswer, points).
- **Relationships**: Boards link up to 5 categories; each category contains exactly 5 questions with unique point values {10, 20, 30, 40, 50}.
- **Game-specific Models**: Player profiles, game stats, badges.

### Key Design Decisions
1.  **Shared Types**: Schema and route definitions in a `/shared` folder ensure type safety across frontend and backend.
2.  **Host Mode**: Games are controlled by a host who manages questions, answers, and scoring.
3.  **Real-time Multiplayer**: WebSocket-based real-time communication for games like Sort Circuit and Meme No Harm.
4.  **Portable Email/Password Auth**: Host authentication uses bcrypt for password hashing and express-session with PostgreSQL store, without external OAuth.
5.  **Simplified Content Structure**: Categories are simplified to contain exactly 5 questions with specific point values. Boards are displayed in a flat list.
6.  **Player Profile System**: Guest-first gameplay with optional profile conversion, personality traits, and a badge system based on gameplay behavior.
7.  **Role-Based Access Control (RBAC)**: Three-tier role system (User, Admin, Super Admin) with comprehensive security measures for route protection and privilege management.
8.  **Theming**: 9 interactive themes with animated elements for dynamic gameplay visuals.
9.  **Admin and Super Admin Features**: Enhanced admin UX with hierarchical navigation, visual progress indicators, auto-save drafts, and a simplified Super Admin Dashboard for platform management, content moderation, user activity tracking, and announcements. All game admin pages include creator analytics showing sessions, completions, player counts, and popular categories/questions per game.
10. **Game Mechanics**: BlitzGrid uses a Board-Category-Question structure. Sort Circuit involves real-time ordering. Meme No Harm integrates live GIPHY search, player submissions, and voting. PsyOp features streak tracking for consecutive successful lies/truths.

## External Dependencies

### Database
-   **PostgreSQL**: Primary data store.
-   **Drizzle ORM**: For database schema management and querying.
-   **connect-pg-simple**: For storing Express sessions in PostgreSQL.

### Authentication
-   **bcryptjs**: Password hashing.
-   **express-session**: Session management.

### Frontend Libraries
-   **@tanstack/react-query**: Data fetching and caching.
-   **framer-motion**: UI animations.
-   **canvas-confetti**: Celebration effects.
-   **lucide-react**: Icons.
-   **Radix UI primitives**: Accessible UI components (via shadcn/ui).

### Testing
-   **Vitest**: Test runner (vitest.config.ts at root, tests in `server/**/*.test.ts`).
-   **server/gameLogic.ts**: Extracted pure game logic functions (buzz queue, score validation, game stats, leaderboard, game end/reset) for testability.
-   **server/gameLogic.test.ts**: 39 unit tests for pure state logic.
-   **server/blitzgrid-ws.test.ts**: 23 WebSocket integration tests (real server, real WS clients).
-   Run all tests: `npx vitest run`

### Development Tools
-   **Vite**: Frontend build tool and development server.
-   **esbuild**: Server bundling for production.
-   **drizzle-kit**: Database schema management.

### Third-Party Integrations
-   **GIPHY API**: Integrated via a proxy for real-time GIF search in the "Meme No Harm" game.