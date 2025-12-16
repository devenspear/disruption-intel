# Parallel Claude Code Development Framework
## Automated Setup & Orchestration System

> **HANDOFF INSTRUCTIONS**: Give this entire document to Claude Code CLI with the command:
> ```bash
> claude "Read PARALLEL_CLAUDE_SETUP.md and execute the setup process for my project"
> ```

---

## Part 1: What This Document Does

This document instructs Claude Code to:
1. Analyze your existing project structure
2. Create a parallel development architecture
3. Set up Git branching infrastructure
4. Generate a master CLAUDE.md coordination file
5. Create agent-specific instruction files
6. Provide you with terminal commands to launch parallel agents

---

## Part 2: Setup Execution Instructions

### For Claude Code Agent Reading This:

Execute these steps in order. Ask the human for input where indicated with `[HUMAN INPUT REQUIRED]`.

### Step 2.1: Project Analysis

```
TASK: Analyze the current project structure

1. Run: find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.vue" -o -name "*.py" | head -100
2. Run: ls -la
3. Run: cat package.json (if exists) OR cat requirements.txt (if Python) OR cat Cargo.toml (if Rust)
4. Identify the framework: Next.js, React, Vue, Svelte, Python/FastAPI, etc.
5. Map the existing directory structure

OUTPUT to human:
- Framework detected
- Current structure summary
- Recommended domain splits for parallel development
```

### Step 2.2: Human Defines Workstreams

```
[HUMAN INPUT REQUIRED]

Ask the human:
"I've analyzed your project. Now I need you to define 2-5 parallel workstreams.

Example workstreams:
1. Authentication & User Management
2. Dashboard & Data Visualization  
3. API & Backend Services
4. Payment & Billing System
5. UI Components & Design System

What are YOUR workstreams for this project? List them with a brief description of each."
```

### Step 2.3: Create Directory Structure

Based on human's workstreams, create/organize directories:

```bash
# Example structure - adapt to human's actual workstreams
mkdir -p src/features/auth
mkdir -p src/features/dashboard
mkdir -p src/features/api
mkdir -p src/features/payments
mkdir -p src/shared/components
mkdir -p src/shared/utils
mkdir -p src/shared/types
mkdir -p src/shared/styles
mkdir -p .claude/agents
```

### Step 2.4: Initialize Git Branching

```bash
# Ensure we're on main and clean
git status
git checkout main 2>/dev/null || git checkout -b main
git add .
git commit -m "chore: prepare for parallel development" --allow-empty

# Create feature branches for each workstream
# [ADAPT TO HUMAN'S WORKSTREAMS]
git branch feature/auth
git branch feature/dashboard
git branch feature/api
git branch feature/payments
```

### Step 2.5: Generate CLAUDE.md Master File

Create this file at project root: `CLAUDE.md`

```markdown
# Project Intelligence File
# This file is read by all Claude Code agents at startup

## Project Overview
[AUTO-FILL: Framework, purpose, tech stack from analysis]

## Architecture
[AUTO-FILL: Directory structure map]

## Parallel Development Protocol

### Active Workstreams
| ID | Name | Branch | Domain Directories | Owner |
|----|------|--------|-------------------|-------|
| A1 | [Workstream 1] | feature/[name] | src/features/[name]/* | Agent 1 |
| A2 | [Workstream 2] | feature/[name] | src/features/[name]/* | Agent 2 |
| A3 | [Workstream 3] | feature/[name] | src/features/[name]/* | Agent 3 |

### Protected Shared Resources
These files/directories require coordination before modification:
- `src/shared/*` - Shared utilities, components, types
- `package.json` / `requirements.txt` - Dependencies
- `.env*` - Environment configuration
- `tsconfig.json` / `vite.config.*` / `next.config.*` - Build configuration
- `src/app/layout.tsx` or equivalent root layout
- `src/styles/globals.css` - Global styles
- Database schema files

### Coordination Protocol
1. **Before modifying protected resources**: Stop and inform the human coordinator
2. **Need a new dependency?**: Request it, don't add it directly
3. **Need a shared type/interface?**: Propose it for `src/shared/types/`
4. **Found a bug in another domain?**: Report it, don't fix it directly

### Interface Contracts
[AUTO-FILL based on workstreams - define how domains communicate]

Example:
```typescript
// Auth domain exposes:
export { useAuth, login, logout, isAuthenticated } from '@/features/auth'
export type { User, Session, AuthState } from '@/features/auth/types'

// API domain exposes:
export { apiClient, useQuery, useMutation } from '@/features/api'
export type { ApiResponse, ApiError } from '@/features/api/types'
```

### Git Workflow
- Each agent works ONLY on their assigned branch
- Commit frequently with descriptive messages
- Before starting work: `git pull origin main && git merge main`
- Never force push
- Never modify files outside your domain without coordination

### Code Standards
[AUTO-FILL or ask human for preferences]
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Component naming: PascalCase
- File naming: kebab-case

## Commands Reference
```bash
# Sync with main (do this before starting work)
git fetch origin && git merge origin/main

# Save progress
git add . && git commit -m "feat(domain): description"

# Push to remote
git push origin [your-branch]

# Check branch status
git status && git branch --show-current
```

## Current Session State
Last updated: [TIMESTAMP]
Active agents: [LIST]
Recent merges: [LIST]
Pending coordination: [LIST]
```

### Step 2.6: Generate Agent-Specific Instruction Files

Create individual files in `.claude/agents/`:

**Template: `.claude/agents/AGENT_[NAME].md`**

```markdown
# Agent Mission Brief: [WORKSTREAM NAME]
Branch: feature/[branch-name]
Domain: src/features/[domain]/*

## Your Scope

### Files You OWN (Create/Modify/Delete Freely)
- src/features/[domain]/**/*
- src/features/[domain]/components/*
- src/features/[domain]/hooks/*
- src/features/[domain]/services/*
- src/features/[domain]/types.ts
- src/features/[domain]/index.ts (barrel export)

### Files You May READ (But Not Modify)
- src/shared/**/* (import allowed)
- Other feature domains (import their public API only)
- Configuration files

### Files That Are OFF-LIMITS
- Any file outside your domain directories
- package.json (request dependency additions)
- Shared configuration files
- Other agents' feature directories

## Your Responsibilities
[CUSTOMIZE PER WORKSTREAM]

## Dependencies on Other Domains
[CUSTOMIZE - what this agent needs from others]

## What You Expose to Other Domains
[CUSTOMIZE - public API this agent provides]

## Startup Checklist
1. [ ] Confirm you're on branch: feature/[branch-name]
2. [ ] Pull latest: git fetch origin && git merge origin/main
3. [ ] Review recent changes: git log --oneline -10
4. [ ] Check for coordination notes in CLAUDE.md

## If You Need Something Outside Your Domain
STOP and tell the human:
"I need to [action] in [file/area] which is outside my domain.
Reason: [why]
Proposed change: [what specifically]
Please coordinate this with the appropriate agent or make this change in the main branch."
```

### Step 2.7: Create Launch Script

Create: `launch-parallel-dev.sh`

```bash
#!/bin/bash
# Parallel Claude Code Development Launcher
# Usage: ./launch-parallel-dev.sh

PROJECT_DIR=$(pwd)
PROJECT_NAME=$(basename $PROJECT_DIR)

echo "🚀 Parallel Claude Code Development Launcher"
echo "Project: $PROJECT_NAME"
echo "==========================================="
echo ""

# Check Git status
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "Consider committing before launching parallel agents"
    echo ""
fi

echo "📋 Available Workstreams:"
echo ""

# List branches that start with 'feature/'
BRANCHES=$(git branch | grep 'feature/' | sed 's/*//' | sed 's/ //g')
COUNT=1
for BRANCH in $BRANCHES; do
    echo "  $COUNT. $BRANCH"
    COUNT=$((COUNT+1))
done

echo ""
echo "==========================================="
echo "🖥️  TERMINAL COMMANDS FOR EACH AGENT"
echo "==========================================="
echo ""

for BRANCH in $BRANCHES; do
    AGENT_NAME=$(echo $BRANCH | sed 's/feature\///' | tr '-' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')
    AGENT_FILE=".claude/agents/AGENT_$(echo $BRANCH | sed 's/feature\///' | tr '-' '_' | tr '[:lower:]' '[:upper:]').md"
    
    echo "--- Agent: $AGENT_NAME ---"
    echo "Open a new terminal tab and run:"
    echo ""
    echo "  cd $PROJECT_DIR && git checkout $BRANCH && claude"
    echo ""
    echo "Then paste this prompt:"
    echo ""
    echo "  Read CLAUDE.md and .claude/agents/$(basename $AGENT_FILE) for your mission brief."
    echo "  Confirm your branch and domain before starting work."
    echo ""
    echo ""
done

echo "==========================================="
echo "📍 COORDINATOR TERMINAL (Keep this one)"
echo "==========================================="
echo "Stay on main branch for:"
echo "  - Merging completed features"
echo "  - Resolving conflicts"
echo "  - Coordinating shared file changes"
echo "  - Monitoring overall progress"
echo ""
echo "Useful commands:"
echo "  git branch -a                    # See all branches"
echo "  git log --oneline --graph --all  # Visual branch history"
echo "  git diff main..feature/xxx       # Compare branches"
echo ""
```

Make it executable:
```bash
chmod +x launch-parallel-dev.sh
```

### Step 2.8: Create Merge Helper Script

Create: `merge-feature.sh`

```bash
#!/bin/bash
# Feature Branch Merge Helper
# Usage: ./merge-feature.sh feature/branch-name

if [ -z "$1" ]; then
    echo "Usage: ./merge-feature.sh feature/branch-name"
    echo ""
    echo "Available feature branches:"
    git branch | grep 'feature/'
    exit 1
fi

BRANCH=$1

echo "🔀 Merging $BRANCH into main"
echo ""

# Ensure we're on main
git checkout main
git pull origin main

# Check for conflicts
echo "Checking for conflicts..."
git merge --no-commit --no-ff $BRANCH

if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Merge conflicts detected!"
    echo "Resolve conflicts, then run:"
    echo "  git add ."
    echo "  git commit -m 'merge: $BRANCH into main'"
    exit 1
fi

# If no conflicts, complete the merge
git commit -m "merge: $BRANCH into main"
echo ""
echo "✅ Successfully merged $BRANCH into main"
echo ""

# Prompt to update other branches
echo "📢 Remember to update other active branches:"
OTHER_BRANCHES=$(git branch | grep 'feature/' | grep -v $BRANCH | sed 's/*//' | sed 's/ //g')
for OTHER in $OTHER_BRANCHES; do
    echo "  git checkout $OTHER && git merge main"
done
```

Make executable:
```bash
chmod +x merge-feature.sh
```

---

## Part 3: Post-Setup Human Instructions

### After Claude Code Completes Setup:

#### 1. Launch Parallel Agents

Run the launch script to see commands:
```bash
./launch-parallel-dev.sh
```

Then open multiple Warp tabs and run the displayed commands.

#### 2. Agent Startup Prompt

When you start each Claude Code session, paste:

```
Read CLAUDE.md for project context and coordination rules.
Read your agent mission brief in .claude/agents/AGENT_[YOUR_DOMAIN].md
Confirm:
1. What branch am I on?
2. What is my domain scope?
3. What files am I NOT allowed to touch?

Then wait for my instructions on what to build.
```

#### 3. Coordination Commands

**To merge a completed feature:**
```bash
./merge-feature.sh feature/branch-name
```

**To sync an agent with latest main:**
In that agent's terminal:
```
Run: git fetch origin && git merge origin/main
Report any conflicts to me.
```

**To check overall status:**
```bash
# See branch divergence
git log --oneline --graph --all

# See what files each branch modified
git diff --stat main..feature/branch-name
```

#### 4. Handling Shared Resource Requests

When an agent says "I need to modify X shared file":

1. Note which agent needs it
2. Have them describe the exact change
3. Either:
   - Make the change yourself on main and have all agents merge
   - Designate one agent to make it, merge their branch first, then sync others

---

## Part 4: CLAUDE.md Best Practices

### Yes, This Should Be in CLAUDE.md

The CLAUDE.md file at your project root is read by every Claude Code session. Include:

1. **Project context** - What is this? What stack?
2. **Architecture map** - Directory structure and purpose
3. **Parallel dev protocol** - When running multiple agents
4. **Coding standards** - Your preferences
5. **Important constraints** - What to avoid, dependencies, etc.

### CLAUDE.md Template

```markdown
# CLAUDE.md - Project Intelligence

## Overview
[One paragraph: what this project is]

## Tech Stack
- Framework: [Next.js 14 / React / Vue / etc]
- Language: [TypeScript / Python / etc]
- Database: [Postgres / MongoDB / etc]
- Styling: [Tailwind / CSS Modules / etc]
- Deployment: [Vercel / AWS / etc]

## Architecture
```
src/
├── features/     # Domain-specific code (parallel-safe)
│   ├── auth/
│   ├── dashboard/
│   └── [domain]/
├── shared/       # PROTECTED - coordinate changes
│   ├── components/
│   ├── utils/
│   └── types/
└── app/          # PROTECTED - routing/layout
```

## Parallel Development (When Active)

### Current Agents
| Branch | Domain | Status |
|--------|--------|--------|
| feature/xxx | src/features/xxx | [Active/Paused/Merged] |

### Protected Files
Changes require coordination:
- package.json
- src/shared/*
- Configuration files
- Database schemas

### Coordination Rules
1. Stay in your domain
2. Request shared changes, don't make them
3. Sync with main every few hours
4. Commit frequently

## Code Patterns
[Your preferred patterns, component structure, etc.]

## Known Issues / Tech Debt
[List anything agents should be aware of]

## External Resources
[Links to designs, APIs, documentation]
```

---

## Part 5: Troubleshooting

### "Merge conflict in [file]"
1. Open the file, look for `<<<<<<<` markers
2. Decide which version to keep (or combine)
3. Remove the conflict markers
4. `git add [file] && git commit`

### "Agent modified a file outside their domain"
1. `git checkout main -- path/to/file` to restore
2. Re-brief the agent on their scope

### "Need to add a dependency"
1. Pause all agents
2. On main: add the dependency
3. Commit and push main
4. All agents: `git merge origin/main`
5. Resume work

### "Agents are too far out of sync"
1. Pause all agents
2. Merge the most complete feature to main
3. Have all other agents merge from main
4. Resume work

---

## Part 6: Execute Setup Now

**Claude Code: Execute the above setup steps now.**

Begin with Step 2.1 (Project Analysis) and proceed through all steps, asking for human input where indicated.

When complete, inform the human:
1. What was created
2. How to launch parallel agents
3. Any manual steps they need to take
