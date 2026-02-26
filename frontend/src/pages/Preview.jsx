import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { 
  ArrowLeft, 
  Eye, 
  Code2, 
  Download, 
  Copy, 
  Check,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export default function Preview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [newsletter, setNewsletter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchNewsletter();
  }, [id]);

  const fetchNewsletter = async () => {
    try {
      const res = await axios.get(`${API}/newsletters/${id}`);
      setNewsletter(res.data);
    } catch (error) {
      console.error("Failed to fetch newsletter:", error);
      toast.error("Failed to load newsletter");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!newsletter?.html_output) return;
    
    try {
      await navigator.clipboard.writeText(newsletter.html_output);
      setCopied(true);
      toast.success("HTML copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    if (!newsletter?.html_output) return;
    
    const blob = new Blob([newsletter.html_output], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${newsletter.title.replace(/\s+/g, "_")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("HTML downloaded");
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

  if (!newsletter.html_output) {
    return (
      <div className="p-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/newsletter/${id}`)}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pipeline
        </Button>
        <Card className="p-8 text-center">
          <p className="text-zinc-500">No HTML output available yet. Run the pipeline first.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 h-screen flex flex-col" data-testid="preview-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/newsletter/${id}`)}
            data-testid="back-to-pipeline-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pipeline
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 font-[Manrope]">
            {newsletter.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleCopy}
            className="gap-2"
            data-testid="copy-html-btn"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy HTML"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownload}
            className="gap-2"
            data-testid="download-html-btn"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-fit">
          <TabsTrigger value="preview" className="gap-2" data-testid="preview-tab">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-2" data-testid="code-tab">
            <Code2 className="w-4 h-4" />
            Raw HTML
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="flex-1 mt-4 min-h-0">
          <Card className="h-full border overflow-hidden">
            <iframe
              srcDoc={newsletter.html_output}
              title="Newsletter Preview"
              className="w-full h-full border-0 html-preview-frame"
              sandbox="allow-same-origin"
              data-testid="html-preview-iframe"
            />
          </Card>
        </TabsContent>
        
        <TabsContent value="code" className="flex-1 mt-4 min-h-0">
          <Card className="h-full border overflow-hidden">
            <ScrollArea className="h-full">
              <pre className="p-4 text-xs font-mono text-zinc-700 whitespace-pre-wrap">
                {newsletter.html_output}
              </pre>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
