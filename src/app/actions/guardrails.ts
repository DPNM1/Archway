"use server";

import { createClient } from "@/lib/supabase/server";

export interface ArchitectureRule {
    id: string;
    source_pattern: string;
    target_pattern: string;
    rule_type: 'allow' | 'deny';
    severity: 'info' | 'warning' | 'error';
    description: string;
}

export async function getArchitectureRules(repoId: string): Promise<ArchitectureRule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("architecture_rules")
        .select("*")
        .eq("repository_id", repoId);

    if (error) {
        console.error("Error fetching rules:", error);
        return [];
    }
    return data || [];
}

export async function createArchitectureRule(repoId: string, rule: Omit<ArchitectureRule, 'id'>) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("architecture_rules")
        .insert({ ...rule, repository_id: repoId })
        .select()
        .single();

    if (error) {
        console.error("Error creating rule:", error);
        return { success: false, error: error.message };
    }
    return { success: true, rule: data };
}

export async function checkViolation(source: string, target: string, rules: ArchitectureRule[]) {
    for (const rule of rules) {
        const sourceRegex = new RegExp(`^${rule.source_pattern.replace(/\*/g, '.*')}$`);
        const targetRegex = new RegExp(`^${rule.target_pattern.replace(/\*/g, '.*')}$`);

        if (sourceRegex.test(source) && targetRegex.test(target)) {
            if (rule.rule_type === 'deny') {
                return rule;
            }
        }
    }
    return null;
}
