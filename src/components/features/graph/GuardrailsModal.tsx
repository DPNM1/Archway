"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    getArchitectureRules,
    createArchitectureRule,
    ArchitectureRule
} from "@/app/actions/guardrails";
import { Shield, Plus, Trash2, AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

interface GuardrailsModalProps {
    repoId: string;
    onRulesChange?: () => void;
}

export function GuardrailsModal({ repoId, onRulesChange }: GuardrailsModalProps) {
    const [rules, setRules] = useState<ArchitectureRule[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // New rule state
    const [newRule, setNewRule] = useState<Omit<ArchitectureRule, 'id'>>({
        source_pattern: "",
        target_pattern: "",
        rule_type: "deny",
        severity: "error",
        description: ""
    });

    const fetchRules = async () => {
        const data = await getArchitectureRules(repoId);
        setRules(data);
    };

    useEffect(() => {
        if (isOpen && repoId) {
            fetchRules();
        }
    }, [isOpen, repoId]);

    const handleAddRule = async () => {
        if (!newRule.source_pattern || !newRule.target_pattern) return;
        setLoading(true);
        const res = await createArchitectureRule(repoId, newRule);
        if (res.success) {
            setNewRule({
                source_pattern: "",
                target_pattern: "",
                rule_type: "deny",
                severity: "error",
                description: ""
            });
            fetchRules();
            onRulesChange?.();
        }
        setLoading(false);
    };

    const getSeverityIcon = (sev: string) => {
        switch (sev) {
            case 'error': return <AlertOctagon className="text-red-500" size={14} />;
            case 'warning': return <AlertTriangle className="text-yellow-500" size={14} />;
            default: return <Info className="text-blue-500" size={14} />;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Shield size={16} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Shield className="text-primary" size={20} />
                        </div>
                        <DialogTitle className="text-xl font-bold tracking-tight">Architectural Guardrails</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Add New Rule */}
                    <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Plus size={14} /> Add New Rule
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Source Pattern (Regex)</Label>
                                <Input
                                    placeholder="e.g. src/components/.*"
                                    className="bg-background/50 h-9 text-sm"
                                    value={newRule.source_pattern}
                                    onChange={(e) => setNewRule({ ...newRule, source_pattern: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Target Pattern (Regex)</Label>
                                <Input
                                    placeholder="e.g. src/actions/.*"
                                    className="bg-background/50 h-9 text-sm"
                                    value={newRule.target_pattern}
                                    onChange={(e) => setNewRule({ ...newRule, target_pattern: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Action</Label>
                                <Select
                                    value={newRule.rule_type}
                                    onValueChange={(val: any) => setNewRule({ ...newRule, rule_type: val })}
                                >
                                    <SelectTrigger className="bg-background/50 h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="deny">Deny Dependency</SelectItem>
                                        <SelectItem value="allow">Allow Only (Future)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Severity</Label>
                                <Select
                                    value={newRule.severity}
                                    onValueChange={(val: any) => setNewRule({ ...newRule, severity: val })}
                                >
                                    <SelectTrigger className="bg-background/50 h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Info</SelectItem>
                                        <SelectItem value="warning">Warning</SelectItem>
                                        <SelectItem value="error">Error</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Input
                                placeholder="Why is this rule here?"
                                className="bg-background/50 h-9 text-sm"
                                value={newRule.description}
                                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                            />
                        </div>

                        <Button
                            className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                            onClick={handleAddRule}
                            disabled={loading || !newRule.source_pattern || !newRule.target_pattern}
                        >
                            {loading ? "Adding..." : "Create Rule"}
                        </Button>
                    </div>

                    {/* Rules List */}
                    <div className="space-y-3">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">Active Rules</Label>
                        <ScrollArea className="h-[200px] pr-4">
                            <div className="space-y-2">
                                {rules.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm italic">
                                        No guardrails defined yet.
                                    </div>
                                ) : (
                                    rules.map((rule) => (
                                        <div key={rule.id} className="flex items-start justify-between p-3 rounded-lg border border-border/50 bg-muted/10 group hover:bg-muted/20 transition-all">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    {getSeverityIcon(rule.severity)}
                                                    <span className="text-xs font-mono font-medium">{rule.source_pattern}</span>
                                                    <span className="text-muted-foreground">→</span>
                                                    <span className="text-xs font-mono font-medium text-red-400">{rule.target_pattern}</span>
                                                </div>
                                                {rule.description && (
                                                    <p className="text-[10px] text-muted-foreground italic pl-5">{rule.description}</p>
                                                )}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10">
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
