"use client";

import Link from "next/link";
import Image from "next/image";
import { FolderTree, Network, MessageSquare, Settings, Github, LogOut, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getUser, signInWithGithub, signOut } from "@/app/actions/auth";
import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        getUser().then(setUser);
    }, []);

    return (
        <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
            <div className="p-6 flex items-center gap-3">
                <div className="relative w-10 h-10">
                    <Image
                        src="/assets/logo.png"
                        alt="Archway Logo"
                        fill
                        className="object-contain"
                    />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-sidebar-foreground">Archway</h1>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                <NavItem href="/" icon={<FolderTree size={20} />} label="Repo Explorer" active />
                <NavItem href="/graph" icon={<Network size={20} />} label="Dependency Graph" />
                <NavItem href="/chat" icon={<MessageSquare size={20} />} label="AI Assistant" />
            </nav>

            <div className="p-4 border-t border-sidebar-border">
                <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" />

                <div className="mt-4 pt-4 border-t border-sidebar-border/50">
                    {user ? (
                        <div className="flex items-center gap-3 px-3">
                            <Avatar className="h-9 w-9 border border-border/50">
                                <AvatarImage src={user.user_metadata.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    <UserIcon size={16} />
                                </AvatarFallback>
                            </Avatar>
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
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-sidebar-primary/30 hover:bg-sidebar-primary/10 text-sidebar-foreground"
                            onClick={() => signInWithGithub()}
                        >
                            <Github className="mr-2 h-4 w-4" />
                            Login with GitHub
                        </Button>
                    )}
                </div>

                <div className="mt-4 pt-2 border-t border-sidebar-border/30">
                    <p className="text-[10px] text-sidebar-foreground/30 px-3">Archway v1.0.0</p>
                </div>
            </div>
        </aside>
    );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group
        ${active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </Link>
    );
}
