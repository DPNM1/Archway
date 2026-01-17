"use client";

import { useMemo, useCallback, useState, useEffect } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, BackgroundVariant, Node, Edge, Position, Handle, NodeProps, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import type { GraphData, GraphNode } from '@/lib/structure-parser';
import { Folder, File, Maximize2, Minimize2, ChevronRight, X, Pencil, Check, RotateCcw, Scissors } from "lucide-react";
import { readFileContent, updateFileContent } from '@/app/actions/file';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { getLanguage, getLanguageMetadata } from '@/lib/languages';

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
    sourceFile?: string;
    lineRange?: string;
    content?: string;
    [key: string]: any;
}

// Virtual Code Node for Slices
const VirtualCodeNode = ({ data }: NodeProps<Node<CustomNodeData>>) => {
    const isExpanded = data.isExpanded;
    const isHighlighted = data.isHighlighted;
    const language = useMemo(() => getLanguage(data.sourceFile || "code.txt"), [data.sourceFile]);
    const metadata = useMemo(() => getLanguageMetadata(data.sourceFile || "code.txt"), [data.sourceFile]);

    return (
        <div
            className={`bg-card text-card-foreground rounded-lg border flex flex-col transition-all duration-300 overflow-hidden ${isExpanded ? "w-[450px] h-[350px] shadow-2xl" : "w-[200px] h-12 shadow-sm"
                } ${isHighlighted ? "border-primary border-4 ring-4 ring-primary/20" : "border-border"}`}
        >
            <Handle type="target" position={Position.Left} className="opacity-0" />
            <div className={`p-3 flex items-center gap-2 border-b border-border bg-muted/20 shrink-0`}>
                <div className={`flex items-center justify-center w-5 h-5 rounded bg-muted/30 shrink-0 ${metadata.color}`}>
                    <Scissors size={12} />
                </div>
                <div className="flex flex-col">
                    <span className={`text-[8px] font-bold ${metadata.color} uppercase tracking-tighter leading-none opacity-80`}>Slice: {data.lineRange}</span>
                    <span className="text-xs font-medium truncate max-w-[200px]">{data.label}</span>
                </div>
                {isExpanded && (
                    <button
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (data.onToggle) data.onToggle(data.id);
                        }}
                        className="ml-auto p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>
            {isExpanded && (
                <div
                    className="flex-1 bg-[#1e1e1e] w-full h-full nodrag nowheel overflow-auto scrollbar-thin cursor-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="pb-10 min-w-full w-fit">
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
                            {data.content || " "}
                        </SyntaxHighlighter>
                    </div>
                </div>
            )}
            <Handle type="source" position={Position.Right} className="opacity-0" />
        </div>
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

    // Selection state for splitting
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

    return (
        <div
            className={`bg-card text-card-foreground rounded-lg border flex flex-col transition-all duration-300 overflow-hidden ${isExpanded ? "w-[450px] h-[350px] shadow-2xl" : "w-[200px] h-12 shadow-sm"
                } ${isHighlighted ? "border-primary border-4 ring-4 ring-primary/20" : "border-border"}`}
        >
            <Handle type="target" position={Position.Left} className="opacity-0" />
            <div className={`p-3 flex items-center gap-2 border-b border-border bg-muted/20 shrink-0`}>
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
                                    className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
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
                    className="flex-1 bg-[#1e1e1e] w-full h-full nodrag nowheel overflow-auto scrollbar-thin cursor-auto selection:bg-primary/30"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="pb-20 min-w-full w-fit h-full">
                        {loading ? (
                            <div className="p-4 text-[10px] font-mono text-muted-foreground animate-pulse">Loading code...</div>
                        ) : isEditing ? (
                            <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full h-full p-4 bg-transparent text-white font-mono text-[10px] outline-none resize-none leading-[1.4]"
                                autoFocus
                                spellCheck={false}
                            />
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
        </div>
    );
};

// Folder Node
const FolderNode = ({ data }: NodeProps<Node<CustomNodeData>>) => {
    const isHighlighted = data.isHighlighted;
    return (
        <div
            className={`bg-card text-card-foreground rounded-lg p-3 flex items-center justify-center gap-2 w-[220px] h-12 font-bold shadow-[4px_4px_0px_var(--muted-foreground)] border-2 transition-all duration-300 ${isHighlighted ? "border-primary border-4 shadow-primary/20 scale-105" : "border-foreground"}`}
        >
            <Handle type="target" position={Position.Left} className="opacity-0" />
            <div className={`p-1 rounded bg-muted/40 ${isHighlighted ? "text-primary" : "text-muted-foreground"}`}>
                <Folder size={14} />
            </div>
            <span className={`text-xs truncate flex-1 ${isHighlighted ? "text-primary" : ""}`}>{data.label}</span>
            <ChevronRight
                size={14}
                className={`transition-transform duration-200 shrink-0 ${data.expanded ? "rotate-90" : ""} ${isHighlighted ? "text-primary" : ""}`}
            />
            <Handle type="source" position={Position.Right} className="opacity-0" />
        </div>
    );
};

const nodeTypes = {
    file: FileCodeNode,
    dir: FolderNode,
    virtual: VirtualCodeNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    dagreGraph.setGraph({ rankdir: 'LR' });

    nodes.forEach((node) => {
        const isExp = node.data?.isExpanded;
        const width = isExp ? 450 : 200;
        const height = isExp ? 350 : 50;
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
    onVirtualEdgesChange
}: StructureGraphProps) {
    const { fitView } = useReactFlow();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [codeExpandedIds, setCodeExpandedIds] = useState<Set<string>>(new Set());

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

        const initialNodes: Node[] = visibleNodes.map((node) => ({
            id: node.id,
            type: node.type === 'dir' ? 'dir' : 'file',
            position: { x: 0, y: 0 },
            data: {
                id: node.id,
                label: node.label,
                expanded: expandedIds.has(node.id),
                isExpanded: codeExpandedIds.has(node.id),
                isHighlighted: highlightedId === node.id,
                highlightedLines: highlightedId === node.id ? highlightedLines : undefined,
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
                        toggleCodeExpansion(node.id);
                    }
                },
                onSplit: handleSplit
            }
        }));

        const syncedVirtualNodes = virtualNodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                isExpanded: codeExpandedIds.has(node.id),
                isHighlighted: node.id === highlightedId,
                highlightedLines: node.id === highlightedId ? highlightedLines : []
            }
        }));

        const allNodes = [...initialNodes, ...syncedVirtualNodes];
        const allEdges = [...visibleEdges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            animated: false,
            style: { stroke: 'var(--foreground)', strokeWidth: 1.5 },
            type: 'smoothstep'
        })), ...virtualEdges];

        const layNodes = getLayoutedElements(allNodes, allEdges);
        return { nodes: layNodes, edges: allEdges };
    }, [data, expandedIds, codeExpandedIds, localPath, toggleCodeExpansion, virtualNodes, virtualEdges, handleSplit, highlightedId, highlightedLines]);

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

    useEffect(() => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        if (node.type === 'virtual') return;

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

    return (
        <div className={`bg-background border border-border/50 overflow-hidden text-foreground flex flex-col transition-all duration-300 w-full h-full relative ${isMaximized ? "shadow-2xl" : "rounded-lg"}`}>
            <div className="p-3 border-b border-border/50 bg-muted/10 flex items-center justify-between shrink-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Repository Structure Graph</span>
                {onMaximizeToggle && (
                    <button onClick={(e) => { e.stopPropagation(); onMaximizeToggle(); }} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                        {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                )}
            </div>
            <div className="flex-1 relative overflow-hidden">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={handleNodeClick}
                    onPaneClick={onPaneClick}
                    fitView
                    fitViewOptions={{ padding: 0.2, duration: 400 }}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="var(--muted-foreground)" />
                </ReactFlow>
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
