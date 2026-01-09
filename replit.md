# QuizMaster

## Overview

QuizMaster is a Jeopardy-style quiz game application designed for live hosting scenarios. The app features a game board with categories and point values (10-100), contestant management with score tracking, and an admin panel for managing quiz content. It's built as a full-stack TypeScript application with a React frontend and Express backend.

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
- **Categories**: id, name, description, imageUrl, boardId (FK to boards)
- **Questions**: id, categoryId, question, options (JSONB array), correctAnswer, points (10-100)
- Relations defined with Drizzle ORM relations

### Key Design Decisions
1. **Shared Types**: Schema and route definitions in `/shared` folder are used by both frontend and backend, ensuring type safety across the stack
2. **Host Mode**: The app is designed for a host to control the game - questions reveal answers to the host, who then awards/deducts points to contestants
3. **Contestant System**: Managed via React Context (ScoreContext) with add/remove contestants, award/deduct points, and track completed questions
4. **Multiple Boards**: Supports multiple game boards, each with its own set of categories and custom point values (e.g., Board 1: 10-50 pts, Board 2: 60-100 pts). Categories are assigned to boards, and only the board's point values are shown when playing.
5. **Multiplayer Buzzer System**: WebSocket-based real-time buzzer where players join via QR code on their phones (/play route). Buzzers auto-unlock when questions open and auto-lock when closed.
6. **Animations**: 3D flip card animations for question cells, particle effects for milestones and category completion

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
- **connect-pg-simple**: Session storage (available but sessions not currently implemented)

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