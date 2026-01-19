"use client";

import { useEffect, useState, Suspense, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileTree } from "@/components/features/file-tree/FileTree";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { analyzeRepository } from "@/app/actions/analyze";
import { readFileContent } from "@/app/actions/file";
import { generateProjectSummary } from "@/app/actions/ai";
import { chatWithRepo, ChatMessage } from "../actions/ai";
import { indexRepository } from "../actions/rag";
import { createClient } from "@/lib/supabase/client";
import { getRepoGraph } from "@/app/actions/graph";
import { GuardrailsModal } from "@/components/features/graph/GuardrailsModal";
import { ChatInterface } from "@/components/features/chat/ChatInterface";
import { DependencyGraph } from "@/components/features/graph/DependencyGraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FileNode } from "@/lib/file-system";
import type { GraphData } from "@/lib/structure-parser";
import { Loader2, Code, Share2, ChevronRight, ChevronLeft, MessageSquare, Database, Search } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getLanguage } from '@/lib/languages';
import { Node, Edge } from "@xyflow/react";
import { NodeEditorModal } from "@/components/features/editor/NodeEditorModal";
import { updateFileContent } from "@/app/actions/file";

export default function WorkspacePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
            <WorkspaceContent />
        </Suspense>
    )
}

function WorkspaceContent() {
    const searchParams = useSearchParams();
    const repoUrl = searchParams.get("repo");

    const [loading, setLoading] = useState(true);
    const [tree, setTree] = useState<FileNode[]>([]);
    const [localPath, setLocalPath] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState("// Select a file to view content");
    const [contentLoading, setContentLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [summary, setSummary] = useState<string | null>(null);
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [activeTab, setActiveTab] = useState("code");
    const [isGraphMaximized, setIsGraphMaximized] = useState(false);
    const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
    const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
    const [virtualNodes, setVirtualNodes] = useState<Node[]>([]);
    const [virtualEdges, setVirtualEdges] = useState<Edge[]>([]);

    // Lifted Graph State
    const [zones, setZones] = useState<Node[]>([]);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Explorer State
    const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);

    // RAG State
    const [isIndexing, setIsIndexing] = useState(false);
    const [indexProgress, setIndexProgress] = useState(0);
    const [repoId, setRepoId] = useState<string | null>(null);

    // Editor Modal state
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorNodePath, setEditorNodePath] = useState<string | null>(null);
    const [editorContent, setEditorContent] = useState("");

    const handleAIVirtualNode = async (nodePath: string, lines: number[]) => {
        // ... (existing logic)
        if (!localPath || !nodePath || lines.length === 0) return;
        try {
            const { content } = await readFileContent(localPath, nodePath.trim());
            if (!content) throw new Error("File not found or empty");

            const linesArr = content.split('\n');
            const start = Math.max(1, Math.min(...lines));
            const end = Math.min(linesArr.length, Math.max(...lines));

            const sliceContent = linesArr.slice(start - 1, end).join('\n');
            const rangeStr = `${start}-${end}`;

            const sliceId = `slice-${nodePath}-${rangeStr}`;
            const newNode: Node = {
                id: sliceId,
                type: 'virtual',
                position: { x: 0, y: 0 },
                data: {
                    id: sliceId,
                    label: `Focus: ${rangeStr}`,
                    sourceFile: nodePath,
                    lineRange: rangeStr,
                    content: sliceContent,
                    isExpanded: true,
                    onToggle: (id: string) => {
                        setVirtualNodes(prev => prev.filter(n => n.id !== id));
                        setVirtualEdges(prev => prev.filter(e => e.target !== id));
                    }
                }
            };

            const newEdge: Edge = {
                id: `edge-${nodePath}-${sliceId}`,
                source: nodePath.trim(),
                target: sliceId,
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                type: 'smoothstep'
            };

            setVirtualNodes(prev => [...prev.filter(n => n.id !== sliceId), newNode]);
            setVirtualEdges(prev => [...prev.filter(e => e.id !== newEdge.id), newEdge]);

            // Clear general highlighting to focus on the split
            setHighlightedNodeId(null);
            setHighlightedLines([]);

            setActiveTab("graph");
        } catch (e) {
            console.error("AI Split Error:", e);
        }
    };

    const handleCreateAIZone = (name: string, color: string, nodePaths: string[]) => {
        if (!graphData) return;

        // Find nodes to encompass
        const targetNodes = graphData.nodes.filter(n => nodePaths.some(p => n.id.includes(p)));
        if (targetNodes.length === 0) return;

        // Calculate bounds (this is tricky without knowing rendered positions, 
        // but we can estimate or use a default size around the first node)
        // For now, let's create a zone around the first target node as a starting point
        const targetNode = targetNodes[0];

        const newZone: Node = {
            id: `zone-${Date.now()}`,
            type: 'zone',
            position: { x: 0, y: 0 }, // DependencyGraph layout will handle zones if we sync them correctly, 
            // but zones are usually manual. We'll give it a default.
            data: {
                label: name,
                color: color || "#3b82f6",
                width: 300,
                height: 200,
                onDelete: (id: string) => {
                    setZones((prev) => prev.filter((z) => z.id !== id));
                }
            }
        };

        setZones(prev => [...prev, newZone]);
        setActiveTab("graph");
    };

    const loadFile = useCallback(async (path: string, currentLocalPath: string) => {
        setSelectedFile(path);
        setContentLoading(true);
        try {
            const result = await readFileContent(currentLocalPath, path);
            setFileContent(result.content);
        } catch (e) {
            setFileContent("// Error loading file");
        } finally {
            setContentLoading(false);
        }
    }, []);

    const handleNodeClick = useCallback(async (nodeId: string) => {
        if (!localPath) return;
        // Just load file content to sidebar - modal opens only via pop-out button
        loadFile(nodeId, localPath);
    }, [localPath, loadFile]);

    const handleEditorSave = useCallback(async (path: string, content: string) => {
        if (!localPath) return false;
        const result = await updateFileContent(localPath, path, content);
        if (result.success) {
            if (path === selectedFile) {
                setFileContent(content);
            }
            return true;
        }
        return false;
    }, [localPath, selectedFile]);

    const handleOpenInModal = useCallback((filePath: string, content: string) => {
        setEditorNodePath(filePath);
        setEditorContent(content);
        setIsEditorOpen(true);
    }, []);

    const handleVirtualNodeUpdate = useCallback((nodeId: string, newContent: string) => {
        setVirtualNodes(prev => prev.map(node =>
            node.id === nodeId
                ? { ...node, data: { ...node.data, content: newContent } }
                : node
        ));
    }, []);

    const handleIndexRepo = async () => {
        if (!localPath || !repoUrl) return;
        setIsIndexing(true);
        try {
            const supabase = createClient();
            const { data: repo } = await supabase.from("repositories").select("id").eq("url", repoUrl).single();
            if (repo) {
                const graphRes = await getRepoGraph(localPath, repoUrl || undefined);
                const res = await indexRepository(localPath, repo.id);
                if (res.success) {
                    alert(`Successfully indexed ${res.count} chunks!`);
                } else {
                    alert(`Indexing failed: ${res.error}`);
                }
            }
        } catch (e) {
            console.error("Index Error:", e);
        } finally {
            setIsIndexing(false);
        }
    };

    useEffect(() => {
        if (!repoUrl) {
            setLoading(false);
            return;
        }

        async function loadRepo() {
            try {
                const result = await analyzeRepository(repoUrl!);
                if (result.success && result.fileTree) {
                    setTree(result.fileTree);
                    setLocalPath(result.localPath || null);

                    // Generate summary
                    generateProjectSummary(result.fileTree).then(sum => setSummary(sum));

                    // Generate graph
                    if (result.localPath) {
                        getRepoGraph(result.localPath, repoUrl || undefined).then(res => {
                            if (res.success && res.data) setGraphData(res.data);
                        });
                    }

                    // Fetch Repo ID for Guardrails
                    const supabase = createClient();
                    supabase.from("repositories")
                        .select("id")
                        .eq("url", repoUrl)
                        .single()
                        .then(({ data }) => {
                            if (data) setRepoId(data.id);
                        });
                } else {
                    setError(result.message || "Failed to analyze repo");
                }
            } catch (e) {
                setError("An unexpected error occurred");
            } finally {
                setLoading(false);
            }
        }

        loadRepo();
    }, [repoUrl]);

    // Resizable sidebar logic
    const [chatWidth, setChatWidth] = useState(380);
    const [isChatCollapsed, setIsChatCollapsed] = useState(true);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                const newWidth = window.innerWidth - mouseMoveEvent.clientX - 24; // padding adjustment
                if (newWidth > 250 && newWidth < 800) {
                    setChatWidth(newWidth);
                }
            }
        },
        [isResizing]
    );

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResizing);
        }
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    return (
        <AppLayout>
            <div className={`flex gap-4 h-[calc(100vh-6rem)] overflow-hidden ${isResizing ? 'select-none' : ''}`}>
                {/* Main Content Area (Explorer + Center) */}
                <div className="flex-1 flex gap-4 overflow-hidden min-w-0">
                    {/* Left Panel: File Explorer - Hidden when graph is maximized or collapsed */}
                    <div className={`flex flex-col h-full animate-in fade-in slide-in-from-left duration-300 shrink-0 transition-all duration-300 ${isExplorerCollapsed || isGraphMaximized ? 'w-0 opacity-0 pointer-events-none' : 'w-64'}`}>
                        <Card className="h-full glass-panel flex flex-col relative overflow-visible min-h-0">
                            {/* Collapse Button */}
                            <button
                                onClick={() => setIsExplorerCollapsed(true)}
                                className="absolute -right-3 top-10 z-10 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
                                title="Collapse Explorer"
                            >
                                <ChevronLeft size={12} />
                            </button>

                            <div className="p-3 border-b border-border/50 flex items-center justify-between">
                                <h2 className="font-semibold text-[10px] text-muted-foreground uppercase tracking-widest">
                                    {loading ? "Scanning..." : (error ? "Error" : "Explorer")}
                                </h2>
                                <div className="flex items-center gap-1">
                                    {repoId && (
                                        <GuardrailsModal
                                            repoId={repoId}
                                            onRulesChange={() => {
                                                // Refresh graph to show violations
                                                if (localPath) {
                                                    getRepoGraph(localPath, repoUrl || undefined).then(res => {
                                                        if (res.success && res.data) setGraphData(res.data);
                                                    });
                                                }
                                            }}
                                        />
                                    )}
                                    <button
                                        onClick={handleIndexRepo}
                                        disabled={isIndexing || loading}
                                        className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
                                        title="Build semantic index for RAG search"
                                    >
                                        {isIndexing ? <Loader2 size={10} className="animate-spin" /> : <Database size={10} />}
                                        {isIndexing ? "Indexing..." : "Index"}
                                    </button>
                                </div>
                            </div>
                            <ScrollArea className="flex-1 p-2">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                                        <Loader2 className="animate-spin" size={16} />
                                        <span className="text-[10px]">Cloning...</span>
                                    </div>
                                ) : error ? (
                                    <div className="p-4 text-red-400 text-xs text-center">{error}</div>
                                ) : (
                                    <FileTree
                                        data={tree}
                                        onSelect={(path) => {
                                            if (localPath) {
                                                loadFile(path, localPath);
                                                setActiveTab("code");
                                            }
                                        }}
                                        selectedPath={selectedFile || ""}
                                    />
                                )}
                            </ScrollArea>
                        </Card>
                    </div>

                    {/* Explorer Expand Trigger */}
                    {isExplorerCollapsed && !isGraphMaximized && (
                        <button
                            onClick={() => setIsExplorerCollapsed(false)}
                            className="w-10 h-full border-r border-border/50 bg-card/10 hover:bg-card/30 flex items-center justify-center transition-all group shrink-0"
                            title="Expand Explorer"
                        >
                            <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>
                    )}

                    {/* Center Panel: Code Viewer & Graph */}
                    <div className="flex-1 flex flex-col h-full min-w-0 transition-all duration-300">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            <div className="mb-2 flex items-center justify-between">
                                <TabsList className="bg-muted/30 p-1 h-9">
                                    <TabsTrigger value="code" className="gap-2 text-xs h-7"><Code size={12} /> Code</TabsTrigger>
                                    <TabsTrigger value="graph" className="gap-2 text-xs h-7"><Share2 size={12} /> Graph</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="code" className="flex-1 m-0 h-full overflow-hidden">
                                <Card className="h-full glass-panel flex flex-col overflow-hidden">
                                    <div className="p-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                        <span className="text-[11px] font-medium truncate opacity-70 text-primary">{selectedFile || "No file selected"}</span>
                                    </div>
                                    <div className="flex-1 overflow-auto bg-[#0d0d0d]">
                                        {contentLoading ? (
                                            <div className="p-6 text-xs font-mono text-muted-foreground animate-pulse">Loading content...</div>
                                        ) : (
                                            <SyntaxHighlighter
                                                language={getLanguage(selectedFile || "")}
                                                style={vscDarkPlus}
                                                customStyle={{
                                                    margin: 0,
                                                    padding: '1.25rem',
                                                    background: 'transparent',
                                                    fontSize: '13px',
                                                    lineHeight: '1.6',
                                                }}
                                                showLineNumbers={true}
                                                lineNumberStyle={{
                                                    minWidth: '3em',
                                                    paddingRight: '1em',
                                                    color: '#4a4a4a',
                                                    textAlign: 'right',
                                                    userSelect: 'none',
                                                    opacity: 0.5
                                                }}
                                            >
                                                {fileContent || " "}
                                            </SyntaxHighlighter>
                                        )}
                                    </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="graph" className="flex-1 m-0 h-full overflow-hidden">
                                <Card className="h-full glass-panel flex flex-col overflow-hidden p-0 relative">
                                    {graphData ? (
                                        <DependencyGraph
                                            data={graphData}
                                            localPath={localPath}
                                            isMaximized={isGraphMaximized}
                                            onMaximizeToggle={() => setIsGraphMaximized(!isGraphMaximized)}
                                            highlightedId={highlightedNodeId}
                                            highlightedLines={highlightedLines}
                                            onPaneClick={() => {
                                                setHighlightedNodeId(null);
                                                setHighlightedLines([]);
                                            }}
                                            virtualNodes={virtualNodes}
                                            virtualEdges={virtualEdges}
                                            onVirtualNodesChange={setVirtualNodes}
                                            onVirtualEdgesChange={setVirtualEdges}
                                            onNodeClick={handleNodeClick}
                                            onOpenInModal={handleOpenInModal}
                                            onVirtualNodeUpdate={handleVirtualNodeUpdate}
                                            // Lifted states
                                            zones={zones}
                                            onZonesChange={setZones}
                                            expandedIds={expandedIds}
                                            onExpandedIdsChange={setExpandedIds}
                                            chatProps={{
                                                messages,
                                                isLoading,
                                                onSendMessage: handleSendMessage
                                            }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                                            Generating graph...
                                        </div>
                                    )}
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* Resizer & Toggle Handle */}
                {!isGraphMaximized && (
                    <div className="relative flex items-center shrink-0 translate-x-3 z-50">
                        {/* Resizer line */}
                        {!isChatCollapsed && (
                            <div
                                className={`w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors bg-border/20 rounded-full my-4 ${isResizing ? 'bg-primary' : ''}`}
                                onMouseDown={startResizing}
                            />
                        )}

                        {/* Toggle Button */}
                        <button
                            onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                            className="absolute left-1/2 -translate-x-1/2 w-6 h-12 bg-card border border-border shadow-lg rounded-full flex items-center justify-center hover:bg-muted transition-all group"
                            title={isChatCollapsed ? "Open AI Chat" : "Collapse AI Chat"}
                        >
                            {isChatCollapsed ? (
                                <ChevronLeft size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            ) : (
                                <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            )}
                        </button>
                    </div>
                )}

                {/* Right Panel: AI Chat */}
                {!isGraphMaximized && (
                    <div
                        style={{ width: isChatCollapsed ? 0 : chatWidth }}
                        className={`flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${isChatCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                        <ChatInterface
                            fileTree={tree}
                            currentFileContent={fileContent}
                            repoUrl={repoUrl}
                            graphNodes={graphData?.nodes}
                            onAction={(action) => {
                                if (action.command === 'focus' && action.node) {
                                    setHighlightedNodeId(action.node);
                                    setHighlightedLines(action.lines || []);
                                    setActiveTab("graph");
                                } else if (action.command === 'split' && action.node && action.lines && action.lines.length > 0) {
                                    handleAIVirtualNode(action.node, action.lines);
                                } else if (action.command === 'navigate' && action.node) {
                                    // Find node in tree to determine if it's a file or directory
                                    const findNode = (nodes: FileNode[], path: string): FileNode | null => {
                                        for (const node of nodes) {
                                            if (node.path === path) return node;
                                            if (node.children) {
                                                const found = findNode(node.children, path);
                                                if (found) return found;
                                            }
                                        }
                                        return null;
                                    };

                                    const targetNode = findNode(tree, action.node);
                                    if (targetNode) {
                                        if (targetNode.type === 'file') {
                                            if (localPath) loadFile(targetNode.path, localPath);
                                            setActiveTab("code");
                                        } else {
                                            setExpandedIds(prev => new Set([...prev, targetNode.path]));
                                            setActiveTab("graph");
                                        }
                                    } else {
                                        // Fallback if node not found (maybe truncated or external)
                                        const isFileFallback = action.node.includes('.');
                                        if (isFileFallback) {
                                            if (localPath) loadFile(action.node, localPath);
                                            setActiveTab("code");
                                        } else {
                                            setExpandedIds(prev => new Set([...prev, action.node!]));
                                            setActiveTab("graph");
                                        }
                                    }
                                } else if (action.command === 'createZone' && action.name && action.nodes) {
                                    handleCreateAIZone(action.name, action.color || "#3b82f6", action.nodes);
                                }
                            }}
                        />
                    </div>
                )}

                {/* Collapsed Chat Trigger Button (floating on right edge when collapsed) */}
                {isChatCollapsed && !isGraphMaximized && (
                    <button
                        onClick={() => setIsChatCollapsed(false)}
                        className="absolute right-4 bottom-4 w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50 animate-in zoom-in"
                    >
                        <MessageSquare size={20} />
                    </button>
                )}

                {/* Mini IDE Modal */}
                {isEditorOpen && editorNodePath && (
                    <NodeEditorModal
                        isOpen={isEditorOpen}
                        onClose={() => setIsEditorOpen(false)}
                        filePath={editorNodePath}
                        initialContent={editorContent}
                        onSave={handleEditorSave}
                    />
                )}
            </div>
        </AppLayout>
    );
}
