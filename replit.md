# Holy GuacAmoli!

## Overview

Holy GuacAmoli! is a Jeopardy-style quiz game application designed for live hosting scenarios, created for Amoli's birthday. The app features a game board with categories and point values (10-100), contestant management with score tracking, and an admin panel for managing quiz content. It's built as a full-stack TypeScript application with a React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, React Context for local state (ScoreContext for game state)
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth transitions and interactions
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared for shared)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Pattern**: REST API with typed routes defined in shared/routes.ts
- **Validation**: Zod schemas for request/response validation
- **Storage Layer**: DatabaseStorage class implementing IStorage interface for data access

### Data Model
- **Boards**: id, name, description, pointValues (JSONB array of numbers)
- **Categories**: id, name, description, imageUrl (global templates that can be reused across boards)
- **BoardCategories**: id, boardId, categoryId (junction table linking categories to boards - same category can be on multiple boards)
- **Questions**: id, boardCategoryId, question, options (JSONB array), correctAnswer, points (questions belong to a specific board-category pair, auto-sorted by points)
- Relations defined with Drizzle ORM relations

### Key Design Decisions
1. **Shared Types**: Schema and route definitions in `/shared` folder are used by both frontend and backend, ensuring type safety across the stack
2. **Host Mode**: The app is designed for a host to control the game - questions reveal answers to the host, who then awards/deducts points to contestants
3. **Contestant System**: Managed via React Context (ScoreContext) with add/remove contestants, award/deduct points, and track completed questions
4. **Reusable Categories**: Categories are global templates. The same category (e.g., "Anagrammed Countries") can be linked to multiple boards, with each board having its own unique set of questions for that category.
5. **Multiple Boards**: Supports multiple game boards, each with its own set of linked categories and custom point values (e.g., Board 1: 10-50 pts, Board 2: 60-100 pts). Questions are automatically ordered by point value.
6. **Multiplayer Buzzer System**: WebSocket-based real-time buzzer where players join via QR code on their phones (/play route). Buzzers auto-unlock when questions open and auto-lock when closed.
7. **Animations**: 3D flip card animations for question cells, particle effects for milestones and category completion
8. **Portable Email/Password Auth**: Host authentication uses bcrypt for password hashing and express-session with PostgreSQL store. No external OAuth dependencies - works on any platform.
9. **Relationship Hub**: Double Dip couples game uses a unified tabbed interface (Today/Vault/Journey) with streak tracking, anniversary countdown, progress bars, favorites section, and celebratory confetti.
10. **Sync-Stakes (Weekly Stakes)**: Couples can set weekly stakes with curated rewards/penalties. First completer each day earns 1 point; bonus point for 85%+ compatibility. Atomic SQL prevents race conditions. Weekly winner revealed on Sundays.

### Recent Changes (January 2026)
- **Source Group Assignment**: Categories can now be assigned to Source Groups (A-E) when created. Admin panel shows group badges on category tabs.
- **Balanced Shuffle Play**: generateDynamicBoard now picks one category from each source group (A-E) for balanced variety. Groups reset independently when exhausted.
- **Enhanced Mobile Buzzer**: Larger buzzer button (320px), double pulsing rings, improved touch responsiveness with touch-manipulation CSS.
- **Starter Pack Export/Import**: Super Admins can export Starter Packs as JSON and import them in production with category deduplication.
- **Smart Category Management**: Buzzkill now supports 5 Source Groups (A-E) with balanced shuffle. "Shuffle Play" generates a mixed board with 1 category from each group, tracking played categories per session and resetting after all are exhausted. "Starter Packs" are pre-made themed boards. "My Boards" shows user-created boards.
- **React Error Boundary**: App-level error boundary catches render crashes and displays recovery UI with reload/try-again options
- **Global Error Handlers**: Server-side uncaughtException/unhandledRejection handlers with graceful shutdown
- **WebSocket Error Handling**: Added error handlers to prevent connection crashes from taking down the server
- **Unified Party Scoreboard**: Scores now persist to the database (gameSessions/sessionPlayers tables) across all games. Both Buzzkill and Sequence Squeeze share the same session, so scores survive disconnects, mode switches, and reconnections. Players can rejoin and see their accumulated scores instantly.
- **Cross-Game Mode Switch**: Host can switch from Buzzkill to Sequence Squeeze while keeping the same room and players. Scores carry over seamlessly.
- **Sequence Squeeze Bulk Import**: Pipe-delimited format for bulk question upload with validation
- **Onboarding Tooltips**: Step-by-step tooltips guide first-time users with analytics tracking (started/completed/skipped)
- **Tab State Persistence**: RelationshipHub remembers active tab via localStorage
- **AI Response Caching**: 1-hour TTL cache with MD5 keys reduces API calls, 100-entry max
- **Code Splitting**: React.lazy loads 9 heavy routes (Admin, RelationshipHub, etc.) for faster initial load
- **Funnel Analytics**: New events for pair invites, stake reveals, AI insights, favorites, onboarding
- **Improved Error Messages**: User-friendly copy like "Couldn't save - check your connection"
- **Login Rate Limiting**: 5 failed attempts triggers 15-minute lockout
- **Vault/Journey Loading States**: Added skeleton loaders for smoother UX
- **Sync-Stakes Backend**: Complete API for weekly stakes with atomic scoring
- **Score Undo Feature**: Hosts can undo last 20 score changes with previousScore tracking for accurate reversals
- **Database Indices**: 12 new indices on Double Dip tables for query optimization
- **Bulk Import Validation**: Enhanced with length limits, board-specific point values, max 50 items per import
- **Analytics Improvements**: Server-side validation, 10% log sampling, event batching
- **AI Fallback**: Rate-limit detection, empty answer handling with 30% scoring
- **Game Slug Rename**: Renamed "grid_of_grudges" slug to "buzzkill" with auto-migration on startup that preserves FK relationships

### Known Security Notes
- **Express v4 Vulnerabilities**: npm audit shows 3 HIGH severity vulnerabilities in express/qs/body-parser. Express v5 upgrade was attempted but reverted due to breaking changes in path-to-regexp (route syntax like `:param(*)` no longer works). Will revisit when upstream compatibility improves.

### Planned Features (Schema Ready, UI Pending)
- **Mirror Mechanic**: Prediction phase for multiple choice questions (questionType, options, prediction fields)
- **Time Capsule**: Future-locked questions that unlock after specified days (isFutureLocked, unlockAfterDays fields)
- **AI Debrief**: Gap analysis when partners have significantly different answers

### WebSocket Architecture
- **Server**: `server/gameRoom.ts` manages rooms, players, and buzz events
- **Host Panel**: `BuzzerPanel.tsx` component in footer for creating rooms and managing buzzers
- **Player Page**: `/play` route for mobile devices to join and buzz in
- **Room Codes**: 4-character alphanumeric codes for easy joining

### Build Process
- Development: Vite dev server with HMR
- Production: esbuild bundles server to dist/index.cjs, Vite builds client to dist/public
- Database migrations via `drizzle-kit push`

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connected via DATABASE_URL environment variable
- **Drizzle ORM**: Schema management and queries
- **connect-pg-simple**: Session storage for host authentication

### Authentication
- **Email/Password Auth**: Portable authentication in server/auth.ts
- **bcryptjs**: Password hashing (10 rounds)
- **express-session**: Session management with PostgreSQL store
- **Host-only**: Only hosts need accounts; players join via QR code without authentication

### Frontend Libraries
- **@tanstack/react-query**: Data fetching and caching
- **framer-motion**: Animations
- **canvas-confetti**: Celebration effects when correct answers given
- **lucide-react**: Icons
- **Radix UI primitives**: Accessible UI components (via shadcn/ui)

### Development Tools
- **Vite**: Frontend build and dev server
- **esbuild**: Server bundling for production
- **drizzle-kit**: Database schema management