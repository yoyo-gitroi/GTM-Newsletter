from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class Newsletter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    date_range: str
    status: str = "draft"  # draft, running, completed, failed
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    # Agent outputs
    tool_search_output: Optional[str] = None
    release_search_output: Optional[str] = None
    trend_analysis_output: Optional[str] = None
    assembled_newsletter: Optional[str] = None
    language_refined_output: Optional[str] = None
    html_output: Optional[str] = None
    
    # Metadata
    tools_found: Optional[int] = None
    releases_found: Optional[int] = None
    patterns_found: Optional[int] = None
    
    # Reference newsletter
    reference_newsletter_id: Optional[str] = None
    custom_instructions: Optional[str] = None

class NewsletterCreate(BaseModel):
    title: str
    date_range: str
    reference_newsletter_id: Optional[str] = None
    custom_instructions: Optional[str] = None

class AgentRun(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    newsletter_id: str
    agent_name: str  # scout, tracker, sage, nexus, language, html
    status: str = "pending"  # pending, running, completed, failed
    input_data: Optional[str] = None
    output: Optional[str] = None
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    tokens_used: Optional[int] = None
    model: Optional[str] = None
    duration: Optional[int] = None

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = "default"
    monitored_tools: str = "Bitscale,Clay,Apollo,Amplemarket,UnifyGTM,HubSpot,SyftData,N8n,Relevance AI,Dust.tt,Crew.ai"

class SettingsUpdate(BaseModel):
    monitored_tools: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def serialize_doc(doc: dict) -> dict:
    """Remove MongoDB _id and ensure serializable"""
    if doc and '_id' in doc:
        del doc['_id']
    return doc

# ==================== NEWSLETTER ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "GTM Newsletter Intelligence API"}

@api_router.post("/newsletters", response_model=Newsletter)
async def create_newsletter(input_data: NewsletterCreate):
    newsletter = Newsletter(
        title=input_data.title,
        date_range=input_data.date_range,
        reference_newsletter_id=input_data.reference_newsletter_id,
        custom_instructions=input_data.custom_instructions
    )
    doc = newsletter.model_dump()
    await db.newsletters.insert_one(doc)
    return newsletter

@api_router.get("/newsletters", response_model=List[Newsletter])
async def get_newsletters():
    newsletters = await db.newsletters.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return newsletters

@api_router.get("/newsletters/{newsletter_id}", response_model=Newsletter)
async def get_newsletter(newsletter_id: str):
    newsletter = await db.newsletters.find_one({"id": newsletter_id}, {"_id": 0})
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    return newsletter

@api_router.put("/newsletters/{newsletter_id}", response_model=Newsletter)
async def update_newsletter(newsletter_id: str, updates: Dict[str, Any]):
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.newsletters.update_one({"id": newsletter_id}, {"$set": updates})
    newsletter = await db.newsletters.find_one({"id": newsletter_id}, {"_id": 0})
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    return newsletter

@api_router.delete("/newsletters/{newsletter_id}")
async def delete_newsletter(newsletter_id: str):
    result = await db.newsletters.delete_one({"id": newsletter_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    # Also delete associated agent runs
    await db.agent_runs.delete_many({"newsletter_id": newsletter_id})
    return {"message": "Newsletter deleted"}

# ==================== AGENT RUN ENDPOINTS ====================

@api_router.get("/newsletters/{newsletter_id}/runs", response_model=List[AgentRun])
async def get_agent_runs(newsletter_id: str):
    runs = await db.agent_runs.find({"newsletter_id": newsletter_id}, {"_id": 0}).to_list(100)
    return runs

@api_router.get("/newsletters/{newsletter_id}/runs/{agent_name}", response_model=AgentRun)
async def get_agent_run(newsletter_id: str, agent_name: str):
    run = await db.agent_runs.find_one(
        {"newsletter_id": newsletter_id, "agent_name": agent_name}, 
        {"_id": 0}
    )
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return run

# ==================== SETTINGS ENDPOINTS ====================

@api_router.get("/settings", response_model=Settings)
async def get_settings():
    settings = await db.settings.find_one({"id": "default"}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = Settings()
        await db.settings.insert_one(default_settings.model_dump())
        return default_settings
    return settings

@api_router.put("/settings", response_model=Settings)
async def update_settings(updates: SettingsUpdate):
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_dict:
        await db.settings.update_one(
            {"id": "default"}, 
            {"$set": update_dict},
            upsert=True
        )
    settings = await db.settings.find_one({"id": "default"}, {"_id": 0})
    return settings

# ==================== PIPELINE EXECUTION ====================

# Store active pipelines for status updates
active_pipelines: Dict[str, Dict] = {}

@api_router.post("/newsletters/{newsletter_id}/run")
async def run_pipeline(newsletter_id: str, background_tasks: BackgroundTasks, start_from: Optional[str] = None):
    """Start the newsletter pipeline execution"""
    newsletter = await db.newsletters.find_one({"id": newsletter_id}, {"_id": 0})
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    
    # Update newsletter status
    await db.newsletters.update_one(
        {"id": newsletter_id},
        {"$set": {"status": "running", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Initialize pipeline tracking
    active_pipelines[newsletter_id] = {"status": "running", "current_agent": None}
    
    # Run pipeline in background
    background_tasks.add_task(execute_pipeline, newsletter_id, start_from)
    
    return {"message": "Pipeline started", "newsletter_id": newsletter_id}

@api_router.post("/newsletters/{newsletter_id}/rerun/{agent_name}")
async def rerun_agent(newsletter_id: str, agent_name: str, background_tasks: BackgroundTasks):
    """Re-run a specific agent and all subsequent agents"""
    newsletter = await db.newsletters.find_one({"id": newsletter_id}, {"_id": 0})
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    
    # Update newsletter status
    await db.newsletters.update_one(
        {"id": newsletter_id},
        {"$set": {"status": "running", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Initialize pipeline tracking
    active_pipelines[newsletter_id] = {"status": "running", "current_agent": None}
    
    # Run pipeline from specific agent
    background_tasks.add_task(execute_pipeline, newsletter_id, agent_name)
    
    return {"message": f"Pipeline restarting from {agent_name}", "newsletter_id": newsletter_id}

@api_router.get("/newsletters/{newsletter_id}/status")
async def get_pipeline_status(newsletter_id: str):
    """Get current pipeline execution status"""
    newsletter = await db.newsletters.find_one({"id": newsletter_id}, {"_id": 0})
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    
    runs = await db.agent_runs.find({"newsletter_id": newsletter_id}, {"_id": 0}).to_list(100)
    
    return {
        "newsletter_status": newsletter.get("status"),
        "current_agent": active_pipelines.get(newsletter_id, {}).get("current_agent"),
        "runs": runs
    }

# ==================== AGENT IMPLEMENTATIONS ====================

async def execute_pipeline(newsletter_id: str, start_from: Optional[str] = None):
    """Execute the full agent pipeline"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    agents = ["scout", "tracker", "sage", "nexus", "language", "html"]
    
    # If starting from a specific agent, skip previous ones
    if start_from and start_from in agents:
        start_index = agents.index(start_from)
        agents = agents[start_index:]
    
    try:
        # Get newsletter data
        newsletter = await db.newsletters.find_one({"id": newsletter_id}, {"_id": 0})
        if not newsletter:
            return
        
        # Get settings for monitored tools
        settings = await db.settings.find_one({"id": "default"}, {"_id": 0})
        monitored_tools = settings.get("monitored_tools", "") if settings else ""
        
        # Get reference newsletter if specified
        reference_content = None
        if newsletter.get("reference_newsletter_id"):
            ref_newsletter = await db.newsletters.find_one(
                {"id": newsletter["reference_newsletter_id"]}, 
                {"_id": 0}
            )
            if ref_newsletter:
                reference_content = ref_newsletter.get("assembled_newsletter") or ref_newsletter.get("tool_search_output")
        
        # Initialize agent outputs
        outputs = {
            "scout": newsletter.get("tool_search_output"),
            "tracker": newsletter.get("release_search_output"),
            "sage": newsletter.get("trend_analysis_output"),
            "nexus": newsletter.get("assembled_newsletter"),
            "language": newsletter.get("language_refined_output"),
            "html": newsletter.get("html_output")
        }
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        
        for agent_name in agents:
            active_pipelines[newsletter_id] = {"status": "running", "current_agent": agent_name}
            
            # Create agent run record
            run = AgentRun(
                newsletter_id=newsletter_id,
                agent_name=agent_name,
                status="running",
                started_at=datetime.now(timezone.utc).isoformat()
            )
            
            # Delete existing run for this agent if exists
            await db.agent_runs.delete_many({"newsletter_id": newsletter_id, "agent_name": agent_name})
            await db.agent_runs.insert_one(run.model_dump())
            
            # Retry logic for transient API failures
            max_retries = 2
            last_error = None
            
            for attempt in range(max_retries + 1):
                try:
                    start_time = datetime.now(timezone.utc)
                    
                    # Get the system prompt and model for this agent
                    system_prompt, model_provider, model_name = get_agent_config(
                        agent_name, 
                        newsletter, 
                        outputs, 
                        monitored_tools,
                        reference_content
                    )
                    
                    # Create chat instance
                    chat = LlmChat(
                        api_key=api_key,
                        session_id=f"{newsletter_id}-{agent_name}-{attempt}",
                        system_message=system_prompt
                    ).with_model(model_provider, model_name)
                    
                    # Create user message
                    user_message = UserMessage(
                        text=f"Execute your task for the monitoring period: {newsletter['date_range']}"
                    )
                    
                    # Get response
                    response = await chat.send_message(user_message)
                    
                    end_time = datetime.now(timezone.utc)
                    duration = int((end_time - start_time).total_seconds())
                    
                    # Store output
                    outputs[agent_name] = response
                    
                    # Update agent run
                    await db.agent_runs.update_one(
                        {"id": run.id},
                        {"$set": {
                            "status": "completed",
                            "output": response,
                            "completed_at": end_time.isoformat(),
                            "model": model_name,
                            "duration": duration
                        }}
                    )
                    
                    # Update newsletter with output
                    field_map = {
                        "scout": "tool_search_output",
                        "tracker": "release_search_output",
                        "sage": "trend_analysis_output",
                        "nexus": "assembled_newsletter",
                        "language": "language_refined_output",
                        "html": "html_output"
                    }
                    
                    update_data = {
                        field_map[agent_name]: response,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    # Extract counts for scout and tracker
                    if agent_name == "scout":
                        update_data["tools_found"] = count_tools(response)
                    elif agent_name == "tracker":
                        update_data["releases_found"] = count_releases(response)
                    elif agent_name == "sage":
                        update_data["patterns_found"] = count_patterns(response)
                    
                    await db.newsletters.update_one({"id": newsletter_id}, {"$set": update_data})
                    
                    logger.info(f"Agent {agent_name} completed for newsletter {newsletter_id}")
                    break  # Success, exit retry loop
                    
                except Exception as e:
                    last_error = e
                    if attempt < max_retries:
                        logger.warning(f"Agent {agent_name} attempt {attempt + 1} failed, retrying: {str(e)}")
                        await asyncio.sleep(5)  # Wait before retry
                    else:
                        logger.error(f"Agent {agent_name} failed after {max_retries + 1} attempts: {str(e)}")
                        await db.agent_runs.update_one(
                            {"id": run.id},
                            {"$set": {
                                "status": "failed",
                                "error": str(e),
                                "completed_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        
                        # Update newsletter status to failed
                        await db.newsletters.update_one(
                            {"id": newsletter_id},
                            {"$set": {"status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()}}
                        )
                        
                        active_pipelines[newsletter_id] = {"status": "failed", "current_agent": agent_name}
                        return
        
        # Pipeline completed successfully
        await db.newsletters.update_one(
            {"id": newsletter_id},
            {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        active_pipelines[newsletter_id] = {"status": "completed", "current_agent": None}
        logger.info(f"Pipeline completed for newsletter {newsletter_id}")
        
    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}")
        await db.newsletters.update_one(
            {"id": newsletter_id},
            {"$set": {"status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        active_pipelines[newsletter_id] = {"status": "failed", "current_agent": None}

def get_agent_config(agent_name: str, newsletter: dict, outputs: dict, monitored_tools: str, reference_content: Optional[str]) -> tuple:
    """Get system prompt and model configuration for each agent"""
    
    date_range = newsletter.get("date_range", "Last 7 days")
    custom_instructions = newsletter.get("custom_instructions", "")
    
    if agent_name == "scout":
        reference_section = ""
        if reference_content:
            reference_section = f"""
IMPORTANT: The following content was already covered in a previous newsletter. Do NOT include these tools again unless there is significant NEW news about them:
{reference_content[:5000]}
"""
        
        system_prompt = f"""## Role and Objective

You are Scout, a specialized Tool Search Agent that monitors and tracks new Go-To-Market (GTM) product launches across multiple platforms and news sources. Your mission is to identify emerging GTM tools and products, analyze their key characteristics, and deliver structured intelligence reports.

---
Research Period: {date_range}
---

{reference_section}

{custom_instructions}

## What is GTM (Go-To-Market)?

### GTM Tools Include:
- Sales Tools: CRM platforms, outbound sales engagement, prospecting & lead generation, sales intelligence
- Marketing Automation: Email marketing, automation platforms, social media management
- Customer Data & Enrichment: Data enrichment platforms, intent data providers, contact databases
- Revenue Operations: Revenue intelligence platforms, sales forecasting tools
- AI-Powered GTM Tools: AI prospecting assistants, AI email writers, chatbots for lead qualification
- Integration & Automation: GTM workflow automation, integration platforms

### GTM Tools DO NOT Include:
- General Productivity tools (project management, internal communication)
- Pure Operations (finance, legal, IT infrastructure)

## Instructions

1. Monitor Product Hunt, TechCrunch, G2, industry news sources for new GTM product launches
2. Apply GTM filter ruthlessly - exclude non-GTM tools
3. Check recency - only include tools launched within the monitoring period
4. Extract comprehensive information: descriptions, categories, pricing, funding details
5. Organize findings into a structured, actionable format

## Output Format

Deliver findings as a structured report:

# GTM Tool Discovery Report
Report Date: [Current Date]
Monitoring Period: {date_range}

## Executive Summary
- Total GTM Tools Identified: [Number]
- Top Categories with counts
- Notable Funding Highlights

## Tool Directory
For each tool:
- Tool Name, Company, Category, Launch Date
- Description (2-3 sentences)
- Key Features (3-5)
- Target Market
- Pricing model
- Funding info
- Website URL

## Category Breakdown
## Trending Insights
"""
        return (system_prompt, "openai", "gpt-5.2")
    
    elif agent_name == "tracker":
        system_prompt = f"""## Role and Objective
You are Tracker, a specialized Release Search Agent that monitors and analyzes feature releases from key Go-To-Market (GTM) tools.

Research Period: {date_range}

## Monitored Tools List:
{monitored_tools}

{custom_instructions}

## Content Filtering Rules

### INCLUDE:
1. Major New Features: New capabilities, product modules, workflow changes, AI/automation features
2. Significant Enhancements: Major improvements, performance upgrades, UX/UI overhauls
3. Deprecations & Breaking Changes
4. Significant Bug Fixes (only if major GTM workflow impact)

### EXCLUDE:
- Generic bug fixes
- Minor UI tweaks
- Features not relevant to GTM

## Research Process

For each monitored tool:
1. Search for changelog, release notes
2. Extract recent releases within the monitoring period
3. Capture source URLs

## Output Format

# GTM Tools Release Report
Report Date: [Current Date]
Monitoring Period: {date_range}

## Executive Summary
- Total Releases Tracked
- Key Highlights

## Major New Features
For each: Tool Name, Feature Name, Released Date, Source URL
- Description
- Impact Level (High/Medium/Low)
- GTM Use Cases

## Enhancements & Improvements
## Deprecations & Breaking Changes (if any)
## Competitive Intelligence
## Recommendations
"""
        return (system_prompt, "openai", "gpt-5.2")
    
    elif agent_name == "sage":
        scout_output = outputs.get("scout", "No tool search data available")
        tracker_output = outputs.get("tracker", "No release data available")
        
        system_prompt = f"""## Role and Objective
You are Sage, a specialized Trend Analysis Agent that synthesizes intelligence from Tool Search and Release Search agents to identify cross-release patterns, cluster emerging trends, and provide strategic insights.

{custom_instructions}

## Input Data

### Tool Search Agent Output:
{scout_output[:15000]}

### Release Search Agent Output:
{tracker_output[:15000]}

## Analysis Framework
1. Pattern Recognition: Recurring themes, technologies, approaches
2. Trend Clustering: Group related developments
3. Competitive Intelligence: How different tools respond to market demands
4. Market Direction: Where the GTM tool landscape is heading
5. Strategic Implications: Actionable business recommendations

## Output Format

# GTM News Brief
Quick Updates (one sentence each):
- [Tool Name] launched [key feature] targeting [market segment]

# Deep GTM Analysis

## Strategic Trend Analysis
For each trend (2-4 trends):
- What's Happening: Detailed description with examples
- GTM Impact: What this means for go-to-market strategies
- New Data Points: Metrics, adoption rates, benchmarks
- Actionable Insights:
  - Immediate (0-3 months)
  - Medium-term (3-12 months)

## Cross-Platform Intelligence
- Feature Convergence
- Competitive Responses
- Market Gaps

## GTM Performance Indicators
"""
        return (system_prompt, "anthropic", "claude-sonnet-4-6")
    
    elif agent_name == "nexus":
        sage_output = outputs.get("sage", "No trend analysis available")
        tracker_output = outputs.get("tracker", "No release data available")
        scout_output = outputs.get("scout", "No tool search data available")
        
        reference_section = ""
        if reference_content:
            reference_section = f"""
PREVIOUS NEWSLETTER (for deduplication — do NOT repeat content already covered):
{reference_content[:5000]}
"""
        
        system_prompt = f"""## Role and Objective
You are Nexus, a newsletter writer for GTM practitioners—specifically Account Executives and Sales Managers. Your job is to help them understand market patterns first, then show them what tools they can use immediately.

Writing for: People who use GTM tools daily but aren't technical experts. They want context before details.

Core Principle: Start with "here's what's happening across GTM tools" before diving into "here's what Tool X released."

{custom_instructions}

## Input Data

### Trend Analysis:
{sage_output[:15000]}

### Release Data:
{tracker_output[:10000]}

### Tool Search Data:
{scout_output[:10000]}

{reference_section}

## Newsletter Structure

### Header
GTM Tech Newsletter
Issue Date: [Current Date] | Monitoring Period: [Date Range]

[OVERALL SUMMARY - Lead with the pattern, then preview actionable tools. 3-4 sentences.]

### Section 1: "What's Happening in GTM Tools Right Now"
Purpose: Thematic context BEFORE specific features.

For each pattern (2-3 max):
[Number]) [Pattern Name in Plain English]

What we saw this week:
- [Specific evidence - name tools and features]

Here's what that means in practice:
[Explain using analogies and concrete examples]

Why this matters to you:
[Direct operational impact]

What to do about it:
- This Month: [Specific low-risk test]
- Next Quarter: [Strategic shift]
- Watch For: [Market direction]

For AEs: [Specific advice]
For Sales Managers: [Specific advice]

### Section 2: "Tools You Can Use Right Now"
Purpose: Specific releases that implement Section 1 patterns.

For each major feature:
[Tool Name] — [Feature Name]
What changed: [1-2 sentences]
Why it matters:
- Before: [Old workflow]
- After: [New workflow]
Try it if: [Who this helps]
Skip if: [Who doesn't need this]
Test this month: [Specific action]

### Section 3: "New Players Entering GTM"
New tool launches that validate patterns.

| Tool Name | Category | Key Features | Funding | Pricing |

## Style & Voice Guidelines
- Conversational tone
- Use contractions
- Mix short and medium sentences
- Prefer concrete examples to generic descriptions
"""
        return (system_prompt, "anthropic", "claude-sonnet-4-6")
    
    elif agent_name == "language":
        nexus_output = outputs.get("nexus", "No newsletter content available")
        
        system_prompt = f"""You are a professional newsletter editor. Understand the language and nuances of professional GTM newsletters and apply them to improve the input newsletter content.

## Input Newsletter:
{nexus_output[:20000]}

## GTM Newsletter Language Rules

FORBIDDEN phrases:
- "shifts are happening" → use "adoption is accelerating"
- "revolutionary" / "groundbreaking" / "game-changer" / "paradigm shift"

PREFERRED framing:
- "gaining traction" not "shifting"
- "X capability is becoming table stakes"
- "incremental improvements" not "breakthroughs"

## Writing Style Targets

VOCABULARY: Use shorter, punchier words
SENTENCE STRUCTURE: Vary sentence length. Mix short (5-8 words) with longer (25-35 words)
VOICE: Address reader directly using "you". Conversational, engaging tone. Use contractions.

AVOID AI PATTERNS:
Never use: furthermore, moreover, however (as transitions), delve, showcase, leverage, underscore, testament, revolutionize, cutting-edge, groundbreaking, comprehensive, robust

## Output
Produce the refined newsletter maintaining the same structure. Preserve all links and tool references."""
        return (system_prompt, "openai", "gpt-5.2")
    
    elif agent_name == "html":
        language_output = outputs.get("language", outputs.get("nexus", "No newsletter content available"))
        
        # Truncate content more aggressively for HTML generation
        content_preview = language_output[:10000] if len(language_output) > 10000 else language_output
        
        system_prompt = f"""Convert this GTM newsletter into a professional HTML email.

## Newsletter Content:
{content_preview}

## Design Specs:
- Fonts: Playfair Display (headings), Plus Jakarta Sans (body) via Google Fonts
- Colors: Background #FDF6F0, Text #1A1A1A, Accent #E85A4F, Cards #FFFFFF
- Layout: Max-width 640px, table-based, mobile responsive at 640px
- Style: Cream exec summary with coral left border, coral underline for headers

## Requirements:
- All CSS inlined
- Table layout for email compatibility
- Include Google Fonts link
- Output complete, valid HTML ready for email"""
        return (system_prompt, "openai", "gpt-5.2")
    
    return ("You are a helpful assistant.", "openai", "gpt-5.2")

def count_tools(output: str) -> int:
    """Count tools mentioned in scout output"""
    if not output:
        return 0
    # Simple heuristic: count tool directory entries
    count = output.lower().count("tool name") + output.lower().count("## tool")
    return max(count, 1) if "tool" in output.lower() else 0

def count_releases(output: str) -> int:
    """Count releases in tracker output"""
    if not output:
        return 0
    count = output.lower().count("feature") + output.lower().count("release")
    return min(count // 2, 50) if count > 0 else 0

def count_patterns(output: str) -> int:
    """Count patterns in sage output"""
    if not output:
        return 0
    count = output.lower().count("trend") + output.lower().count("pattern")
    return min(count // 2, 10) if count > 0 else 0

# ==================== STATS ENDPOINT ====================

@api_router.get("/stats")
async def get_stats():
    """Get dashboard statistics"""
    total_newsletters = await db.newsletters.count_documents({})
    completed = await db.newsletters.count_documents({"status": "completed"})
    running = await db.newsletters.count_documents({"status": "running"})
    failed = await db.newsletters.count_documents({"status": "failed"})
    
    # Get last run date
    last_newsletter = await db.newsletters.find_one(
        {"status": "completed"},
        {"_id": 0, "updated_at": 1},
        sort=[("updated_at", -1)]
    )
    last_run = last_newsletter.get("updated_at") if last_newsletter else None
    
    # Count total tools tracked
    total_tools = 0
    async for newsletter in db.newsletters.find({"tools_found": {"$gt": 0}}, {"tools_found": 1}):
        total_tools += newsletter.get("tools_found", 0)
    
    return {
        "total_newsletters": total_newsletters,
        "completed": completed,
        "running": running,
        "failed": failed,
        "last_run": last_run,
        "total_tools_tracked": total_tools
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
