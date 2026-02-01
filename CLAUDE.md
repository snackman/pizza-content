# Pizza Content - Claude Instructions

## CRITICAL RULES - READ FIRST

**NEVER implement code directly in the main repo.** ALL implementation MUST go through:
1. A background implementation agent
2. In a separate git worktree
3. With a draft PR for Vercel preview

**NO EXCEPTIONS.** Not even for "small" or "trivial" fixes.

### Pre-Implementation Checklist

Before writing ANY code to `/src`:

- [ ] Is there an approved plan in `/plans/{task-id}.md`?
- [ ] Is the task marked "Doing" in the project sheet?
- [ ] Am I dispatching a background agent with a worktree?

**If ANY answer is NO → STOP and fix before proceeding.**

---

## Project Overview
Pizza Content is a repository platform for pizza-related media (GIFs, memes, viral videos, music). Built with Next.js 14, Supabase, and TailwindCSS.

## Task Management Workflow

### Project Sheet
Tasks are tracked in the project Google Sheet, accessible via the sheets-claude MCP.
- Config: `.sheets-claude.json` contains the sheet URL
- Use `mcp__sheets-claude__get_project_tasks` to list tasks

### Complete Workflow

```
1. GET TASKS      →  Fetch from project sheet
2. PLAN           →  Spawn planning agents (background, parallel)
3. SAVE PLANS     →  Plans saved to plans/{task-id}-{slug}.md
4. REVIEW PLANS   →  Snax and Claude review together
5. START TASK     →  Mark task as "Doing" in sheet before implementing
6. IMPLEMENT      →  Spawn implementation agents on feature branches
7. REVIEW CODE    →  Snax and Claude review changes via Vercel preview
8. MERGE          →  Merge approved PRs to main
9. MARK DONE      →  Update project sheet to "Done"
```

**Important**: Always mark a task as "Doing" in the project sheet before starting implementation work.

### Phase 1: Planning

**Do NOT enter plan mode directly** - spawn background planning agents instead.

```
Task tool:
- subagent_type: "Plan"
- run_in_background: true
- prompt: Include task ID, read codebase, write plan to plans/{task-id}-{slug}.md
```

**Batch planning**: Queue multiple planning agents in parallel for efficiency.

**Plan file format** (`plans/{task-id}-{slug}.md`):
- Task ID and priority
- Problem/feature description
- Database changes needed
- Files to create/modify
- Step-by-step implementation
- Verification steps

### Phase 2: Review Plans

- Claude summarizes each plan for Snax
- Discuss approach, ask clarifying questions
- Approve or adjust plans before implementation

### Presenting Tasks to Snax

**Always include task IDs** when listing or discussing tasks:

```
| Task ID | Task | Priority |
|---------|------|----------|
| spinach-54122 | Pizza Gif Repository | Top |
```

This makes it easy for Snax to refer to specific tasks in conversation.

**When presenting completed implementations**, always show the **Vercel preview URL** (not GitHub PR link):

```
| Task | Preview |
|------|---------|
| diavola-44034: Meme Repository | https://pizza-content-git-feature-diavola-44034-memes-pizza-dao.vercel.app |
```

Snax reviews via Vercel previews, not GitHub.

### Phase 3: Implementation

**Each task gets its own git worktree** for isolated parallel work, with **draft PRs** for Vercel previews.

#### Worktree Setup
```bash
# Agent creates isolated worktree with feature branch
git worktree add ../pizza-content-{task-id} -b feature/{task-id}-{name}
cd ../pizza-content-{task-id}
```

#### Agent Instructions
```
Task tool:
- subagent_type: "general-purpose"
- run_in_background: true
- prompt:
  1. Create worktree: git worktree add ../pizza-content-{task-id} -b feature/{task-id}-{name}
  2. cd into the worktree directory
  3. Read plan from plans/{task-id}.md (copy from main repo if needed)
  4. Implement the approved changes
  5. Commit with descriptive message including task ID
  6. Push branch: git push -u origin feature/{task-id}-{name}
  7. Create draft PR: gh pr create --draft --title "Task ID: Description" --body "..."
  8. Report:
     - PR URL
     - Vercel preview URL: https://pizza-content-git-feature-{task-id}-{name}-pizza-dao.vercel.app
     - Files changed
```

#### Vercel Preview URLs
PRs automatically get Vercel preview deployments:
```
https://pizza-content-git-{branch-name}-pizza-dao.vercel.app
```

Example: `feature/diavola-44034-memes` →
`https://pizza-content-git-feature-diavola-44034-memes-pizza-dao.vercel.app`

#### After Review
```bash
# Merge the PR via GitHub (or locally)
gh pr merge {pr-number} --merge

# Clean up worktree
git worktree remove ../pizza-content-{task-id}
```

**Parallel implementation**: Multiple agents work in separate worktrees simultaneously - no conflicts.

### Phase 4: Review & Merge

For each feature branch:
1. Review the changes with Snax
2. Test via Vercel preview
3. Merge to main
4. Mark task done in project sheet

### Branching Convention

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `feature/{task-id}-{name}` | Individual task implementation |

Example: `feature/calzone-36389-submission-tool`

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend**: Supabase (Postgres, Auth, Storage)
- **Deployment**: Vercel (frontend), Supabase (backend)

## Key Directories
- `src/app/` - Next.js pages and routes
- `src/components/` - Reusable components
- `src/lib/supabase/` - Supabase clients (browser, server, middleware)
- `src/hooks/` - Custom React hooks (useAuth)
- `src/types/` - TypeScript types (database.ts)
- `plans/` - Task implementation plans
- `scripts/` - Utility scripts (migrations, imports)
- `supabase/migrations/` - Database migrations

## Database
- **Project ID**: hecsxlqeviirichoohkl
- **Tables**: profiles, content, content_requests, favorites, view_history
- **Connection**: Use session pooler for migrations

## Content Types
- `gif` - Animated GIFs
- `meme` - Static image memes
- `video` - Video content (external URLs or uploaded)
- `music` - Audio content (planned)

## User Preferences
- **Proactive suggestions**: Instead of asking what to do next, proactively suggest new tasks to work on
- **Vercel previews**: Always show Vercel preview URLs (not GitHub PR links) when presenting completed implementations
