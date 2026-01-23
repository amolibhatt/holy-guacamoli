# Holy GuacAmoli!

## Overview

Holy GuacAmoli! is a multi-game party platform featuring Blitzgrid (5x5 trivia grid game), Sequence Squeeze (multiplayer ordering game), and Double Dip (2-player relationship game). Built for Amoli's birthday. It's built as a full-stack TypeScript application with a React frontend and Express backend.

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
- **Boards**: id, name, description, pointValues (fixed at [10,20,30,40,50])
- **Categories**: id, name, description, imageUrl
- **BoardCategories**: id, boardId, categoryId (junction table linking categories to boards, max 5 per board)
- **Questions**: id, categoryId, question, options (JSONB array), correctAnswer, points (questions belong directly to categories, exactly 5 per category with unique points {10,20,30,40,50})
- Relations defined with Drizzle ORM relations

### Key Design Decisions
1. **Shared Types**: Schema and route definitions in `/shared` folder are used by both frontend and backend, ensuring type safety across the stack
2. **Host Mode**: The app is designed for a host to control the game - questions reveal answers to the host, who then awards/deducts points to contestants
3. **Contestant System**: Managed via React Context (ScoreContext) with add/remove contestants, award/deduct points, and track completed questions
4. **Simplified Category Model**: 1 Category = 1 set of 5 Questions. Categories have exactly 5 questions with unique point values {10,20,30,40,50}. Questions belong directly to categories via categoryId.
5. **Simple Flat Board List**: Boards are displayed in a simple flat list without grouping. Each board can link up to 5 categories.
6. **Multiplayer Game System**: WebSocket-based real-time multiplayer for Sequence Squeeze where players join via room codes.
7. **Animations**: 3D flip card animations for question cells, particle effects for milestones and category completion
8. **Portable Email/Password Auth**: Host authentication uses bcrypt for password hashing and express-session with PostgreSQL store. No external OAuth dependencies - works on any platform.
9. **Relationship Hub**: Double Dip couples game uses a unified tabbed interface (Today/Vault/Journey) with streak tracking, anniversary countdown, progress bars, favorites section, and celebratory confetti.
10. **Sync-Stakes (Weekly Stakes)**: Couples can set weekly stakes with curated rewards/penalties. First completer each day earns 1 point; bonus point for 85%+ compatibility. Atomic SQL prevents race conditions. Weekly winner revealed on Sundays.
11. **Blitzgrid Structure**: Grid = Board (up to 5 categories), Category = 5 Questions (unique point tiers 10/20/30/40/50). A Category is "Active" when it has all 5 point tiers filled. A Grid is "Active" when it has 5 Active Categories. Uses theme="blitzgrid" to distinguish from other boards.

### Recent Changes (January 2026)
- **Simplified Architecture**: Questions now belong directly to categories via categoryId (not boardCategoryId). Each category has exactly 5 questions with unique points {10,20,30,40,50}.
- **Flat Board List**: Removed Shuffle Play, Starter Packs, and My Boards grouping. All boards display in a simple flat list.
- **Strict Category Validation**: Categories require exactly 5 questions with unique points {10,20,30,40,50}. Point collisions are rejected with clear error messages.
- **Removed Source Groups**: Source Group feature (A-E) was removed to simplify the admin interface.
- **Enhanced Mobile Buzzer**: Larger buzzer button (320px), double pulsing rings, improved touch responsiveness with touch-manipulation CSS.
- **React Error Boundary**: App-level error boundary catches render crashes and displays recovery UI with reload/try-again options
- **Global Error Handlers**: Server-side uncaughtException/unhandledRejection handlers with graceful shutdown
- **WebSocket Error Handling**: Added error handlers to prevent connection crashes from taking down the server
- **Unified Party Scoreboard**: Scores persist to the database (gameSessions/sessionPlayers tables) so scores survive disconnects and reconnections. Players can rejoin and see their accumulated scores instantly.
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
- **Buzzkill Removed**: Removed entire Buzzkill trivia game mode to focus on Sequence Squeeze and Double Dip
- **Drag-and-Drop Category Reordering**: Categories can be reordered within a board by dragging category tabs
- **Auto-Save Drafts**: Work-in-progress questions are saved to localStorage per category, cleared on successful save or when all fields are empty
- **Improved Admin Navigation**: Hierarchical sidebar shows categories nested under boards (expandable tree), breadcrumb navigation shows current location (Board > Category), clearer completion indicators at each level
- **Enhanced Admin UX**: Collapsible sidebar with tooltip hover, visual progress bars (color-coded: amber/blue/green), quick-add inline question form, progress dashboard with next actions, improved empty states with action buttons
- **Super Admin Starter Packs**: Super admin can promote any complete grid to "starter pack" status via toggle in SuperAdmin > All Grids tab. Starter packs are automatically copied to new users on signup, giving them ready-to-play content. Uses isStarterPack boolean on boards table.
- **Fun Interactive Themes**: 9 playful themes (Sports, Birthday, Beach, Office, Dogs, Cats, Space, Music, Nature) each with animated floating elements - trophies, balloons, waves, paw prints, stars, music notes, trees, etc. Theme elements animate continuously during gameplay.
- **Excel Import/Export**: Blitzgrid grids can be exported to and imported from Excel (.xlsx) files. Template includes sample data and instructions sheet. Row-based format with columns: Grid Name, Grid Description, Category Name, Category Description, Points, Question, Answer, Options (pipe-delimited), Image URL, Audio URL, Video URL.

### Known Security Notes
- **Express v4 Vulnerabilities**: npm audit shows 3 HIGH severity vulnerabilities in express/qs/body-parser. Express v5 upgrade was attempted but reverted due to breaking changes in path-to-regexp (route syntax like `:param(*)` no longer works). Will revisit when upstream compatibility improves.

### Planned Features (Schema Ready, UI Pending)
- **Mirror Mechanic**: Prediction phase for multiple choice questions (questionType, options, prediction fields)
- **Time Capsule**: Future-locked questions that unlock after specified days (isFutureLocked, unlockAfterDays fields)
- **AI Debrief**: Gap analysis when partners have significantly different answers

### WebSocket Architecture
- **Server**: WebSocket for real-time multiplayer game communication
- **Sequence Squeeze**: Players join rooms and participate in ordering challenges in real-time
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