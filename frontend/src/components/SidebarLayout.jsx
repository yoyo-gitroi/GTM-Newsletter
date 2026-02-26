import { Outlet, NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  Newspaper,
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/newsletter/new", icon: PlusCircle, label: "New Newsletter" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function SidebarLayout() {
  const location = useLocation();
  
  return (
    <div className="flex min-h-screen" data-testid="sidebar-layout">
      {/* Sidebar */}
      <aside 
        className="w-60 bg-zinc-900 text-zinc-100 flex flex-col fixed h-full"
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight font-[Manrope]">
              GTM Intel
            </span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-zinc-800 text-white" 
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            Newsletter Intelligence v1.0
          </p>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 ml-60 bg-white min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
