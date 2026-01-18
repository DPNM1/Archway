"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Github, Mail, Loader2 } from "lucide-react";

interface LoginDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ isOpen, onOpenChange }: LoginDialogProps) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const supabase = createClient();

    // Debugging Env Vars
    useEffect(() => {
        console.log("--- Supabase Client Debug ---");
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        console.log("Is Supabase URL defined?", !!url);
        console.log("Supabase URL:", url);
        console.log("Is Anon Key defined?", !!key);
        console.log("Anon Key Length:", key ? key.length : 0);
        console.log("-----------------------------");
    }, []);

    const handleGithubLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) setMessage(error.message);
        setLoading(false);
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        console.log("Attempting login with:", email);
        console.log("Redirect URL:", `${window.location.origin}/auth/callback`);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            console.error("Auth Error:", error);
            setMessage(error.message);
        } else {
            setMessage("Check your email for the login link!");
        }
        setLoading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] bg-slate-950 border-white/10 shadow-2xl backdrop-blur-xl">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="text-2xl font-bold text-center tracking-tight">Welcome to Archway</DialogTitle>
                    <DialogDescription className="text-center text-slate-400">
                        Sign in to save your repository analysis and access them anywhere.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <Button
                        variant="outline"
                        onClick={handleGithubLogin}
                        disabled={loading}
                        className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white h-12 text-base font-medium transition-all group"
                    >
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Github className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                        )}
                        Continue with GitHub
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-950 px-2 text-slate-500 font-medium">Or continue with email</span>
                        </div>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-white/5 border-white/10 focus:border-white/20 transition-all h-11 text-white placeholder:text-slate-600"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full bg-white text-black hover:bg-slate-200 h-11 text-base font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Mail className="mr-2 h-4 w-4" />
                            )}
                            Send Magic Link
                        </Button>
                    </form>

                    {message && (
                        <p className={`text-sm text-center font-medium animate-in fade-in slide-in-from-top-2 ${message.includes("Check") ? "text-emerald-400" : "text-rose-400"
                            }`}>
                            {message}
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
