"use client";

import Link from "next/link";
import Image from "next/image";
import { FolderTree, Network, MessageSquare, Settings, Github, LogOut, User as UserIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { getUser, signInWithGithub, signOut } from "@/app/actions/auth";
import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
    const [user, setUser] = useState<User | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        getUser().then(setUser);
    }, []);

    return (
        <aside className={`h-screen bg-sidebar border-r border-sidebar-border hidden md:flex flex-col relative transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-8 z-10 w-6 h-6 bg-sidebar-primary text-sidebar-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className={`p-6 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="relative w-10 h-10 shrink-0">
                    <Image
                        src="/assets/logo.png"
                        alt="Archway Logo"
                        fill
                        className="object-contain"
                    />
                </div>
                {!isCollapsed && (
                    <h1 className="text-xl font-bold tracking-tight text-sidebar-foreground">Archway</h1>
                )}
            </div>

            <nav className={`flex-1 py-4 space-y-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
                <Suspense fallback={<div className="h-20 animate-pulse bg-sidebar-accent/50 rounded-md" />}>
                    <NavLinks isCollapsed={isCollapsed} />
                </Suspense>
            </nav>

            <div className={`p-4 border-t border-sidebar-border ${isCollapsed ? 'px-2' : ''}`}>
                <NavItem
                    href="/settings"
                    icon={<Settings size={20} />}
                    label="Settings"
                    isCollapsed={isCollapsed}
                />

                <div className="mt-4 pt-4 border-t border-sidebar-border/50">
                    {user ? (
                        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-3'}`}>
                            <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                                <AvatarImage src={user.user_metadata.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    <UserIcon size={16} />
                                </AvatarFallback>
                            </Avatar>
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-sidebar-foreground">
                                        {user.user_metadata.full_name || user.email}
                                    </p>
                                    <button
                                        onClick={() => signOut()}
                                        className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                                    >
                                        <LogOut size={10} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className={`border-sidebar-primary/30 hover:bg-sidebar-primary/10 text-sidebar-foreground ${isCollapsed ? 'w-full p-2' : 'w-full'}`}
                            onClick={() => signInWithGithub()}
                            title={isCollapsed ? "Login with GitHub" : undefined}
                        >
                            <Github className={isCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                            {!isCollapsed && "Login with GitHub"}
                        </Button>
                    )}
                </div>

                {!isCollapsed && (
                    <div className="mt-4 pt-2 border-t border-sidebar-border/30">
                        <p className="text-[10px] text-sidebar-foreground/30 px-3">Archway v1.0.0</p>
                    </div>
                )}
            </div>
        </aside>
    );
}

function NavLinks({ isCollapsed }: { isCollapsed: boolean }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const repoParam = searchParams.get("repo");
    const query = repoParam ? `?repo=${encodeURIComponent(repoParam)}` : "";

    return (
        <>
            <NavItem
                href={`/${query}`}
                icon={<FolderTree size={20} />}
                label="Repo Explorer"
                active={pathname === "/"}
                isCollapsed={isCollapsed}
            />
            <NavItem
                href={`/graph${query}`}
                icon={<Network size={20} />}
                label="Dependency Graph"
                active={pathname === "/graph"}
                isCollapsed={isCollapsed}
            />
            <NavItem
                href={`/workspace${query}`}
                icon={<MessageSquare size={20} />}
                label="Workspace"
                active={pathname === "/workspace"}
                isCollapsed={isCollapsed}
            />
        </>
    );
}

function NavItem({ href, icon, label, active, isCollapsed }: { href: string; icon: React.ReactNode; label: string; active?: boolean; isCollapsed?: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 py-2.5 rounded-md transition-all duration-200 group
        ${isCollapsed ? 'justify-center px-2' : 'px-3'}
        ${active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
            title={isCollapsed ? label : undefined}
        >
            {icon}
            {!isCollapsed && <span className="font-medium">{label}</span>}
        </Link>
    );
}
