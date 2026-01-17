"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Github, ArrowRight, HardDrive, Network, Bot, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);
    // Redirect to workspace with repo URL
    router.push(`/workspace?repo=${encodeURIComponent(url)}`);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Hero Section */}
        <section className="text-center space-y-4 py-12">
          <div className="inline-flex items-center justify-center p-2 rounded-full bg-primary/10 text-primary mb-4 ring-1 ring-primary/20">
            <span className="text-xs font-semibold px-2">v1.0 Early Access</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
            Understanding Codebases <br /> Just Got Easier.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Archway analyzes GitHub repositories to generate interactive file trees, dependency graphs, and AI-powered documentation in seconds.
          </p>
        </section>

        {/* Input Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl shadow-primary/5">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Github className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Paste GitHub Repository URL (e.g., https://github.com/facebook/react)"
                  className="pl-10 h-12 text-base bg-background/50 border-input/50 focus:border-primary/50 transition-all"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />
              </div>
              <Button
                size="lg"
                className="h-12 px-8 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all"
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                {loading ? "Analyzing..." : "Analyze Repo"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center md:text-left">
              Try <span className="underline cursor-pointer hover:text-foreground transition-colors" onClick={() => setUrl("https://github.com/shadcn/ui")}>shadcn/ui</span>
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-4 pt-8">
          <FeatureCard
            icon={<HardDrive className="h-6 w-6 text-foreground" />}
            title="File Visualization"
            description="Navigate code with an interactive file tree and instant preview."
          />
          <FeatureCard
            icon={<Network className="h-6 w-6 text-foreground" />}
            title="Dependency Graph"
            description="Visualize module relationships and import cycles instantly."
          />
          <FeatureCard
            icon={<Bot className="h-6 w-6 text-foreground" />}
            title="AI Assistant"
            description="Chat with Llama 3.3 to understand logic and generate docs."
          />
        </div>
      </div>
    </AppLayout>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="bg-card/30 border-white/5 hover:bg-card/50 hover:border-primary/20 transition-all duration-300">
      <CardHeader>
        <div className="mb-2 p-3 w-fit rounded-lg bg-primary/10">{icon}</div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}
