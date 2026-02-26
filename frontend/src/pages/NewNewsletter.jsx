import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { format, addDays } from "date-fns";
import { CalendarIcon, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NewNewsletter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [newsletters, setNewsletters] = useState([]);
  
  const [formData, setFormData] = useState({
    title: "",
    dateRange: {
      from: addDays(new Date(), -7),
      to: new Date()
    },
    useReference: false,
    referenceId: "",
    customInstructions: ""
  });

  useEffect(() => {
    fetchNewsletters();
  }, []);

  const fetchNewsletters = async () => {
    try {
      const res = await axios.get(`${API}/newsletters`);
      setNewsletters(res.data.filter(n => n.status === "completed"));
    } catch (error) {
      console.error("Failed to fetch newsletters:", error);
    }
  };

  const getDateRangeString = () => {
    if (formData.dateRange.from && formData.dateRange.to) {
      return `${format(formData.dateRange.from, "d MMM")} to ${format(formData.dateRange.to, "d MMM yyyy")}`;
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Please enter a newsletter title");
      return;
    }
    
    setLoading(true);
    
    try {
      const payload = {
        title: formData.title,
        date_range: getDateRangeString(),
        reference_newsletter_id: formData.useReference ? formData.referenceId : null,
        custom_instructions: formData.customInstructions || null
      };
      
      const res = await axios.post(`${API}/newsletters`, payload);
      toast.success("Newsletter created!");
      navigate(`/newsletter/${res.data.id}`);
    } catch (error) {
      toast.error("Failed to create newsletter");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto" data-testid="new-newsletter-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-[Manrope]">
          New Newsletter
        </h1>
        <p className="text-zinc-500 mt-1">
          Create a new GTM intelligence newsletter
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border border-zinc-200">
          <CardHeader>
            <CardTitle className="text-lg font-[Manrope]">Newsletter Details</CardTitle>
            <CardDescription>
              Configure your newsletter parameters before running the AI pipeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Newsletter Title</Label>
              <Input
                id="title"
                placeholder="e.g., GTM Newsletter 17th Feb to 24th Feb"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="newsletter-title-input"
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Monitoring Period</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dateRange.from && "text-muted-foreground"
                    )}
                    data-testid="date-range-picker"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dateRange.from ? (
                      formData.dateRange.to ? (
                        <>
                          {format(formData.dateRange.from, "LLL dd, y")} -{" "}
                          {format(formData.dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(formData.dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={formData.dateRange.from}
                    selected={formData.dateRange}
                    onSelect={(range) => setFormData({ ...formData, dateRange: range || { from: null, to: null } })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-sm text-zinc-500">
                Select the period you want to monitor for GTM tools and releases
              </p>
            </div>

            {/* Reference Newsletter */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useReference"
                  checked={formData.useReference}
                  onCheckedChange={(checked) => setFormData({ ...formData, useReference: checked, referenceId: "" })}
                  data-testid="use-reference-checkbox"
                />
                <Label htmlFor="useReference" className="text-sm font-normal">
                  Reference a previous newsletter (to avoid duplicating content)
                </Label>
              </div>
              
              {formData.useReference && (
                <Select
                  value={formData.referenceId}
                  onValueChange={(value) => setFormData({ ...formData, referenceId: value })}
                >
                  <SelectTrigger data-testid="reference-select">
                    <SelectValue placeholder="Select a previous newsletter" />
                  </SelectTrigger>
                  <SelectContent>
                    {newsletters.map((newsletter) => (
                      <SelectItem key={newsletter.id} value={newsletter.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-zinc-400" />
                          {newsletter.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions">Custom Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                placeholder="Add any special focus areas or instructions for the AI agents..."
                value={formData.customInstructions}
                onChange={(e) => setFormData({ ...formData, customInstructions: e.target.value })}
                className="min-h-[100px]"
                data-testid="custom-instructions-textarea"
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full gap-2" 
              disabled={loading}
              data-testid="create-newsletter-btn"
            >
              {loading ? "Creating..." : "Create Newsletter"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
