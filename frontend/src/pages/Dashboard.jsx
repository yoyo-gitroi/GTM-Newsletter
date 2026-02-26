import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { format } from "date-fns";
import { 
  PlusCircle, 
  Search, 
  Newspaper, 
  Zap, 
  Clock,
  MoreHorizontal,
  Trash2,
  Eye,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [newsletters, setNewsletters] = useState([]);
  const [stats, setStats] = useState({
    total_newsletters: 0,
    completed: 0,
    running: 0,
    failed: 0,
    last_run: null,
    total_tools_tracked: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [newslettersRes, statsRes] = await Promise.all([
        axios.get(`${API}/newsletters`),
        axios.get(`${API}/stats`)
      ]);
      setNewsletters(newslettersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/newsletters/${id}`);
      toast.success("Newsletter deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete newsletter");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
      running: "bg-blue-100 text-blue-700 hover:bg-blue-100",
      completed: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
      failed: "bg-red-100 text-red-700 hover:bg-red-100"
    };
    
    return (
      <Badge 
        variant="secondary" 
        className={cn("font-medium capitalize", styles[status] || styles.draft)}
      >
        {status}
      </Badge>
    );
  };

  const filteredNewsletters = newsletters.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.date_range.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statCards = [
    { 
      label: "Total Newsletters", 
      value: stats.total_newsletters, 
      icon: Newspaper,
      color: "text-zinc-700"
    },
    { 
      label: "Tools Tracked", 
      value: stats.total_tools_tracked, 
      icon: Zap,
      color: "text-blue-600"
    },
    { 
      label: "Last Run", 
      value: stats.last_run ? format(new Date(stats.last_run), "MMM d, yyyy") : "Never",
      icon: Clock,
      color: "text-emerald-600"
    },
  ];

  return (
    <div className="p-8" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-[Manrope]">
            Dashboard
          </h1>
          <p className="text-zinc-500 mt-1">
            Manage your GTM newsletters and track agent pipelines
          </p>
        </div>
        <Button 
          onClick={() => navigate("/newsletter/new")}
          className="gap-2"
          data-testid="new-newsletter-btn"
        >
          <PlusCircle className="w-4 h-4" />
          New Newsletter
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border border-zinc-200" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-zinc-900 mt-1 font-[Manrope]">
                      {stat.value}
                    </p>
                  </div>
                  <div className={cn("p-3 rounded-lg bg-zinc-50", stat.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search newsletters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="search-input"
          />
        </div>
      </div>

      {/* Newsletters Table */}
      <Card className="border border-zinc-200">
        <Table data-testid="newsletters-table">
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="font-semibold">Title</TableHead>
              <TableHead className="font-semibold">Date Range</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Tools</TableHead>
              <TableHead className="font-semibold">Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredNewsletters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                  No newsletters found. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              filteredNewsletters.map((newsletter) => (
                <TableRow 
                  key={newsletter.id} 
                  className="hover:bg-zinc-50/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/newsletter/${newsletter.id}`)}
                  data-testid={`newsletter-row-${newsletter.id}`}
                >
                  <TableCell className="font-medium">{newsletter.title}</TableCell>
                  <TableCell className="text-zinc-600">{newsletter.date_range}</TableCell>
                  <TableCell>{getStatusBadge(newsletter.status)}</TableCell>
                  <TableCell className="text-zinc-600">{newsletter.tools_found || 0}</TableCell>
                  <TableCell className="text-zinc-500 text-sm">
                    {format(new Date(newsletter.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`newsletter-menu-${newsletter.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/newsletter/${newsletter.id}`);
                        }}>
                          <Play className="w-4 h-4 mr-2" />
                          View Pipeline
                        </DropdownMenuItem>
                        {newsletter.html_output && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/newsletter/${newsletter.id}/preview`);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview HTML
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(newsletter.id);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
