"use client";

import { useState } from "react";
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown, File } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/lib/file-system";

interface FileTreeProps {
    data: FileNode[];
    onSelect: (path: string) => void;
    selectedPath?: string;
}

export function FileTree({ data, onSelect, selectedPath }: FileTreeProps) {
    return (
        <div className="text-sm">
            {data.map((node) => (
                <TreeNode key={node.path} node={node} onSelect={onSelect} selectedPath={selectedPath} />
            ))}
        </div>
    );
}

function TreeNode({ node, onSelect, selectedPath }: { node: FileNode; onSelect: (path: string) => void; selectedPath?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const isSelected = selectedPath === node.path;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type === "dir") {
            setIsOpen(!isOpen);
        } else {
            onSelect(node.path);
        }
    };



    return (
        <div>
            <div
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-1.5 py-1 px-2 cursor-pointer rounded-sm hover:bg-accent/50 transition-colors select-none",
                    isSelected && "bg-accent text-accent-foreground font-medium",
                    node.type === "dir" && "font-semibold text-foreground/80"
                )}
                style={{ paddingLeft: node.path.split("/").length * 8 }} // Simple indentation
            >
                <span className="opacity-50 w-4 h-4 flex items-center justify-center shrink-0">
                    {node.type === "dir" && (
                        isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                </span>

                {node.type === "dir" ? (
                    isOpen ? (
                        <FolderOpen size={16} className={cn("shrink-0", "text-muted-foreground")} />
                    ) : (
                        <Folder size={16} className={cn("shrink-0", "text-muted-foreground")} />
                    )
                ) : (
                    node.name.endsWith("tsx") || node.name.endsWith("ts") ? (
                        <FileCode size={16} className={cn("shrink-0", "text-muted-foreground/70")} />
                    ) : (
                        <File size={16} className={cn("shrink-0", "text-muted-foreground/70")} />
                    )
                )}
                <span className="truncate">{node.name}</span>
            </div>

            {isOpen && node.children && (
                <div className="ml-2 border-l border-border/40 pl-1">
                    {node.children.map((child) => (
                        <TreeNode key={child.path} node={child} onSelect={onSelect} selectedPath={selectedPath} />
                    ))}
                </div>
            )}
        </div>
    );
}
