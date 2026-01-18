"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AuthErrorPage() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white p-6">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="bg-rose-500/10 p-4 rounded-full">
                        <AlertTriangle className="h-12 w-12 text-rose-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Authentication Error</h1>
                    <p className="text-slate-400">
                        There was a problem signing you in. This could be due to an expired link, invalid configuration, or network issue.
                    </p>
                </div>

                <div className="pt-4">
                    <Button asChild className="bg-white text-black hover:bg-slate-200">
                        <Link href="/">Back to Home</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
