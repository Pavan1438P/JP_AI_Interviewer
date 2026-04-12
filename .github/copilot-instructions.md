# JP_AI_Interviewer workspace instructions

This repository is a Next.js 15 application for an AI-powered interview assistant. The app uses React + TypeScript + Tailwind CSS, Supabase authentication, and AI model integrations via server API routes.

## Project overview

- `app/` contains the Next.js App Router routes and server API endpoints.
- `components/` contains reusable UI components (`components/ui/`) and page-specific view components (`components/views/`).
- `lib/` contains application logic for AI services, Supabase client setup, rate limiting, and shared utilities.
- `app/api/` contains backend routes for interview chat, help chat, text-to-speech, and third-party model tests.
- `app/auth/` contains login and signup pages.

## Key architecture details

- `app/page.tsx` renders the main app shell and switches views using client-side state.
- `app/api/interview/route.ts` is the most important backend route for interview sessions. It includes request validation, rate limiting, auth checks, and model selection logic.
- Shared UI components are built as composable primitives in `components/ui/` and should be reused rather than recreating new base components.
- Styles are managed through Tailwind CSS with the app-level CSS imported in `app/globals.css`.

## Common tasks

- Install dependencies: `npm install`
- Run development server: `npm run dev`
- Build for production: `npm run build`
- Start production server: `npm start`
- Lint project: `npm run lint`

## Environment and secrets

The app depends on runtime environment variables for AI and Supabase services.

- `GOOGLE_API_KEY`
- `ANTHROPIC_API_KEY`
- Supabase auth/database configuration values used by `lib/supabase/server.ts`

Do not hardcode API keys or sensitive data in source files.

## Conventions

- Use TypeScript and keep component props typed.
- Use path aliases from `@/` for project imports.
- Use `use client` only for files that require client-side React state or browser-only APIs.
- Keep backend logic in server routes and helpers under `lib/` rather than in UI components.
- Preserve existing patterns for shared components and avoid duplicating UI primitives.

## Guidance for reviewers and contributors

- When editing API routes, maintain request size checks, auth validation, and proper JSON/error responses.
- For AI-related endpoints, preserve rate limiting behavior and safe handling of model keys.
- For UI changes, reuse existing design system components in `components/ui/` where possible.

## Example prompts for the project

- "Help me extend `app/api/interview/route.ts` to support a new interview prompt type."
- "Refactor the job list view to use the existing `Card` component and improve accessibility."
- "Add a new authenticated settings route under `app/` that uses the current Supabase auth flow."
