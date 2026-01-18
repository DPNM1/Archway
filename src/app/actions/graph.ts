"use server";

import { generateStructureGraph } from "@/lib/structure-parser";
import { getFileTree } from "@/lib/file-system";
import { getArchitectureRules, checkViolation } from "./guardrails";
import { createClient } from "@/lib/supabase/server";
import { calculateMetrics } from "./calculate-metrics";

export async function getRepoGraph(localPath: string, repoUrl?: string) {
    try {
        if (!localPath) return { success: false, message: "No path provided." };

        // 1. Generate core structure
        const fileTree = await getFileTree(localPath);
        const data = generateStructureGraph(fileTree);

        // 2. Check for Architectural Guardrails
        if (repoUrl) {
            const supabase = await createClient();
            const { data: repo } = await supabase
                .from("repositories")
                .select("id")
                .eq("url", repoUrl)
                .single();

            if (repo) {
                const rules = await getArchitectureRules(repo.id);
                if (rules.length > 0) {
                    // Enrichment logic needs to handle async checkViolation
                    data.edges = await Promise.all(data.edges.map(async edge => {
                        const violation = await checkViolation(edge.source, edge.target, rules);
                        if (violation) {
                            return {
                                ...edge,
                                animated: true,
                                style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' },
                                data: {
                                    ...edge.data,
                                    isViolation: true,
                                    ruleDescription: violation.description || `Violation: ${violation.source_pattern} -> ${violation.target_pattern}`
                                }
                            };
                        }
                        return edge;
                    }));
                }
            }
        }

        // 3. Calculate and attach metrics for heatmap mode
        const metricsResults = await calculateMetrics(localPath, data.nodes, data.edges);
        for (const result of metricsResults) {
            const node = data.nodes.find(n => n.id === result.nodeId);
            if (node) {
                node.metrics = result.metrics;
            }
        }

        return { success: true, data };
    } catch (e) {
        console.error("Graph Error:", e);
        return { success: false, message: "Failed to generate graph." };
    }
}
