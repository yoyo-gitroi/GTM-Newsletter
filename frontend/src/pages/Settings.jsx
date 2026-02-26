import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Save, 
  Loader2, 
  Info, 
  ChevronDown, 
  ChevronRight,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  FileText,
  Languages,
  Code,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    model: "GPT-5.2",
    inputs: "Standalone (no dependencies)",
    variables: ["{{DATE_RANGE}}", "{{CUSTOM_INSTRUCTIONS}}", "{{REFERENCE_SECTION}}"]
  },
  { 
    name: "tracker", 
    label: "Tracker", 
    description: "Release Search Agent",
    detail: "Monitors feature releases from monitored tools",
    icon: Sparkles,
    model: "GPT-5.2",
    inputs: "Standalone (no dependencies)",
    variables: ["{{DATE_RANGE}}", "{{MONITORED_TOOLS}}", "{{CUSTOM_INSTRUCTIONS}}"]
  },
  { 
    name: "sage", 
    label: "Sage", 
    description: "Trend Analysis Agent",
    detail: "Identifies patterns and insights",
    icon: TrendingUp,
    model: "Claude Sonnet 4.6",
    inputs: "Scout + Tracker outputs",
    variables: ["{{DATE_RANGE}}", "{{SCOUT_OUTPUT}}", "{{TRACKER_OUTPUT}}", "{{CUSTOM_INSTRUCTIONS}}"]
  },
  { 
    name: "nexus", 
    label: "Nexus",
    description: "Newsletter Assembler",
    detail: "Assembles cohesive newsletter",
    icon: FileText,
    model: "Claude Sonnet 4.6",
    inputs: "Scout + Tracker + Sage outputs",
    variables: ["{{DATE_RANGE}}", "{{SCOUT_OUTPUT}}", "{{TRACKER_OUTPUT}}", "{{SAGE_OUTPUT}}", "{{REFERENCE_SECTION}}", "{{CUSTOM_INSTRUCTIONS}}"]
  },
  { 
    name: "language", 
    label: "Language",
    description: "Language Analyser",
    detail: "Refines tone and style",
    icon: Languages,
    model: "GPT-5.2",
    inputs: "Nexus output",
    variables: ["{{NEXUS_OUTPUT}}", "{{CUSTOM_INSTRUCTIONS}}"]
  },
  { 
    name: "html", 
    label: "HTML",
    description: "HTML Converter",
    detail: "Creates email-ready HTML",
    icon: Code,
    model: "GPT-5.2",
    inputs: "Language + Scout + Tracker + Sage outputs",
    variables: ["{{LANGUAGE_OUTPUT}}", "{{SCOUT_OUTPUT}}", "{{TRACKER_OUTPUT}}", "{{SAGE_OUTPUT}}"]
  }
];

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [settings, setSettings] = useState({
    monitored_tools: ""
  });
  const [prompts, setPrompts] = useState({});
  const [expandedAgents, setExpandedAgents] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, promptsRes] = await Promise.all([
        axios.get(`${API}/settings`),
        axios.get(`${API}/agent-prompts`)
      ]);
      setSettings(settingsRes.data);
      
      // Convert prompts array to object keyed by agent_name
      const promptsObj = {};
      promptsRes.data.forEach(p => {
        promptsObj[p.agent_name] = p.prompt;
      });
      setPrompts(promptsObj);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(prev => ({ ...prev, settings: true }));
    try {
      await axios.put(`${API}/settings`, {
        monitored_tools: settings.monitored_tools
      });
      toast.success("Settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(prev => ({ ...prev, settings: false }));
    }
  };

  const handleSavePrompt = async (agentName) => {
    setSaving(prev => ({ ...prev, [agentName]: true }));
    try {
      await axios.put(`${API}/agent-prompts/${agentName}`, {
        prompt: prompts[agentName]
      });
      toast.success(`${agentName} prompt saved`);
    } catch (error) {
      toast.error(`Failed to save ${agentName} prompt`);
    } finally {
      setSaving(prev => ({ ...prev, [agentName]: false }));
    }
  };

  const handleResetPrompt = async (agentName) => {
    setSaving(prev => ({ ...prev, [`reset_${agentName}`]: true }));
    try {
      const res = await axios.delete(`${API}/agent-prompts/${agentName}`);
      setPrompts(prev => ({ ...prev, [agentName]: res.data.default_prompt }));
      toast.success(`${agentName} prompt reset to default`);
    } catch (error) {
      toast.error(`Failed to reset ${agentName} prompt`);
    } finally {
      setSaving(prev => ({ ...prev, [`reset_${agentName}`]: false }));
    }
  };

  const fetchDefaultPrompt = async (agentName) => {
    try {
      const res = await axios.get(`${API}/agent-prompts/${agentName}`);
      setPrompts(prev => ({ ...prev, [agentName]: res.data.prompt }));
    } catch (error) {
      console.error("Failed to fetch prompt:", error);
    }
  };

  const toggleAgent = async (agentName) => {
    const isExpanding = !expandedAgents[agentName];
    setExpandedAgents(prev => ({
      ...prev,
      [agentName]: isExpanding
    }));
    
    // Fetch prompt if expanding and not already loaded
    if (isExpanding && !prompts[agentName]) {
      await fetchDefaultPrompt(agentName);
    }
  };

  const toolsList = settings.monitored_tools?.split(",").map(t => t.trim()).filter(Boolean) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl" data-testid="settings-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-[Manrope]">
          Settings
        </h1>
        <p className="text-zinc-500 mt-1">
          Configure your newsletter preferences, monitored tools, and agent prompts
        </p>
      </div>

      <div className="space-y-6">
        {/* API Configuration */}
        <Card className="border border-zinc-200">
          <CardHeader>
            <CardTitle className="text-lg font-[Manrope]">API Configuration</CardTitle>
            <CardDescription>
              API keys are pre-configured for this deployment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 font-medium">Emergent LLM Key Active</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Using GPT-5.2 and Claude Sonnet 4.6 via Emergent integration
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border bg-zinc-50">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">OpenAI Model</p>
                <p className="text-sm font-medium text-zinc-900">GPT-5.2</p>
              </div>
              <div className="p-3 rounded-lg border bg-zinc-50">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Anthropic Model</p>
                <p className="text-sm font-medium text-zinc-900">Claude Sonnet 4.6</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monitored Tools */}
        <Card className="border border-zinc-200">
          <CardHeader>
            <CardTitle className="text-lg font-[Manrope]">Monitored Tools</CardTitle>
            <CardDescription>
              List of GTM tools to track for feature releases (Tracker agent)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tools">Tools List (comma-separated)</Label>
              <Textarea
                id="tools"
                value={settings.monitored_tools}
                onChange={(e) => setSettings({ ...settings, monitored_tools: e.target.value })}
                placeholder="Bitscale, Clay, Apollo, HubSpot..."
                className="min-h-[100px]"
                data-testid="monitored-tools-input"
              />
            </div>
            
            {/* Preview Tags */}
            {toolsList.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Preview ({toolsList.length} tools)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {toolsList.map((tool, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="bg-zinc-100 text-zinc-700 font-normal"
                    >
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveSettings} 
                disabled={saving.settings}
                className="gap-2"
                data-testid="save-settings-btn"
              >
                {saving.settings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Monitored Tools
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Agent Prompts */}
        <Card className="border border-zinc-200">
          <CardHeader>
            <CardTitle className="text-lg font-[Manrope]">Agent Prompts</CardTitle>
            <CardDescription>
              Customize the system prompts for each AI agent. Use variables like {"{{DATE_RANGE}}"} for dynamic content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Pipeline Flow Diagram */}
            <div className="p-4 bg-zinc-50 rounded-lg border mb-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Pipeline Flow</p>
              <div className="flex items-center gap-2 text-xs text-zinc-600 flex-wrap">
                <Badge variant="outline" className="bg-white">Scout</Badge>
                <span className="text-zinc-300">+</span>
                <Badge variant="outline" className="bg-white">Tracker</Badge>
                <span className="text-zinc-400">→</span>
                <Badge variant="outline" className="bg-white">Sage</Badge>
                <span className="text-zinc-400">→</span>
                <Badge variant="outline" className="bg-white">Nexus</Badge>
                <span className="text-zinc-400">→</span>
                <Badge variant="outline" className="bg-white">Language</Badge>
                <span className="text-zinc-400">→</span>
                <Badge variant="outline" className="bg-white">HTML</Badge>
              </div>
            </div>

            {AGENTS.map((agent) => {
              const Icon = agent.icon;
              const isExpanded = expandedAgents[agent.name];
              
              return (
                <Collapsible 
                  key={agent.name} 
                  open={isExpanded} 
                  onOpenChange={() => toggleAgent(agent.name)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div 
                        className="flex items-center justify-between p-4 hover:bg-zinc-50 cursor-pointer transition-colors"
                        data-testid={`agent-prompt-trigger-${agent.name}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-zinc-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-900">{agent.label}</span>
                              <Badge variant="outline" className="text-xs">{agent.model}</Badge>
                            </div>
                            <p className="text-xs text-zinc-500">{agent.description} • {agent.detail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400">Inputs: {agent.inputs}</span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="border-t p-4 space-y-4 bg-zinc-50/50">
                        {/* Variables */}
                        <div className="space-y-2">
                          <Label className="text-xs text-zinc-500">Available Variables</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {agent.variables.map((v, i) => (
                              <Badge 
                                key={i} 
                                variant="secondary"
                                className="bg-amber-100 text-amber-700 font-mono text-xs"
                              >
                                {v}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {/* Prompt Editor */}
                        <div className="space-y-2">
                          <Label htmlFor={`prompt-${agent.name}`}>System Prompt</Label>
                          <ScrollArea className="h-64 rounded-md border bg-white">
                            <Textarea
                              id={`prompt-${agent.name}`}
                              value={prompts[agent.name] || ""}
                              onChange={(e) => setPrompts(prev => ({ ...prev, [agent.name]: e.target.value }))}
                              placeholder="Loading prompt..."
                              className="min-h-[250px] border-0 font-mono text-xs resize-none focus-visible:ring-0"
                              data-testid={`agent-prompt-textarea-${agent.name}`}
                            />
                          </ScrollArea>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center justify-between">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleResetPrompt(agent.name)}
                            disabled={saving[`reset_${agent.name}`]}
                            className="gap-1.5 text-zinc-600"
                            data-testid={`reset-prompt-${agent.name}`}
                          >
                            {saving[`reset_${agent.name}`] ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            Reset to Default
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleSavePrompt(agent.name)}
                            disabled={saving[agent.name]}
                            className="gap-1.5"
                            data-testid={`save-prompt-${agent.name}`}
                          >
                            {saving[agent.name] ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Save Prompt
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
