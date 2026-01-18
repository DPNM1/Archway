"use client";

import Link from "next/link";
import Image from "next/image";
import {
    FolderTree,
    Network,
    MessageSquare,
    Settings,
    Github,
    LogOut,
    User as UserIcon,
    ChevronLeft,
    ChevronRight,
    History as HistoryIcon,
    Plus
} from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { getUser, signOut, getRepositoryHistory } from "@/app/actions/auth";
import { downloadRepository } from "@/app/actions/download";
import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download } from "lucide-react";

export function AppSidebar() {
    const [user, setUser] = useState<User | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            const user = await getUser();
            setUser(user);
            if (user) {
                const historyData = await getRepositoryHistory();
                setHistory(historyData);
            }
        };
        init();
    }, []);

    const handleDownload = async (repo: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (downloadingId) return;

        setDownloadingId(repo.id);
        try {
            const res = await downloadRepository(repo.url);
            if (res.success && res.data) {
                // Convert base64 to blob
                const byteCharacters = atob(res.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: "application/zip" });

                // Trigger download
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `${repo.name}-codebase.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert("Failed to download codebase: " + res.error);
            }
        } catch (error) {
            console.error(error);
            alert("Error downloading repository.");
        } finally {
            setDownloadingId(null);
        }
    };


    return (
        <aside className={`h-screen bg-black border-r border-white/5 hidden md:flex flex-col relative transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'}`}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-8 z-10 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform border border-white/10"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className={`p-6 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="relative w-8 h-8 shrink-0">
                    <Image
                        src="/assets/logo.png"
                        alt="Archway Logo"
                        fill
                        className="object-contain"
                    />
                </div>
                {!isCollapsed && (
                    <h1 className="text-xl font-bold tracking-tighter text-white">ARCHWAY</h1>
                )}
            </div>

            <nav className={`py-4 space-y-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
                <Suspense fallback={null}>
                    <NavLinks isCollapsed={isCollapsed} />
                </Suspense>
            </nav>

            {/* History Section */}
            {!isCollapsed && user && (
                <div className="flex-1 overflow-hidden flex flex-col mt-4 px-4">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">History</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-white/10 text-slate-500 hover:text-white"
                            onClick={() => router.push('/')}
                        >
                            <Plus size={14} />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 -mx-2 px-2">
                        <div className="space-y-1">
                            {history.length > 0 ? (
                                history.map((repo) => (
                                    <div key={repo.id} className="relative group w-full">
                                        <button
                                            onClick={() => router.push(`/workspace?repo=${encodeURIComponent(repo.url)}`)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left pr-8"
                                        >
                                            <HistoryIcon size={14} className="shrink-0 text-slate-600 group-hover:text-white transition-colors" />
                                            <span className="truncate flex-1">{repo.name}</span>
                                        </button>
                                        <button
                                            onClick={(e) => handleDownload(repo, e)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-white transition-opacity"
                                            title="Download Project Codebase"
                                            disabled={downloadingId === repo.id}
                                        >
                                            <span className="sr-only">Download Codebase</span>
                                            {downloadingId === repo.id ? (
                                                <Loader2 size={12} className="animate-spin text-white" />
                                            ) : (
                                                <Download size={14} />
                                            )}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="px-3 py-4 text-xs text-slate-600 italic">No recent projects</p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            )}

            <div className={`p-4 border-t border-white/5 ${isCollapsed ? 'px-2' : ''} mt-auto`}>
                <NavItem
                    href="/settings"
                    icon={<Settings size={20} />}
                    label="Settings"
                    isCollapsed={isCollapsed}
                />

                <div className="mt-4 pt-4 border-t border-white/5">
                    {user ? (
                        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-3'}`}>
                            <Avatar className="h-9 w-9 border border-white/10 shrink-0 bg-white/5">
                                <AvatarImage src={user.user_metadata.avatar_url} />
                                <AvatarFallback className="bg-white/5 text-white">
                                    <UserIcon size={16} />
                                </AvatarFallback>
                            </Avatar>
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-white">
                                        {user.user_metadata.full_name || user.email}
                                    </p>
                                    <button
                                        onClick={() => signOut()}
                                        className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                                    >
                                        <LogOut size={10} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`${isCollapsed ? 'flex justify-center' : 'px-3'}`}>
                            <Button
                                variant="outline"
                                size="sm"
                                className={`bg-white/5 border-white/10 hover:bg-white/10 text-white ${isCollapsed ? 'w-10 h-10 p-0 rounded-full' : 'w-full'}`}
                                onClick={() => router.push('/')}
                            >
                                <Github className={isCollapsed ? "h-5 w-5" : "mr-2 h-4 w-4"} />
                                {!isCollapsed && "Sign In"}
                            </Button>
                        </div>
                    )}
                </div>
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
        <div className="space-y-1">
            <NavItem
                href={`/explorer${query}`}
                icon={<FolderTree size={18} />}
                label="Explorer"
                active={pathname === "/explorer"}
                isCollapsed={isCollapsed}
            />
            <NavItem
                href={`/graph${query}`}
                icon={<Network size={18} />}
                label="Graph"
                active={pathname === "/graph"}
                isCollapsed={isCollapsed}
            />
            <NavItem
                href={`/workspace${query}`}
                icon={<MessageSquare size={18} />}
                label="Workspace"
                active={pathname === "/workspace"}
                isCollapsed={isCollapsed}
            />
        </div>
    );
}

function NavItem({ href, icon, label, active, isCollapsed }: { href: string; icon: React.ReactNode; label: string; active?: boolean; isCollapsed?: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 py-2 rounded-xl transition-all duration-300 group
        ${isCollapsed ? 'justify-center px-0' : 'px-3'}
        ${active
                    ? "bg-white text-black shadow-2xl"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
            title={isCollapsed ? label : undefined}
        >
            <div className={active ? "text-black" : "text-slate-500 group-hover:text-white transition-colors"}>
                {icon}
            </div>
            {!isCollapsed && <span className="font-semibold text-sm tracking-tight">{label}</span>}
        </Link>
    );
}
