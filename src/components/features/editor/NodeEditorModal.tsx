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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[4px] animate-in fade-in duration-200">
            <Card className="w-full max-w-[90vw] h-[85vh] bg-[#030303]/60 border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative ring-1 ring-white/5">
                {/* Noise Texture Overlay */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("/noise.png")' }}></div>

                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/5 backdrop-blur-3xl z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-white/50 uppercase tracking-widest leading-none mb-1 font-medium">Editing File</span>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-white/90 truncate max-w-[400px] font-mono">{filePath}</h3>
                                {isDirty && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                            </div>
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 border border-white/5 text-[10px] font-medium backdrop-blur-md">
                            {saveStatus === 'saving' && (
                                <>
                                    <Loader2 size={12} className="animate-spin text-primary" />
                                    <span className="text-primary animate-pulse uppercase tracking-wider">Saving...</span>
                                </>
                            )}
                            {saveStatus === 'saved' && (
                                <>
                                    <Check size={12} className="text-green-400" />
                                    <span className="text-green-400 uppercase tracking-wider">Saved</span>
                                </>
                            )}
                            {saveStatus === 'error' && (
                                <>
                                    <AlertCircle size={12} className="text-red-400" />
                                    <span className="text-red-400 uppercase tracking-wider">Failed</span>
                                </>
                            )}
                            {saveStatus === 'idle' && (
                                <span className="text-white/40 uppercase tracking-wider">{isDirty ? 'Unsaved' : 'Ready'}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-2 text-[10px] h-7 transition-all ${isEditing ? 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? <Edit3 size={12} /> : <Eye size={12} />}
                            {isEditing ? "EDITING" : "READ ONLY"}
                        </Button>

                        {isEditing && (
                            <Button
                                variant="default"
                                size="sm"
                                className="h-7 gap-2 px-4 shadow-[0_0_15px_-3px_rgba(255,255,255,0.1)] text-[10px] font-bold tracking-wide"
                                onClick={handleSave}
                                disabled={!isDirty || isSaving}
                            >
                                <Save size={12} />
                                SAVE CHANGES
                            </Button>
                        )}

                        <div className="w-px h-6 bg-white/10 mx-2" />

                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 rounded-full hover:bg-red-500/20 hover:text-red-400 text-white/50 transition-colors"
                            onClick={onClose}
                        >
                            <X size={14} />
                        </Button>
                    </div>
                </div>

                {/* Editor Body */}
                <div className="flex-1 relative bg-transparent z-10">
                    <Editor
                        height="100%"
                        language={getLanguage(filePath)}
                        theme="vs-dark"
                        value={content}
                        options={{
                            readOnly: !isEditing,
                            fontSize: 14,
                            minimap: { enabled: true, scale: 0.75 },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 20, bottom: 20 },
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            cursorBlinking: "smooth",
                            smoothScrolling: true,
                            lineNumbers: "on",
                            renderLineHighlight: "all",
                            fontLigatures: true,
                            contextmenu: true,
                            scrollbar: {
                                vertical: "visible",
                                horizontal: "visible",
                                useShadows: false,
                                verticalScrollbarSize: 10,
                                horizontalScrollbarSize: 10
                            }
                        }}
                        onChange={(value) => {
                            setContent(value || "");
                            setIsDirty(value !== initialContent);
                        }}
                        beforeMount={(monaco) => {
                            monaco.editor.defineTheme('archway-glass', {
                                base: 'vs-dark',
                                inherit: true,
                                rules: [],
                                colors: {
                                    'editor.background': '#00000000', // Transparent
                                    'editor.lineHighlightBackground': '#ffffff05',
                                    'editorLineNumber.foreground': '#ffffff30',
                                    'editorLineNumber.activeForeground': '#ffffff80',
                                    'scrollbarSlider.background': '#ffffff10',
                                    'scrollbarSlider.hoverBackground': '#ffffff20',
                                    'scrollbarSlider.activeBackground': '#ffffff30',
                                }
                            });
                        }}
                        onMount={(editor, monaco) => {
                            monaco.editor.setTheme('archway-glass');
                        }}
                    />
                </div>

                {/* Footer */}
                <div className="h-8 border-t border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-between px-4 z-10">
                    <div className="flex items-center gap-4 text-[10px] text-white/40 font-mono">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                            UTF-8
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                            {navigator.platform.includes('Mac') ? '⌘S to save' : 'Ctrl+S to save'}
                        </span>
                    </div>
                    <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
                        {getLanguage(filePath)} MODE
                    </span>
                </div>
            </Card>
        </div>
    );
}
