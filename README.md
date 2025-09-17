# Bemo Learning Engine

Adaptive learning platform for Pre-K to Grade 1 with spaced repetition and hierarchical mastery.

## Stack

- **Monorepo**: Turborepo + Bun workspaces
- **API**: Hono + Bun runtime
- **Web**: Next.js 15 + Tailwind v4
- **Database**: Supabase (PostgreSQL) + Drizzle ORM
- **Auth**: Better-Auth
- **Type Safety**: Zod + TypeScript

## Quick Start

1. **Install dependencies**:
```bash
bun install
```

2. **Set up environment**:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. **Run database migrations**:
```bash
bun run db:generate
bun run db:push
```

4. **Start development**:
```bash
bun run dev
```

This will start:
- API server at http://localhost:8000
- Web app at http://localhost:3000
- API docs at http://localhost:8000/swagger

## Project Structure

```
├── apps/
│   ├── api/        # Hono API server
│   └── web/        # Next.js web app
├── packages/
│   ├── auth/       # Better-Auth configuration
│   ├── db/         # Database schema & migrations
│   ├── engine/     # Learning algorithms
│   ├── curriculum/ # Content & seed data
│   ├── schemas/    # Zod schemas
│   ├── api-client/ # Typed API client
│   └── utils/      # Shared utilities
```

## Scripts

- `bun run dev` - Start all apps in development
- `bun run build` - Build all apps and packages
- `bun run typecheck` - Type check all packages
- `bun run lint` - Lint with Biome
- `bun run format` - Format with Biome

## API Documentation

- Swagger UI: http://localhost:8000/swagger
- Scalar Reference: http://localhost:8000/reference
- OpenAPI JSON: http://localhost:8000/doc