# GTM Newsletter Intelligence App - PRD

## Original Problem Statement
Build a full-stack web application called "GTM Intelligence" that automates the creation of premium Go-To-Market (GTM) newsletters. The system uses a multi-agent architecture with 6 AI agents running sequentially via API calls to OpenAI (GPT-5.2) and Anthropic (Claude Sonnet 4.6).

## Architecture
- **Frontend**: React 19 with Tailwind CSS, shadcn/ui components
- **Backend**: FastAPI with MongoDB
- **AI Integration**: Emergent LLM integration library (supports GPT-5.2 and Claude Sonnet 4.6)
- **Database**: MongoDB for newsletters, agent runs, settings, and custom prompts

## User Personas
1. **GTM Practitioners** - Account Executives and Sales Managers who need weekly intelligence newsletters
2. **Marketing Teams** - Teams tracking competitor tool releases and market trends

## Core Requirements (Static)
- 6-agent AI pipeline with customizable prompts
- Real-time pipeline monitoring with status updates
- Newsletter creation with date range selection
- Reference previous newsletters to avoid duplication
- HTML email preview with download/copy functionality
- Configurable monitored tools list

## Agent Pipeline Flow (Updated Feb 26, 2026)
```
Scout (standalone) ──┐
                     ├──► Sage ──► Nexus ──► Language ──► HTML
Tracker (standalone) ┘         ↑           ↑            ↑
                               │           │            │
                    Scout+Tracker    Scout+Tracker+Sage   Language+Scout+Tracker+Sage
```

## What's Been Implemented

### Backend
- [x] MongoDB models for Newsletter, AgentRun, Settings, AgentPrompt
- [x] Full CRUD endpoints for newsletters
- [x] Pipeline execution with all 6 agents
- [x] Retry logic for transient API failures
- [x] Stats endpoint for dashboard metrics
- [x] Settings management for monitored tools
- [x] **Agent Prompts API** - CRUD for custom prompts per agent
- [x] **Custom prompt support** - Pipeline uses custom prompts when saved

### Frontend
- [x] Dark sidebar layout with navigation
- [x] Dashboard with stats cards and newsletter table
- [x] New Newsletter form with date picker and reference selection
- [x] Pipeline View with expandable agent cards
- [x] Real-time status updates (polling every 3 seconds)
- [x] HTML Preview page with tabs (Preview/Raw HTML)
- [x] **Settings page with Agent Prompts editor**
- [x] **Pipeline flow diagram visualization**
- [x] **Collapsible prompt editors with variable badges**
- [x] **Save/Reset prompt functionality**

### Agent Pipeline with Input Chain
1. **Scout** (GPT-5.2) - Tool Search Agent - Standalone
2. **Tracker** (GPT-5.2) - Release Search Agent - Standalone
3. **Sage** (Claude Sonnet 4.6) - Trend Analysis - Inputs: Scout + Tracker
4. **Nexus** (Claude Sonnet 4.6) - Newsletter Assembler - Inputs: Scout + Tracker + Sage
5. **Language** (GPT-5.2) - Language Analyser - Inputs: Nexus
6. **HTML** (GPT-5.2) - HTML Converter - Inputs: Language + Scout + Tracker + Sage

## Prioritized Backlog

### P0 (Critical)
- All implemented

### P1 (High Priority)
- [ ] Email sending integration (Resend/Nodemailer)
- [ ] User authentication
- [ ] Edit agent output before passing to next agent
- [ ] Version history for agent re-runs

### P2 (Medium Priority)
- [ ] Newsletter export as JSON
- [ ] Duplicate newsletter functionality
- [ ] Streaming text output during generation

### P3 (Low Priority)
- [ ] Newsletter templates
- [ ] Scheduled newsletter generation
- [ ] Multi-user support with teams
- [ ] Analytics dashboard

## Next Tasks
1. Add email integration (Resend) to send final HTML newsletters
2. Implement user authentication
3. Add inline editing for agent outputs
