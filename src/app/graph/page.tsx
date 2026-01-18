"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { analyzeRepository } from "@/app/actions/analyze";
import { getRepoGraph } from "@/app/actions/graph";
import { DependencyGraph } from "@/components/features/graph/DependencyGraph";
import type { GraphData } from "@/lib/structure-parser";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Node, Edge } from "@xyflow/react";

export default function GraphPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
            <GraphContent />
        </Suspense>
    )
}

function GraphContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const repoUrl = searchParams.get("repo");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [localPath, setLocalPath] = useState<string | null>(null);
    const [virtualNodes, setVirtualNodes] = useState<Node[]>([]);
    const [virtualEdges, setVirtualEdges] = useState<Edge[]>([]);

    useEffect(() => {
        if (!repoUrl) {
            // No repo provided, redirect to main page
            router.push("/");
            return;
        }

        async function loadGraph() {
            try {
                const result = await analyzeRepository(repoUrl!);
                if (result.success && result.localPath) {
                    setLocalPath(result.localPath);
                    const graphResult = await getRepoGraph(result.localPath);
                    if (graphResult.success && graphResult.data) {
                        setGraphData(graphResult.data);
                    } else {
                        setError("Failed to generate graph");
                    }
                } else {
                    setError(result.message || "Failed to analyze repository");
                }
            } catch (e) {
                setError("An unexpected error occurred");
            } finally {
                setLoading(false);
            }
        }

        loadGraph();
    }, [repoUrl, router]);

    if (!repoUrl) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
                    <div className="text-center">
                        <p className="text-muted-foreground mb-4">No repository selected</p>
                        <Link href="/" className="text-primary hover:underline flex items-center justify-center gap-2">
                            <ArrowLeft size={16} /> Go to Repo Explorer
                        </Link>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <span className="text-muted-foreground text-sm">Analyzing repository...</span>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (error) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
                    <div className="text-center">
                        <p className="text-red-400 mb-4">{error}</p>
                        <Link href="/" className="text-primary hover:underline flex items-center justify-center gap-2">
                            <ArrowLeft size={16} /> Go Back
                        </Link>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="h-[calc(100vh-6rem)] p-4">
                <Card className="h-full border-border/50 bg-card/10 backdrop-blur-sm flex flex-col overflow-hidden p-0 relative">
                    {graphData ? (
                        <DependencyGraph
                            data={graphData}
                            localPath={localPath}
                            isMaximized={true}
                            virtualNodes={virtualNodes}
                            virtualEdges={virtualEdges}
                            onVirtualNodesChange={setVirtualNodes}
                            onVirtualEdgesChange={setVirtualEdges}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                            No graph data available
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
