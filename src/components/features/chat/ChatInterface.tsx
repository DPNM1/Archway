"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User } from "lucide-react";
import { chatWithRepo, ChatMessage } from "@/app/actions/ai";
import { saveChat, loadChat } from "@/app/actions/chat-persistence";
import type { FileNode } from "@/lib/file-system";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
    fileTree: FileNode[];
    currentFileContent?: string;
    repoUrl?: string | null;
    onAction?: (action: { command: string, node: string, lines?: number[] }) => void;
}

export function ChatInterface({ fileTree, currentFileContent, repoUrl, onAction }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: "assistant", content: "Hi! I'm Archway AI. Ask me anything about this codebase." }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load chat history on mount
    useEffect(() => {
        if (repoUrl) {
            loadChat(repoUrl).then(res => {
                if (res.success && res.messages && res.messages.length > 0) {
                    setMessages(res.messages);
                }
            });
        }
    }, [repoUrl]);

    // Save chat history when messages change
    const persistChat = useCallback(async (newMessages: ChatMessage[]) => {
        if (repoUrl && newMessages.length > 0) {
            await saveChat(repoUrl, newMessages);
        }
    }, [repoUrl]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: ChatMessage = { role: "user", content: input };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput("");
        setLoading(true);

        try {
            const response = await chatWithRepo(updatedMessages, fileTree, currentFileContent);

            // Parse for actions: <ArchwayAction command="..." node="..." lines="..." />
            const actionRegex = /<ArchwayAction\s+command=["']([^"']+)["']\s+node=["']([^"']+)["'](?:\s+lines=["']([^"']+)["'])?\s*\/?>/gi;
            const matches = Array.from(response.matchAll(actionRegex));

            matches.forEach(match => {
                if (onAction) {
                    const command = match[1];
                    const node = match[2];
                    const linesStr = match[3];
                    let lines: number[] = [];

                    if (linesStr) {
                        linesStr.split(',').forEach(part => {
                            if (part.includes('-')) {
                                const [start, end] = part.split('-').map(Number);
                                for (let i = start; i <= end; i++) lines.push(i);
                            } else {
                                lines.push(Number(part));
                            }
                        });
                    }

                    onAction({ command, node, lines });
                }
            });

            // Clean response for display
            const cleanContent = response.replace(/<ArchwayAction[^>]*\/?>/gi, "").trim();

            const aiMsg: ChatMessage = { role: "assistant", content: cleanContent };
            const finalMessages = [...updatedMessages, aiMsg];
            setMessages(finalMessages);
            persistChat(finalMessages); // Save after AI response
        } catch (e) {
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-card/50 backdrop-blur-sm border-l border-border/50">
            <div className="p-4 border-b border-border/50">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Bot size={16} /> AI Chat
                </h2>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                            <Avatar className="h-8 w-8 border border-border">
                                {msg.role === "assistant" ? (
                                    <AvatarFallback className="bg-primary/10 text-primary"><Bot size={14} /></AvatarFallback>
                                ) : (
                                    <AvatarFallback className="bg-muted text-muted-foreground"><User size={14} /></AvatarFallback>
                                )}
                            </Avatar>
                            <div className={cn(
                                "rounded-lg p-3 text-sm max-w-[80%]",
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/50 text-foreground border border-border/50"
                            )}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-3">
                            <Avatar className="h-8 w-8"><AvatarFallback><Bot size={14} /></AvatarFallback></Avatar>
                            <div className="bg-muted/50 rounded-lg p-3 text-sm flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <div className="p-4 border-t border-border/50 bg-background/50">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask about this repo..."
                        className="flex-1 bg-background/50"
                        disabled={loading}
                    />
                    <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                        <Send size={18} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
