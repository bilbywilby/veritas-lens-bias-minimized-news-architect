import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Rss, Archive, ShieldCheck, Menu } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
export function AppLayout({ children, container = false }: { children: React.ReactNode; container?: boolean }) {
  const location = useLocation();
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="border-b px-4 py-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-sky-600" />
            <div>
              <h1 className="font-serif text-xl font-bold leading-none tracking-tight">Veritas Lens</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Truth-First News</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/"}>
                <Link to="/"><Home className="mr-2 h-4 w-4" /> Lens Dashboard</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/sources"}>
                <Link to="/sources"><Rss className="mr-2 h-4 w-4" /> Source Registry</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/archive"}>
                <Link to="/"><Archive className="mr-2 h-4 w-4" /> Archive Vault</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-[#f8fafc]">
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
          <SidebarTrigger />
          <ThemeToggle className="relative top-0 right-0" />
        </header>
        <main className={container ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" : ""}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}