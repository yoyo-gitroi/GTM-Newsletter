import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { 
  Play, 
  RefreshCw, 
  Eye, 
  ChevronDown, 
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  ArrowLeft,
  Sparkles,
  Search,
  TrendingUp,
  FileText,
  Languages,
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AGENTS = [
  { 
    name: "scout", 
    label: "Scout", 
    description: "Tool Search Agent",
    detail: "Discovers new GTM tool launches",
    icon: Search,
    model: "GPT-5.2"
  },
  { 
    name: "tracker", 
    label: "Tracker", 
    description: "Release Search Agent",
    detail: "Monitors feature releases",
    icon: Sparkles,
    model: "GPT-5.2"
  },
  { 
    name: "sage", 
    label: "Sage", 
    description: "Trend Analysis Agent",
    detail: "Identifies patterns and insights",
    icon: TrendingUp,
    model: "Claude Sonnet 4.6"
  },
  { 
    name: "nexus", 
    label: "Nexus", 
    description: "Newsletter Assembler",
    detail: "Assembles cohesive newsletter",
    icon: FileText,
    model: "Claude Sonnet 4.6"
  },
  { 
    name: "language", 
    label: "Language",
    description: "Language Analyser",
    detail: "Refines tone and style",
    icon: Languages,
    model: "GPT-5.2"
  },
  { 
    name: "html", 
    label: "HTML",
    description: "HTML Converter",
    detail: "Creates email-ready HTML",
    icon: Code,
    model: "GPT-5.2"
  }
];

export default function PipelineView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [newsletter, setNewsletter] = useState(null);
  const [runs, setRuns] = useState([]);
  const [expandedAgents, setExpandedAgents] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchData = async () => {
    try {
      const [newsletterRes, statusRes] = await Promise.all([
        axios.get(`${API}/newsletters/${id}`),
        axios.get(`${API}/newsletters/${id}/status`)
      ]);
      setNewsletter(newsletterRes.data);
      setRuns(statusRes.data.runs || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load newsletter");
    } finally {
      setLoading(false);
    }
  };

  const startPipeline = async () => {
    try {
      await axios.post(`${API}/newsletters/${id}/run`);
      toast.success("Pipeline started!");
      fetchData();
    } catch (error) {
      toast.error("Failed to start pipeline");
    }
  };

  const rerunAgent = async (agentName) => {
    try {
      await axios.post(`${API}/newsletters/${id}/rerun/${agentName}`);
      toast.success(`Restarting from ${agentName}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to rerun agent");
    }
  };

  const toggleExpand = (agentName) => {
    setExpandedAgents(prev => ({
      ...prev,
      [agentName]: !prev[agentName]
    }));
  };

  const getAgentRun = (agentName) => {
    return runs.find(r => r.agent_name === agentName);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-zinc-300" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-700",
      running: "bg-blue-100 text-blue-700",
      completed: "bg-emerald-100 text-emerald-700",
      failed: "bg-red-100 text-red-700"
    };
    
    return (
      <Badge className={cn("capitalize", styles[status] || styles.pending)}>
        {status || "pending"}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-500">Newsletter not found</p>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="pipeline-view">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/")}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-[Manrope]">
            {newsletter.title}
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Monitoring: {newsletter.date_range}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {newsletter.status === "draft" && (
            <Button onClick={startPipeline} className="gap-2" data-testid="start-pipeline-btn">
              <Play className="w-4 h-4" />
              Start Pipeline
            </Button>
          )}
          {newsletter.status === "completed" && newsletter.html_output && (
            <Button 
              variant="outline" 
              onClick={() => navigate(`/newsletter/${id}/preview`)}
              className="gap-2"
              data-testid="preview-btn"
            >
              <Eye className="w-4 h-4" />
              Preview HTML
            </Button>
          )}
          {newsletter.status === "failed" && (
            <Button onClick={startPipeline} variant="outline" className="gap-2" data-testid="retry-btn">
              <RefreshCw className="w-4 h-4" />
              Retry Pipeline
            </Button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 mb-8 mt-4">
        <Badge className={cn(
          "capitalize",
          newsletter.status === "completed" && "bg-emerald-100 text-emerald-700",
          newsletter.status === "running" && "bg-blue-100 text-blue-700",
          newsletter.status === "failed" && "bg-red-100 text-red-700",
          newsletter.status === "draft" && "bg-zinc-100 text-zinc-600"
        )}>
          {newsletter.status}
        </Badge>
        <span className="text-sm text-zinc-500">
          Created {format(new Date(newsletter.created_at), "MMM d, yyyy 'at' h:mm a")}
        </span>
      </div>

      {/* Pipeline Timeline */}
      <div className="space-y-4" data-testid="pipeline-timeline">
        {AGENTS.map((agent, index) => {
          const run = getAgentRun(agent.name);
          const isExpanded = expandedAgents[agent.name];
          const Icon = agent.icon;
          const status = run?.status || "pending";
          
          return (
            <div key={agent.name} className="relative">
              {/* Connection Line */}
              {index < AGENTS.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-6 top-16 w-0.5 h-8 -translate-x-1/2",
                    run?.status === "completed" ? "bg-emerald-300" : "bg-zinc-200"
                  )}
                />
              )}
              
              <Card 
                className={cn(
                  "border transition-all duration-200",
                  status === "running" && "agent-running border-blue-400",
                  status === "completed" && "border-emerald-200",
                  status === "failed" && "border-red-200"
                )}
                data-testid={`agent-card-${agent.name}`}
              >
                {/* Card Header - Always Visible */}
                <div 
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                  onClick={() => toggleExpand(agent.name)}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(status)}
                  </div>
                  
                  {/* Agent Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-zinc-500" />
                      <span className="font-semibold text-zinc-900">{agent.label}</span>
                      <span className="text-zinc-400">-</span>
                      <span className="text-sm text-zinc-600">{agent.description}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{agent.detail}</p>
                  </div>
                  
                  {/* Status Badge & Duration */}
                  <div className="flex items-center gap-3">
                    {run?.duration && (
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {run.duration}s
                      </span>
                    )}
                    {getStatusBadge(status)}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-zinc-100">
                    <CardContent className="p-4 space-y-4">
                      {/* Model Info */}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-zinc-500">Model:</span>
                        <Badge variant="outline">{run?.model || agent.model}</Badge>
                      </div>
                      
                      {/* Output */}
                      {run?.output && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-700">Output</span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                rerunAgent(agent.name);
                              }}
                              className="gap-1 h-7 text-xs"
                              data-testid={`rerun-${agent.name}-btn`}
                            >
                              <RefreshCw className="w-3 h-3" />
                              Re-run
                            </Button>
                          </div>
                          <ScrollArea className="h-64 rounded-md border bg-zinc-50 p-4 agent-output-scroll">
                            <pre className="text-xs font-mono text-zinc-700 whitespace-pre-wrap">
                              {run.output}
                            </pre>
                          </ScrollArea>
                        </div>
                      )}
                      
                      {/* Error */}
                      {run?.error && (
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-red-600">Error</span>
                          <div className="rounded-md border border-red-200 bg-red-50 p-4">
                            <pre className="text-xs font-mono text-red-700 whitespace-pre-wrap">
                              {run.error}
                            </pre>
                          </div>
                        </div>
                      )}
                      
                      {/* No Output Yet */}
                      {!run?.output && !run?.error && status === "pending" && (
                        <p className="text-sm text-zinc-400 italic">
                          Waiting for previous agents to complete...
                        </p>
                      )}
                      
                      {status === "running" && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Agent is processing...
                        </div>
                      )}
                    </CardContent>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
