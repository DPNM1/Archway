"use client";

import React, { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { X, Save, Edit3, Eye, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLanguage } from "@/lib/languages";

interface NodeEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    filePath: string;
    initialContent: string;
    onSave: (path: string, content: string) => Promise<boolean>;
}

export function NodeEditorModal({
    isOpen,
    onClose,
    filePath,
    initialContent,
    onSave
}: NodeEditorModalProps) {
    const [content, setContent] = useState(initialContent);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setContent(initialContent);
        setIsDirty(false);
        setSaveStatus('idle');
    }, [initialContent, isOpen]);

    const handleSave = useCallback(async () => {
        if (!isDirty || isSaving) return;

        setIsSaving(true);
        setSaveStatus('saving');

        const success = await onSave(filePath, content);

        setIsSaving(false);
        if (success) {
            setSaveStatus('saved');
            setIsDirty(false);
            setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
            setSaveStatus('error');
        }
    }, [filePath, content, isDirty, isSaving, onSave]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleSave]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
            <Card className="w-full max-w-4xl h-[80vh] bg-[#0d0d0d]/90 border-border/50 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mb-1">Editing File</span>
                            <h3 className="text-sm font-semibold truncate max-w-[300px]">{filePath}</h3>
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-medium">
                            {saveStatus === 'saving' && (
                                <>
                                    <Loader2 size={12} className="animate-spin text-primary" />
                                    <span className="text-primary animate-pulse uppercase tracking-wider">Saving...</span>
                                </>
                            )}
                            {saveStatus === 'saved' && (
                                <>
                                    <Check size={12} className="text-green-500" />
                                    <span className="text-green-500 uppercase tracking-wider">Saved</span>
                                </>
                            )}
                            {saveStatus === 'error' && (
                                <>
                                    <AlertCircle size={12} className="text-red-500" />
                                    <span className="text-red-500 uppercase tracking-wider">Save Failed</span>
                                </>
                            )}
                            {saveStatus === 'idle' && isDirty && (
                                <span className="text-yellow-500 uppercase tracking-wider">Unsaved Changes</span>
                            )}
                            {saveStatus === 'idle' && !isDirty && (
                                <span className="text-muted-foreground uppercase tracking-wider">Synchronized</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-2 text-xs transition-colors ${isEditing ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'hover:bg-white/10'}`}
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? <Edit3 size={14} /> : <Eye size={14} />}
                            {isEditing ? "Edit Mode" : "Read-Only"}
                        </Button>

                        {isEditing && (
                            <Button
                                variant="default"
                                size="sm"
                                className="h-8 gap-2 px-4 shadow-lg shadow-primary/20"
                                onClick={handleSave}
                                disabled={!isDirty || isSaving}
                            >
                                <Save size={14} />
                                Save
                            </Button>
                        )}

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-full hover:bg-white/10"
                            onClick={onClose}
                        >
                            <X size={16} />
                        </Button>
                    </div>
                </div>

                {/* Editor Body */}
                <div className="flex-1 relative bg-[#1e1e1e]">
                    <Editor
                        height="100%"
                        language={getLanguage(filePath)}
                        theme="vs-dark"
                        value={content}
                        options={{
                            readOnly: !isEditing,
                            fontSize: 14,
                            minimap: { enabled: true },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 20 },
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            cursorBlinking: "smooth",
                            smoothScrolling: true,
                            lineNumbers: "on",
                            renderLineHighlight: "all",
                            scrollbar: {
                                vertical: "visible",
                                horizontal: "visible",
                                useShadows: false,
                                verticalHasArrows: false,
                                horizontalHasArrows: false,
                                verticalScrollbarSize: 10,
                                horizontalScrollbarSize: 10
                            }
                        }}
                        onChange={(value) => {
                            setContent(value || "");
                            setIsDirty(value !== initialContent);
                        }}
                    />

                    {/* Draggable Overlay or specific glass effect can go here */}
                </div>

                {/* Footer / Info */}
                <div className="p-2 border-t border-white/5 bg-white/5 flex items-center justify-between px-4">
                    <span className="text-[10px] text-muted-foreground">
                        Press {navigator.platform.includes('Mac') ? '⌘+S' : 'Ctrl+S'} to save changes
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {getLanguage(filePath)} Engine
                    </span>
                </div>
            </Card>
        </div>
    );
}
