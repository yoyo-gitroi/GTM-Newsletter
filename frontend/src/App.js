import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import SidebarLayout from "@/components/SidebarLayout";
import Dashboard from "@/pages/Dashboard";
import NewNewsletter from "@/pages/NewNewsletter";
import PipelineView from "@/pages/PipelineView";
import Preview from "@/pages/Preview";
import Settings from "@/pages/Settings";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route element={<SidebarLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/newsletter/new" element={<NewNewsletter />} />
            <Route path="/newsletter/:id" element={<PipelineView />} />
            <Route path="/newsletter/:id/preview" element={<Preview />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
