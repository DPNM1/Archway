"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe } from "lucide-react";

export default function ExplorerPage() {
    const router = useRouter();
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleAnalyze = () => {
        if (!url) return;
        setIsLoading(true);
        // Redirect to workspace with repo query param
        router.push(`/workspace?repo=${encodeURIComponent(url)}`);
    };

    return (
        <AppLayout>
            <div className="h-[calc(100vh-6rem)] flex items-center justify-center p-6">
                <Card className="max-w-2xl w-full glass-panel p-12 flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight text-white">Project Explorer</h1>
                        <p className="text-slate-400 text-lg max-w-lg mx-auto">
                            Enter a GitHub repository URL to visualize its architecture, analyze dependencies, and chat with the codebase.
                        </p>
                    </div>

                    <div className="w-full max-w-lg relative group">
                        <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl group-hover:bg-white/10 transition-all duration-500" />
                        <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl p-2 pl-4 backdrop-blur-xl focus-within:border-white/30 transition-all">
                            <Globe className="h-5 w-5 text-slate-500 shrink-0" />
                            <input
                                type="text"
                                placeholder="Paste GitHub repository URL..."
                                className="bg-transparent border-none outline-none flex-1 px-4 text-white placeholder:text-slate-600 font-medium w-full min-w-0"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                                disabled={isLoading}
                            />
                            <Button
                                onClick={handleAnalyze}
                                disabled={isLoading}
                                className="bg-white text-black hover:bg-slate-200 rounded-xl px-6 font-bold shadow-2xl h-11 shrink-0"
                            >
                                {isLoading ? "Loading..." : "Analyze"}
                                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
