import { useState, useEffect } from "react";
import axios from "axios";
import { Save, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    monitored_tools: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings`);
      setSettings(res.data);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, {
        monitored_tools: settings.monitored_tools
      });
      toast.success("Settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
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
    <div className="p-8 max-w-3xl" data-testid="settings-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-[Manrope]">
          Settings
        </h1>
        <p className="text-zinc-500 mt-1">
          Configure your newsletter preferences and monitored tools
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
          </CardContent>
        </Card>

        {/* Agent Pipeline Info */}
        <Card className="border border-zinc-200">
          <CardHeader>
            <CardTitle className="text-lg font-[Manrope]">Agent Pipeline</CardTitle>
            <CardDescription>
              6-agent AI pipeline for newsletter generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Scout", desc: "Tool Search Agent", model: "GPT-5.2" },
                { name: "Tracker", desc: "Release Search Agent", model: "GPT-5.2" },
                { name: "Sage", desc: "Trend Analysis Agent", model: "Claude Sonnet 4.6" },
                { name: "Nexus", desc: "Newsletter Assembler", model: "Claude Sonnet 4.6" },
                { name: "Language", desc: "Language Analyser", model: "GPT-5.2" },
                { name: "HTML", desc: "HTML Converter", model: "GPT-5.2" },
              ].map((agent, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{agent.name}</p>
                      <p className="text-xs text-zinc-500">{agent.desc}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {agent.model}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="gap-2"
            data-testid="save-settings-btn"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
