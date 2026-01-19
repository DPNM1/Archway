"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, BackgroundVariant, Node, Edge, Position, Handle, NodeProps, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import type { GraphData, GraphNode, MetricData } from '@/lib/structure-parser';
import { Folder, File, Maximize2, Minimize2, ChevronRight, X, Pencil, Check, RotateCcw, Scissors, ExternalLink, Square, Palette, Plus, Trash2, Activity, MessageSquare, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { readFileContent, updateFileContent } from '@/app/actions/file';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { metricToHSL } from '@/lib/heatmap-utils';

import { getLanguage, getLanguageMetadata } from '@/lib/languages';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatInterface } from '../chat/ChatInterface';

interface StructureGraphProps {
    data: GraphData;
    onNodeClick?: (nodeId: string) => void;
    localPath?: string | null;
    isMaximized?: boolean;
    onMaximizeToggle?: () => void;
    highlightedId?: string | null;
    highlightedLines?: number[];
    onPaneClick?: () => void;
    virtualNodes?: Node[];
    virtualEdges?: Edge[];
    onVirtualNodesChange?: (nodes: (prev: Node[]) => Node[]) => void;
    onVirtualEdgesChange?: (edges: (prev: Edge[]) => Edge[]) => void;
    onOpenInModal?: (filePath: string, content: string) => void;
    onVirtualNodeUpdate?: (nodeId: string, newContent: string) => void;
    // Lifted state
    zones?: Node[];
    onZonesChange?: (zones: Node[] | ((prev: Node[]) => Node[])) => void;
    expandedIds?: Set<string>;
    onExpandedIdsChange?: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

interface CustomNodeData {
    id: string;
    label: string;
    expanded?: boolean;
    isExpanded?: boolean;
    localPath?: string | null;
    onToggle?: (id: string) => void;
    isHighlighted?: boolean;
    highlightedLines?: number[];
    onSplit?: (parentId: string, range: string, sliceContent: string) => void;
    onOpenInModal?: (filePath: string, content: string) => void;
    onUpdateContent?: (nodeId: string, newContent: string) => void;
    sourceFile?: string;
    lineRange?: string;
    content?: string;
    // Zone properties
    width?: number;
    height?: number;
    color?: string;
    onDelete?: (id: string) => void;
    // Heatmap properties
    metrics?: MetricData;
    heatmapMode?: 'off' | 'complexity' | 'coupling' | 'size';
    bootDelay?: number;
    isBooted?: boolean;
    [key: string]: any;
}

export type HeatmapMode = 'off' | 'complexity' | 'coupling' | 'size';

// Zone Node for Custom Areas
const ZoneNode = ({ data }: NodeProps<Node<CustomNodeData>>) => {
    return (
        <motion.div
            layout
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
            }}
            className="rounded-xl border-2 border-dashed flex flex-col relative group overflow-hidden shadow-sm hover:shadow-md transition-all"
            style={{
                width: data.width,
                height: data.height,
                minWidth: 100,
                minHeight: 100,
                backgroundColor: `${data.color || '#3b82f6'}15`, // 15% opacity
                borderColor: data.color || '#3b82f6',
            }}
        >
            <div
                className="w-full h-9 px-3 flex items-center justify-between border-b border-white/5 shrink-0 backdrop-blur-sm"
                style={{ backgroundColor: `${data.color || '#3b82f6'}80` }}
            >
                <span className="text-sm font-bold text-white drop-shadow-md truncate max-w-[80%] tracking-tight">
                    {data.label || "Untitled Zone"}
                </span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Call delete handler
                        if (data.onDelete) {
                            data.onDelete(data.id);
                        } else {
                            console.warn("No onDelete handler for zone", data.id);
                        }
                    }}
                    className="flex items-center justify-center h-6 w-6 rounded-full bg-black/20 text-white/90 hover:bg-black/40 hover:text-red-400 transition-all pointer-events-auto"
                    title="Delete Zone"
                >
                    <Trash2 size={14} />
                </button>
            </div>
            {/* Clickable background for drag */}
            <div className="w-full flex-1 touch-none" />
        </motion.div>
    );
};

// --- THEMES ---
const GRAPH_THEMES = {
    cyberpunk: {
        label: "Cyberpunk",
        bg: "#050505",
        grid: "#222",
        nodeBg: "rgba(10,10,12,0.6)",
        nodeBorder: "rgba(255,255,255,0.15)",
        edge: "#555"
    },
    blueprint: {
        label: "Blueprint",
        bg: "#1a2c4e",
        grid: "rgba(255,255,255,0.1)",
        nodeBg: "rgba(255,255,255,0.1)",
        nodeBorder: "rgba(255,255,255,0.3)",
        edge: "rgba(255,255,255,0.4)"
    },
    minimal: {
        label: "Minimal",
        bg: "#ffffff",
        grid: "#eee",
        nodeBg: "#fff",
        nodeBorder: "#ddd",
        edge: "#ccc"
    }
};

type GraphTheme = keyof typeof GRAPH_THEMES;

// Border Beam Component for sophisticated edges
const BorderBeam = () => (
    <div className="border-beam-container">
        <div className="border-beam" />
    </div>
);

// Custom Neural Edge for animated data flow
const NeuralEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}: any) => {
    const [edgePath] = useMemo(() => {
        // Simple cubic bezier calculation or use XYFlow utilities
        // For simplicity, we'll use a direct path or fetch from XYFlow if available
        // But since we want "Neural" feel, let's make it a bit smoother
        const diffX = targetX - sourceX;
        const diffY = targetY - sourceY;
        const path = `M${sourceX},${sourceY} C${sourceX + diffX / 2},${sourceY} ${sourceX + diffX / 2},${targetY} ${targetX},${targetY}`;
        return [path];
    }, [sourceX, sourceY, targetX, targetY]);

    return (
        <>
            <path
                id={id}
                style={{ ...style, strokeWidth: 3, stroke: 'rgba(255,255,255,0.05)', fill: 'none' }}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />
            <path
                style={{ ...style, strokeWidth: 2, strokeDasharray: '10, 20', fill: 'none' }}
                className="react-flow__edge-path animate-neural-flow"
                d={edgePath}
                stroke="rgba(255,255,255,0.4)"
            />
        </>
    );
};

// Virtual Code Node for Slices
const VirtualCodeNode = ({ data }: NodeProps<Node<CustomNodeData>>) => {
    const isExpanded = data.isExpanded;
    const isHighlighted = data.isHighlighted;
    const language = useMemo(() => getLanguage(data.sourceFile || "code.txt"), [data.sourceFile]);
    const metadata = useMemo(() => getLanguageMetadata(data.sourceFile || "code.txt"), [data.sourceFile]);

    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(data.content || "");
    const [saving, setSaving] = useState(false);

    // Sync content when data changes
    useEffect(() => {
        setEditedContent(data.content || "");
    }, [data.content]);

    const handleSave = async () => {
        // For virtual nodes, we update the local state and notify parent
        setSaving(true);
        // Simulate save delay for consistency
        await new Promise(resolve => setTimeout(resolve, 500));
        setSaving(false);
        setIsEditing(false);
        // Update the node's content via the onUpdateContent callback if provided
        if (data.onUpdateContent) {
            data.onUpdateContent(data.id, editedContent);
        }
    };

    const heatmapStyle = useMemo(() => {
        if (!data.heatmapMode || data.heatmapMode === 'off' || !data.metrics) return {};
        const value = data.metrics[data.heatmapMode] || 0;
        return {
            backgroundColor: metricToHSL(value),
            borderColor: 'rgba(255,255,255,0.2)',
            color: 'white'
        };
    }, [data.heatmapMode, data.metrics]);

    return (
        <motion.div
            layout
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
            }}
            className={`glass-panel node-transition text-card-foreground rounded-xl border flex flex-col overflow-hidden relative group ${isExpanded ? "w-[450px] h-[350px] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]" : "w-[200px] h-12 shadow-sm"
                } ${isHighlighted ? "border-primary/50 ring-4 ring-primary/10 scale-105 z-50" : "border-white/10"} ${data.isInactive ? "opacity-40 blur-[2px] grayscale-[0.5] scale-[0.98]" : "opacity-100 blur-0 grayscale-0"}`}
            style={heatmapStyle}
        >
            <BorderBeam />
            {isHighlighted && <div className="absolute inset-0 rounded-xl animate-ping-glow pointer-events-none z-[-1]" />}
            <Handle type="target" position={Position.Left} className="opacity-0" />
            <div className={`p-3 flex items-center gap-2 border-b border-white/10 glass-header shrink-0`}>
                <div className={`flex items-center justify-center w-5 h-5 rounded bg-muted/30 shrink-0 ${metadata.color}`}>
                    <Scissors size={12} />
                </div>
                <div className="flex flex-col">
                    <span className={`text-[8px] font-bold ${metadata.color} uppercase tracking-tighter leading-none opacity-80`}>Slice: {data.lineRange}</span>
                    <span className="text-xs font-medium truncate max-w-[200px]">{data.label}</span>
                </div>
                {isExpanded && (
                    <div className="ml-auto flex items-center gap-1">
                        {!isEditing ? (
                            <>
                                <button
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setIsEditing(true);
                                    }}
                                    className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
                                    title="Edit slice"
                                >
                                    <Pencil size={12} />
                                </button>
                                {data.onOpenInModal && (
                                    <button
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            data.onOpenInModal!(data.sourceFile || data.id, editedContent);
                                        }}
                                        className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
                                        title="Open in full editor"
                                    >
                                        <ExternalLink size={12} />
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        handleSave();
                                    }}
                                    disabled={saving}
                                    className="p-1 hover:bg-primary/20 hover:text-primary rounded text-muted-foreground transition-colors disabled:opacity-50"
                                    title="Save changes"
                                >
                                    <Check size={12} className={saving ? "animate-pulse" : ""} />
                                </button>
                                <button
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setIsEditing(false);
                                        setEditedContent(data.content || "");
                                    }}
                                    disabled={saving}
                                    className="p-1 hover:bg-destructive/20 hover:text-destructive rounded text-muted-foreground transition-colors disabled:opacity-50"
                                    title="Cancel"
                                >
                                    <RotateCcw size={12} />
                                </button>
                            </>
                        )}
                        <span className="mx-1 h-3 w-[1px] bg-border" />
                        <button
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (data.onToggle) data.onToggle(data.id);
                            }}
                            className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
            </div>
            {isExpanded && (
                <div
                    className="flex-1 bg-[#0a0a0c]/60 backdrop-blur-md w-full h-full nodrag nowheel overflow-hidden cursor-auto relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="scanline-overlay" />
                    {isEditing ? (
                        <div className="w-full h-full p-2 bg-transparent">
                            <Editor
                                height="100%"
                                width="100%"
                                language={language}
                                theme="vs-dark"
                                value={editedContent}
                                options={{
                                    fontSize: 12,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    padding: { top: 12 },
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    lineNumbers: "on",
                                    renderLineHighlight: "all",
                                    scrollbar: {
                                        vertical: "visible",
                                        horizontal: "visible",
                                        useShadows: false,
                                        verticalScrollbarSize: 8,
                                        horizontalScrollbarSize: 8
                                    }
                                }}
                                onChange={(value) => setEditedContent(value || "")}
                                beforeMount={(monaco) => {
                                    // Define a transparent theme
                                    monaco.editor.defineTheme('glassTheme', {
                                        base: 'vs-dark',
                                        inherit: true,
                                        rules: [],
                                        colors: {
                                            'editor.background': '#00000000',
                                            'editor.lineHighlightBackground': '#ffffff10',
                                        }
                                    });
                                }}
                                onMount={(editor) => {
                                    editor.updateOptions({ theme: 'glassTheme' });
                                }}
                            />
                        </div>
                    ) : (
                        <div className="pb-10 min-w-full w-fit overflow-auto h-full">
                            <SyntaxHighlighter
                                language={language}
                                style={vscDarkPlus}
                                customStyle={{
                                    margin: 0,
                                    padding: '1.5rem',
                                    background: 'transparent',
                                    fontSize: '12px',
                                    lineHeight: '1.5',
                                    overflowX: 'visible',
                                    whiteSpace: 'pre',
                                    display: 'inline-block',
                                    minWidth: '100%',
                                }}
                                showLineNumbers={true}
                                lineNumberStyle={{
                                    minWidth: '3.5em',
                                    paddingRight: '1.2em',
                                    color: '#858585',
                                    textAlign: 'right',
                                    userSelect: 'none',
                                    opacity: 0.3
                                }}
                            >
                                {editedContent || " "}
                            </SyntaxHighlighter>
                        </div>
                    )}
                </div>
            )}
            <Handle type="source" position={Position.Right} className="opacity-0" />
        </motion.div>
    );
};

// Custom Node for Files that shows code when expanded
const FileCodeNode = ({ data }: NodeProps<Node<CustomNodeData>>) => {
    const isExpanded = data.isExpanded;
    const isHighlighted = data.isHighlighted;
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState("");
    const [saving, setSaving] = useState(false);

    const [selectionStart, setSelectionStart] = useState<number | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

    const language = useMemo(() => getLanguage(data.label), [data.label]);
    const metadata = useMemo(() => getLanguageMetadata(data.label), [data.label]);

    useEffect(() => {
        if (isExpanded && data.localPath && data.id && !content) {
            setLoading(true);
            readFileContent(data.localPath, data.id)
                .then(res => {
                    setContent(res.content);
                    setEditedContent(res.content);
                })
                .catch(() => setContent("// Error loading code"))
                .finally(() => setLoading(false));
        }
    }, [isExpanded, data.localPath, data.id, content]);

    const handleSave = async () => {
        if (!data.localPath || !data.id) return;
        setSaving(true);
        const res = await updateFileContent(data.localPath, data.id, editedContent);
        setSaving(false);
        if (res.success) {
            setContent(editedContent);
            setIsEditing(false);
        } else {
            alert("Failed to save changes.");
        }
    };

    const handleLineClick = (lineNum: number) => {
        if (isEditing) return;
        if (selectionStart === null || (selectionStart !== null && selectionEnd !== null)) {
            setSelectionStart(lineNum);
            setSelectionEnd(null);
        } else {
            setSelectionEnd(lineNum);
        }
    };

    const handleSplit = () => {
        if (selectionStart === null || selectionEnd === null) return;
        const start = Math.min(selectionStart, selectionEnd);
        const end = Math.max(selectionStart, selectionEnd);
        const lines = content.split('\n');
        const slice = lines.slice(start - 1, end).join('\n');

        if (data.onSplit) {
            data.onSplit(data.id, `${start}-${end}`, slice);
        }
        setSelectionStart(null);
        setSelectionEnd(null);
    };

    const heatmapStyle = useMemo(() => {
        if (!data.heatmapMode || data.heatmapMode === 'off' || !data.metrics) return {};
        const value = data.metrics[data.heatmapMode] || 0;
        return {
            backgroundColor: metricToHSL(value),
            borderColor: 'rgba(255,255,255,0.2)',
            color: 'white'
        };
    }, [data.heatmapMode, data.metrics]);

    return (
        <motion.div
            layout
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`glass-panel node-transition text-card-foreground rounded-xl border flex flex-col overflow-hidden relative group ${isExpanded ? "w-[450px] h-[350px] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]" : "w-[200px] h-12 shadow-sm"
                } ${isHighlighted ? "border-primary/50 ring-4 ring-primary/10 scale-105 z-50" : "border-white/10"} ${data.isInactive ? "opacity-40 blur-[2px] grayscale-[0.5] scale-[0.98]" : "opacity-100 blur-0 grayscale-0"}`}
            style={heatmapStyle}
        >
            <BorderBeam />
            {isHighlighted && <div className="absolute inset-0 rounded-xl animate-ping-glow pointer-events-none z-[-1]" />}
            <Handle type="target" position={Position.Left} className="opacity-0" />

            <div className={`p-3 flex items-center gap-2 border-b border-white/10 glass-header shrink-0`}>
                <div className={`flex items-center justify-center w-5 h-5 rounded bg-muted/30 shrink-0 ${metadata.color}`}>
                    <File size={12} />
                </div>
                <span className={`text-[9px] font-bold uppercase ${metadata.color} opacity-80 min-w-[20px]`}>{metadata.label}</span>
                <span className={`text-xs font-medium truncate ${isHighlighted ? "text-primary font-bold" : ""}`}>{data.label}</span>

                {isExpanded && (
                    <div className="ml-auto flex items-center gap-1">
                        {!isEditing ? (
                            <>
                                <button
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setIsEditing(true);
                                        setEditedContent(content);
                                    }}
                                    className="p-1 hover:bg-white/10 rounded text-muted-foreground transition-colors"
                                    title="Edit file"
                                >
                                    <Pencil size={12} />
                                </button>
                                {selectionStart && (
                                    <button
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            if (selectionEnd) handleSplit();
                                        }}
                                        className={`p-1 rounded transition-colors ${selectionEnd ? "bg-primary/20 text-primary hover:bg-primary/30" : "text-muted-foreground opacity-30"}`}
                                        title={selectionEnd ? "Branch to focus node" : "Select end line to branch"}
                                    >
                                        <Scissors size={12} />
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        if (data.onOpenInModal) {
                                            // Explicitly pass data.id (file path) and current content
                                            data.onOpenInModal(data.id, editedContent || content);
                                        } else {
                                            console.warn("onOpenInModal is not defined for node:", data.id);
                                        }
                                    }}
                                    className="p-1 hover:bg-white/10 rounded text-muted-foreground transition-colors"
                                    title="Open in full editor"
                                >
                                    <ExternalLink size={12} />
                                </button>
                                <button
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        handleSave();
                                    }}
                                    disabled={saving}
                                    className="p-1 hover:bg-primary/20 hover:text-primary rounded text-muted-foreground transition-colors disabled:opacity-50"
                                    title="Save changes"
                                >
                                    <Check size={12} className={saving ? "animate-pulse" : ""} />
                                </button>
                                <button
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setIsEditing(false);
                                        setEditedContent(content);
                                    }}
                                    disabled={saving}
                                    className="p-1 hover:bg-destructive/20 hover:text-destructive rounded text-muted-foreground transition-colors disabled:opacity-50"
                                    title="Cancel"
                                >
                                    <RotateCcw size={12} />
                                </button>
                            </>
                        )}
                        <span className="mx-1 h-3 w-[1px] bg-white/10" />
                        <button
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (data.onToggle) data.onToggle(data.id);
                            }}
                            className="p-1 hover:bg-white/10 rounded text-muted-foreground transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
            </div>
            {isExpanded && (
                <div
                    className="flex-1 bg-[#0a0a0c]/60 backdrop-blur-md w-full h-full nodrag nowheel overflow-auto scrollbar-thin cursor-auto selection:bg-primary/30 relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="scanline-overlay" />
                    <div className="w-full h-full relative">
                        {loading ? (
                            <div className="p-4 text-[10px] font-mono text-muted-foreground animate-pulse">Loading code...</div>
                        ) : isEditing ? (
                            <div className="w-full h-full p-2 bg-transparent">
                                <Editor
                                    height="100%"
                                    width="100%"
                                    language={language}
                                    theme="vs-dark"
                                    value={editedContent}
                                    options={{
                                        fontSize: 12,
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        padding: { top: 12 },
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                        lineNumbers: "on",
                                        renderLineHighlight: "all",
                                        scrollbar: {
                                            vertical: "visible",
                                            horizontal: "visible",
                                            useShadows: false,
                                            verticalScrollbarSize: 8,
                                            horizontalScrollbarSize: 8
                                        }
                                    }}
                                    onChange={(value) => setEditedContent(value || "")}
                                    beforeMount={(monaco) => {
                                        monaco.editor.defineTheme('glassTheme', {
                                            base: 'vs-dark',
                                            inherit: true,
                                            rules: [],
                                            colors: {
                                                'editor.background': '#00000000',
                                                'editor.lineHighlightBackground': '#ffffff10',
                                            }
                                        });
                                    }}
                                    onMount={(editor) => {
                                        editor.updateOptions({ theme: 'glassTheme' });
                                    }}
                                />
                            </div>
                        ) : (
                            <SyntaxHighlighter
                                language={language}
                                style={vscDarkPlus}
                                customStyle={{
                                    margin: 0,
                                    padding: '1rem',
                                    background: 'transparent',
                                    fontSize: '10px',
                                    lineHeight: '1.4',
                                    overflowX: 'visible',
                                    whiteSpace: 'pre',
                                    display: 'inline-block',
                                    minWidth: '100%',
                                }}
                                showLineNumbers={true}
                                lineNumberStyle={{
                                    minWidth: '3em',
                                    paddingRight: '1em',
                                    color: '#858585',
                                    textAlign: 'right',
                                    userSelect: 'none',
                                    opacity: 0.5,
                                    cursor: 'pointer'
                                }}
                                wrapLines={true}
                                lineProps={(lineNumber: number) => {
                                    const isLineHighlighted = data.highlightedLines?.includes(lineNumber);
                                    const isInSelectionRange = selectionStart !== null && selectionEnd !== null &&
                                        lineNumber >= Math.min(selectionStart, selectionEnd) &&
                                        lineNumber <= Math.max(selectionStart, selectionEnd);

                                    const isSelectedLine = selectionStart === lineNumber || selectionEnd === lineNumber;

                                    const style: React.CSSProperties = {
                                        display: 'block',
                                        minWidth: 'max-content',
                                        width: '100%',
                                        cursor: 'pointer',
                                    };

                                    if (isLineHighlighted || isInSelectionRange || isSelectedLine) {
                                        style.backgroundColor = isSelectedLine ? 'rgba(59, 130, 246, 0.25)' :
                                            isInSelectionRange ? 'rgba(59, 130, 246, 0.1)' :
                                                'rgba(59, 130, 246, 0.15)';
                                        style.borderLeft = `2px solid ${isSelectedLine || isInSelectionRange ? '#60a5fa' : '#3b82f6'}`;
                                    }

                                    return {
                                        style,
                                        onDoubleClick: () => handleLineClick(lineNumber)
                                    };
                                }}
                            >
                                {content || " "}
                            </SyntaxHighlighter>
                        )}
                    </div>
                </div>
            )}
            <Handle type="source" position={Position.Right} className="opacity-0" />
        </motion.div>
    );
};


// Folder Node
const FolderNode = ({ data }: NodeProps<Node<CustomNodeData>>) => {
    const isExpanded = data.expanded;
    const isHighlighted = data.isHighlighted;

    const heatmapStyle = useMemo(() => {
        if (!data.heatmapMode || data.heatmapMode === 'off' || !data.metrics) return {};
        const value = data.metrics[data.heatmapMode] || 0;
        return {
            backgroundColor: metricToHSL(value),
            borderColor: 'rgba(255,255,255,0.2)',
            color: 'white'
        };
    }, [data.heatmapMode, data.metrics]);

    return (
        <motion.div
            layout
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
            }}
            className={`glass-panel node-transition text-card-foreground rounded-xl border flex flex-col overflow-hidden min-w-[180px] relative group ${isHighlighted ? "border-primary/50 ring-4 ring-primary/10 scale-105 z-50" : "border-white/10"} ${data.isInactive ? "opacity-40 blur-[2px] grayscale-[0.5] scale-[0.98]" : "opacity-100 blur-0 grayscale-0"}`}
            style={heatmapStyle}
        >
            <BorderBeam />
            {isHighlighted && <div className="absolute inset-0 rounded-xl animate-ping-glow pointer-events-none z-[-1]" />}
            <Handle type="target" position={Position.Left} className="opacity-0" />
            <div className={`p-3 flex items-center gap-2 border-b border-white/10 glass-header shrink-0 italic`}>
                <div className={`p-1 rounded bg-white/10 ${isHighlighted ? "text-primary shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "text-muted-foreground"}`}>
                    <Folder size={14} />
                </div>
                <span className={`text-xs truncate flex-1 ${isHighlighted ? "text-primary font-bold" : ""}`}>{data.label}</span>
                <ChevronRight
                    size={14}
                    className={`transition-transform duration-200 shrink-0 ${data.expanded ? "rotate-90" : ""} ${isHighlighted ? "text-primary" : ""}`}
                />
            </div>
            <Handle type="source" position={Position.Right} className="opacity-0" />
        </motion.div>
    );
};

const nodeTypes = {
    file: FileCodeNode,
    dir: FolderNode,
    virtual: VirtualCodeNode,
    zone: ZoneNode,
};

const edgeTypes = {
    neural: NeuralEdge,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100 });

    nodes.forEach((node) => {
        const isExp = node.data?.isExpanded;
        const width = isExp ? (node.type === 'virtual' ? 400 : 450) : (node.type === 'virtual' ? 180 : 200);
        const height = isExp ? (node.type === 'virtual' ? 300 : 350) : 50;
        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return nodes.map((node) => {
        const isExp = node.data?.isExpanded;
        const nodeWithPosition = dagreGraph.node(node.id);
        const width = isExp ? (node.type === 'virtual' ? 400 : 450) : (node.type === 'virtual' ? 180 : 200);
        const height = isExp ? (node.type === 'virtual' ? 300 : 350) : 50;
        return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            position: {
                x: nodeWithPosition.x - width / 2,
                y: nodeWithPosition.y - height / 2,
            },
        };
    });
};

function DependencyGraphContent({
    data,
    onNodeClick,
    localPath,
    isMaximized,
    onMaximizeToggle,
    highlightedId,
    highlightedLines,
    onPaneClick,
    virtualNodes = [],
    virtualEdges = [],
    onVirtualNodesChange,
    onVirtualEdgesChange,
    onOpenInModal,
    onVirtualNodeUpdate,
    zones: propsZones,
    onZonesChange,
    expandedIds: propsExpandedIds,
    onExpandedIdsChange
}: StructureGraphProps) {
    const { fitView, screenToFlowPosition } = useReactFlow();

    // Use internal state if props are not provided (fallback)
    const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(new Set());
    const [internalZones, setInternalZones] = useState<Node[]>([]);

    const expandedIds = propsExpandedIds ?? internalExpandedIds;
    const setExpandedIds = onExpandedIdsChange ?? setInternalExpandedIds;
    const zones = propsZones ?? internalZones;
    const setZones = onZonesChange ?? setInternalZones;

    const [codeExpandedIds, setCodeExpandedIds] = useState<Set<string>>(new Set());


    const [isDrawingZone, setIsDrawingZone] = useState(false);
    // Store screen coordinates for smooth overlay rendering
    const [screenDragStart, setScreenDragStart] = useState<{ x: number, y: number } | null>(null);
    const [screenCurrentDrag, setScreenCurrentDrag] = useState<{ x: number, y: number } | null>(null);
    const [zoneEditorOpen, setZoneEditorOpen] = useState(false);
    const [pendingZone, setPendingZone] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [zoneName, setZoneName] = useState("");
    const [zoneColor, setZoneColor] = useState("#3b82f6");

    // Theme state
    const [currentTheme, setCurrentTheme] = useState<GraphTheme>('cyberpunk');
    const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);

    // Heatmap mode state
    const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('off');

    // Get reference to the container for position calculations
    const containerRef = useRef<HTMLDivElement>(null);

    const handlePaneClick = useCallback((event: React.MouseEvent) => {
        if (!isDrawingZone) {
            if (onPaneClick) onPaneClick();
            return;
        }

        // Get position relative to the container
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        if (!screenDragStart) {
            setScreenDragStart({ x: screenX, y: screenY });
            setScreenCurrentDrag({ x: screenX, y: screenY });
        } else {
            // Finish drawing - convert to flow coordinates for the actual zone
            const flowStart = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            const flowStartPoint = screenToFlowPosition({
                x: screenDragStart.x + rect.left,
                y: screenDragStart.y + rect.top
            });

            const width = Math.abs(flowStart.x - flowStartPoint.x);
            const height = Math.abs(flowStart.y - flowStartPoint.y);
            const x = Math.min(flowStart.x, flowStartPoint.x);
            const y = Math.min(flowStart.y, flowStartPoint.y);

            if (width > 50 && height > 50) {
                setPendingZone({ x, y, width, height });
                setZoneEditorOpen(true);
                setIsDrawingZone(false);
                setScreenDragStart(null);
                setScreenCurrentDrag(null);
            } else {
                // Too small, reset
                setScreenDragStart(null);
                setScreenCurrentDrag(null);
            }
        }
    }, [isDrawingZone, screenDragStart, screenToFlowPosition, onPaneClick]);

    const handlePaneMouseMove = useCallback((event: React.MouseEvent) => {
        if (!isDrawingZone || !screenDragStart) return;

        // Get position relative to the container
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        setScreenCurrentDrag({ x: screenX, y: screenY });
    }, [isDrawingZone, screenDragStart]);

    const handleCreateZone = () => {
        if (!pendingZone || !zoneName) return;

        const newZone: Node = {
            id: `zone-${Date.now()}`,
            type: 'zone',
            position: { x: pendingZone.x, y: pendingZone.y },
            data: {
                id: `zone-${Date.now()}`,
                label: zoneName,
                width: pendingZone.width,
                height: pendingZone.height,
                color: zoneColor,
                onDelete: (id: string) => {
                    setZones((prev: Node[]) => prev.filter((z) => z.id !== id));
                }
            },
            zIndex: -1,
        };

        setZones(prev => [...prev, newZone]);
        setZoneEditorOpen(false);
        setZoneName("");
        setPendingZone(null);
    };

    const handleSplit = useCallback((parentId: string, range: string, sliceContent: string) => {
        const sliceId = `slice-${parentId}-${range}`;
        const newNode: Node = {
            id: sliceId,
            type: 'virtual',
            position: { x: 0, y: 0 },
            data: {
                id: sliceId,
                label: `Focus: ${range}`,
                sourceFile: parentId,
                lineRange: range,
                content: sliceContent,
                isExpanded: true,
                onToggle: (id: string) => {
                    if (onVirtualNodesChange) onVirtualNodesChange((prev: Node[]) => prev.filter((n: Node) => n.id !== id));
                    if (onVirtualEdgesChange) onVirtualEdgesChange((prev: Edge[]) => prev.filter((e: Edge) => e.target !== id));
                    setCodeExpandedIds((prev: Set<string>) => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                }
            }
        };

        const newEdge: Edge = {
            id: `edge-${parentId}-${sliceId}`,
            source: parentId,
            target: sliceId,
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            type: 'smoothstep'
        };

        if (onVirtualNodesChange) onVirtualNodesChange((prev: Node[]) => [...prev.filter((n: Node) => n.id !== sliceId), newNode]);
        if (onVirtualEdgesChange) onVirtualEdgesChange((prev: Edge[]) => [...prev.filter((e: Edge) => e.id !== newEdge.id), newEdge]);
        setCodeExpandedIds((prev: Set<string>) => new Set(prev).add(sliceId));
    }, [onVirtualNodesChange, onVirtualEdgesChange]);

    // Automatically expand ancestor folders if a node is highlighted
    useEffect(() => {
        if (highlightedId) {
            const parts = highlightedId.split('/');
            const ancestorPaths = new Set<string>();
            let current = "";
            for (let i = 0; i < parts.length - 1; i++) {
                current = current ? `${current}/${parts[i]}` : parts[i];
                ancestorPaths.add(current);
            }
            setExpandedIds(prev => {
                const next = new Set(prev);
                ancestorPaths.forEach(p => next.add(p));
                return next;
            });

            const node = data.nodes.find(n => n.id === highlightedId);
            if (node?.type === 'file') {
                setCodeExpandedIds(prev => {
                    const next = new Set(prev);
                    next.add(highlightedId);
                    return next;
                });
            }

            // Center view on highlighted node
            setTimeout(() => {
                fitView({ nodes: [{ id: highlightedId }], padding: 0.5, duration: 800 });
            }, 100);
        }
    }, [highlightedId, data.nodes, fitView]);

    // Center view on new virtual nodes
    useEffect(() => {
        if (virtualNodes.length > 0) {
            const lastNode = virtualNodes[virtualNodes.length - 1];
            if (lastNode.id.startsWith('slice-')) {
                setTimeout(() => {
                    fitView({ nodes: [{ id: lastNode.id }], padding: 0.5, duration: 800 });
                }, 100);
            }
        }
    }, [virtualNodes.length, fitView]);

    useEffect(() => {
        if (data.nodes.length > 0 && expandedIds.size === 0) {
            const roots = data.nodes.filter(n => !n.parentId).map(n => n.id);
            setExpandedIds(new Set(roots));
        }
    }, [data.nodes, expandedIds.size]);

    const toggleCodeExpansion = useCallback((id: string) => {
        setCodeExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    // Sync codeExpandedIds with virtualNodes
    useEffect(() => {
        virtualNodes.forEach(node => {
            if (node.data.isExpanded && !codeExpandedIds.has(node.id)) {
                setCodeExpandedIds(prev => new Set(prev).add(node.id));
            }
        });
    }, [virtualNodes, codeExpandedIds]);

    const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
        if (!data || !data.nodes) return { nodes: [], edges: [] };

        const visibleNodes = data.nodes.filter(node => {
            if (!node.parentId) return true;
            return expandedIds.has(node.parentId);
        });

        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        const visibleEdges = data.edges.filter(edge =>
            visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
        );

        const initialNodes: Node[] = visibleNodes.map((node, index) => ({
            id: node.id,
            type: node.type === 'dir' ? 'dir' : 'file',
            position: { x: 0, y: 0 },
            data: {
                id: node.id,
                label: node.label,
                expanded: expandedIds.has(node.id),
                isExpanded: codeExpandedIds.has(node.id),
                isHighlighted: highlightedId === node.id,
                isInactive: !!highlightedId && highlightedId !== node.id,
                highlightedLines: highlightedId === node.id ? highlightedLines : undefined,
                metrics: node.metrics,
                heatmapMode: heatmapMode,
                localPath: localPath,
                onToggle: () => {
                    if (node.type === 'dir') {
                        setExpandedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(node.id)) next.delete(node.id);
                            else next.add(node.id);
                            return next;
                        });
                    } else {
                        // File node toggle logic if needed
                        if (codeExpandedIds.has(node.id)) {
                            setCodeExpandedIds(prev => {
                                const next = new Set(prev);
                                next.delete(node.id);
                                return next;
                            });
                        } else {
                            setCodeExpandedIds(prev => new Set(prev).add(node.id));
                        }
                    }
                },
                onOpenInModal: onOpenInModal, // Pass the callback here
                onSplit: (parentId: string, range: string, sliceContent: string) => {
                    // Logic for virtual node creation
                    handleSplit(parentId, range, sliceContent);
                },
                onUpdateContent: onVirtualNodeUpdate
            }
        }));

        const syncedVirtualNodes = virtualNodes.map((node, index) => ({
            ...node,
            data: {
                ...node.data,
                isExpanded: codeExpandedIds.has(node.id),
                isHighlighted: node.id === highlightedId,
                isInactive: !!highlightedId && node.id !== highlightedId,
                highlightedLines: node.id === highlightedId ? highlightedLines : [],
                metrics: (node.data as any).metrics,
                heatmapMode: heatmapMode,
                onOpenInModal: onOpenInModal,
                onUpdateContent: onVirtualNodeUpdate
            }
        }));

        const allNodes = [...initialNodes, ...syncedVirtualNodes];
        const allEdges = [...visibleEdges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            animated: false,
            style: {
                stroke: GRAPH_THEMES[currentTheme].edge,
                strokeWidth: 1.5
            },
            type: 'smoothstep'
        })), ...virtualEdges];

        const layNodes = getLayoutedElements(allNodes, allEdges);
        return { nodes: layNodes, edges: allEdges };
    }, [data, expandedIds, codeExpandedIds, localPath, toggleCodeExpansion, virtualNodes, virtualEdges, handleSplit, highlightedId, highlightedLines, heatmapMode, currentTheme]);

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

    useEffect(() => {
        // Only sync zones and layout nodes - don't include drawing preview here
        const currentNodes = [...zones, ...layoutedNodes];
        setNodes(currentNodes as Node[]);
        setEdges(layoutedEdges);
    }, [layoutedNodes, layoutedEdges, setNodes, setEdges, zones]);

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        if (node.type === 'virtual' || node.type === 'zone') return;

        const graphNode = data.nodes.find(n => n.id === node.id);
        if (graphNode?.type === 'dir') {
            setExpandedIds(prev => {
                const next = new Set(prev);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
            });
        } else {
            if (!codeExpandedIds.has(node.id)) {
                toggleCodeExpansion(node.id);
            }
            if (onNodeClick) onNodeClick(node.id);
        }
    }, [data.nodes, onNodeClick, toggleCodeExpansion, codeExpandedIds]);

    const themeStyles = GRAPH_THEMES[currentTheme];

    return (
        <div
            className={`overflow-hidden flex flex-col transition-all duration-300 w-full h-full relative ${isMaximized ? "shadow-2xl" : "rounded-lg"}`}
            style={{
                backgroundColor: themeStyles.bg,
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: '1px'
            }}
        >
            <div className="p-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">Structure Graph</span>

                    {/* Theme Selector */}
                    <div className="flex bg-black/20 rounded-md p-0.5 border border-white/5">
                        {(Object.keys(GRAPH_THEMES) as GraphTheme[]).map((theme) => (
                            <button
                                key={theme}
                                onClick={() => setCurrentTheme(theme)}
                                className={`px-2 py-1 text-[9px] uppercase tracking-wider rounded-sm transition-all ${currentTheme === theme
                                    ? 'bg-white/10 text-white font-bold shadow-sm'
                                    : 'text-white/40 hover:text-white/70'
                                    }`}
                            >
                                {GRAPH_THEMES[theme].label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted/20 rounded-lg p-1 mr-2 border border-border/50">
                        {/* Heatmap Controls */}
                        <button
                            onClick={() => setHeatmapMode('off')}
                            className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider transition-all ${heatmapMode === 'off' ? "bg-background shadow-sm text-foreground font-bold" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Off
                        </button>
                        <button
                            onClick={() => setHeatmapMode('complexity')}
                            className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider transition-all ${heatmapMode === 'complexity' ? "bg-background shadow-sm text-foreground font-bold" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Complexity
                        </button>
                        <button
                            onClick={() => setHeatmapMode('coupling')}
                            className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider transition-all ${heatmapMode === 'coupling' ? "bg-background shadow-sm text-foreground font-bold" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Coupling
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setIsDrawingZone(!isDrawingZone);
                            setScreenDragStart(null);
                            setScreenCurrentDrag(null);
                        }}
                        className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs ${isDrawingZone ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                        title="Draw a zone area"
                    >
                        {isDrawingZone ? <X size={14} /> : <Plus size={14} />}
                        {isDrawingZone ? "Cancel" : "Add Zone"}
                    </button>
                    {onMaximizeToggle && (
                        <button onClick={(e) => { e.stopPropagation(); onMaximizeToggle(); }} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                    )}
                </div>
            </div>
            <div ref={containerRef} className="flex-1 relative overflow-hidden">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    defaultEdgeOptions={{ type: 'neural' }}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={handleNodeClick}
                    onPaneClick={handlePaneClick}
                    onPaneMouseMove={handlePaneMouseMove}
                    panOnDrag={!isDrawingZone}
                    fitView
                    fitViewOptions={{ padding: 0.2, duration: 400 }}
                    minZoom={0.1}
                    maxZoom={2}
                    proOptions={{ hideAttribution: true }}
                    style={{
                        cursor: isDrawingZone ? 'crosshair' : 'default',
                        backgroundColor: themeStyles.bg
                    }}
                >
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={25}
                        size={2}
                        color={themeStyles.grid}
                        className="animated-grid"
                    />
                    <MiniMap
                        position="bottom-left"
                        style={{
                            backgroundColor: 'rgba(10, 10, 12, 0.8)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                        maskColor="rgba(0, 0, 0, 0.5)"
                        nodeColor={(node) => {
                            if (node.type === 'dir') return '#3b82f6';
                            if (node.type === 'virtual') return '#10b981';
                            return '#64748b';
                        }}
                        nodeStrokeWidth={3}
                        zoomable
                        pannable
                    />
                </ReactFlow>

                {/* Floating Chat Button (Only visible if chatProps are provided) */}
                {(chatProps && !isFloatingChatOpen) && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="absolute bottom-6 right-6 z-20 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
                        onClick={() => setIsFloatingChatOpen(true)}
                    >
                        <MessageSquare size={20} />
                    </motion.button>
                )}

                {/* Floating Chat Overlay */}
                <AnimatePresence>
                    {isFloatingChatOpen && chatProps && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-6 right-6 z-30 w-[350px] h-[500px] flex flex-col rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black/80 backdrop-blur-xl ring-1 ring-white/10"
                        >
                            {/* Chat Header */}
                            <div className="h-10 bg-white/5 border-b border-white/5 flex items-center justify-between px-3 shrink-0 cursor-move">
                                <span className="text-xs font-bold text-white/80 flex items-center gap-2">
                                    <Sparkles size={12} className="text-primary" />
                                    AI Architect
                                </span>
                                <button
                                    onClick={() => setIsFloatingChatOpen(false)}
                                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-white/50 hover:text-white"
                                >
                                    <Minimize2 size={12} />
                                </button>
                            </div>

                            {/* Chat Content */}
                            <div className="flex-1 overflow-hidden relative">
                                <ChatInterface
                                    messages={chatProps.messages}
                                    isLoading={chatProps.isLoading}
                                    onSendMessage={chatProps.onSendMessage}
                                    onDragStart={() => { }} // No-op as we use container drag if needed, or just fixed
                                    currentFile={null} // Context agnostic or pass global
                                    onCodeBlockClick={() => { }} // Handle if needed
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Drawing preview overlay - rendered separately for smooth performance */}
                {isDrawingZone && screenDragStart && screenCurrentDrag && (
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        style={{ zIndex: 5, width: '100%', height: '100%', overflow: 'visible' }}
                    >
                        <rect
                            x={Math.min(screenDragStart.x, screenCurrentDrag.x)}
                            y={Math.min(screenDragStart.y, screenCurrentDrag.y)}
                            width={Math.abs(screenCurrentDrag.x - screenDragStart.x)}
                            height={Math.abs(screenCurrentDrag.y - screenDragStart.y)}
                            fill="rgba(59, 130, 246, 0.1)"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeDasharray="8 4"
                            rx="8"
                        />
                    </svg>
                )}
                {heatmapMode !== 'off' && (
                    <div className="absolute bottom-4 left-20 glass-panel p-2 rounded-md shadow-lg z-10 flex flex-col gap-1 min-w-[120px]">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={10} className="text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Heatmap: {heatmapMode}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#4ade80] via-[#fbbf24] to-[#ef4444]" />
                        <div className="flex justify-between items-center text-[8px] uppercase font-medium text-muted-foreground mt-0.5">
                            <span>Healthy</span>
                            <span>Hot</span>
                        </div>
                    </div>
                )}
                {zoneEditorOpen && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-popover text-popover-foreground p-4 rounded-lg shadow-xl border border-border w-64 z-50">
                        <h3 className="text-sm font-semibold mb-3">Create Zone</h3>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <span className="text-xs font-medium">Label</span>
                                <Input
                                    value={zoneName}
                                    onChange={(e) => setZoneName(e.target.value)}
                                    placeholder="e.g. Core Features"
                                    className="h-8 text-xs"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-medium">Color</span>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={zoneColor}
                                        onChange={(e) => setZoneColor(e.target.value)}
                                        className="h-8 w-12 p-0 border-0 rounded cursor-pointer"
                                    />
                                    <span className="text-xs text-muted-foreground flex items-center">{zoneColor}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button size="sm" onClick={handleCreateZone} className="flex-1 text-xs h-8">Create</Button>
                                <Button size="sm" variant="outline" onClick={() => setZoneEditorOpen(false)} className="flex-1 text-xs h-8">Cancel</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function DependencyGraph(props: StructureGraphProps) {
    return (
        <ReactFlowProvider>
            <DependencyGraphContent {...props} />
        </ReactFlowProvider>
    );
}
