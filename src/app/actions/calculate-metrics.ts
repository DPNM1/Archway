"use server";

import * as fs from "fs/promises";
import * as path from "path";
import type { GraphNode, GraphEdge, MetricData } from "@/lib/structure-parser";

interface MetricCalculationResult {
    nodeId: string;
    metrics: MetricData;
}

/**
 * Calculates metrics for each node in the graph.
 * - Complexity: Based on lines of code (normalized).
 * - Coupling: Based on inbound + outbound edges (normalized).
 * - Size: Based on file byte size (normalized).
 */
export async function calculateMetrics(
    localPath: string,
    nodes: GraphNode[],
    edges: GraphEdge[]
): Promise<MetricCalculationResult[]> {
    const results: MetricCalculationResult[] = [];

    // 1. Calculate coupling for each node
    const couplingMap = new Map<string, number>();
    for (const node of nodes) {
        const inbound = edges.filter(e => e.target === node.id).length;
        const outbound = edges.filter(e => e.source === node.id).length;
        couplingMap.set(node.id, inbound + outbound);
    }
    const maxCoupling = Math.max(...couplingMap.values(), 1);

    // 2. Calculate LOC and size for each file node
    const fileMetrics: { id: string; loc: number; size: number }[] = [];
    for (const node of nodes) {
        if (node.type === "file") {
            try {
                const filePath = path.join(localPath, node.id);
                const stats = await fs.stat(filePath);
                const content = await fs.readFile(filePath, "utf-8");
                const loc = content.split("\n").length;
                fileMetrics.push({ id: node.id, loc, size: stats.size });
            } catch {
                // File may not exist or be readable
                fileMetrics.push({ id: node.id, loc: 0, size: 0 });
            }
        }
    }

    const maxLOC = Math.max(...fileMetrics.map(f => f.loc), 1);
    const maxSize = Math.max(...fileMetrics.map(f => f.size), 1);

    // 3. Build results
    for (const node of nodes) {
        const coupling = couplingMap.get(node.id) || 0;
        const normalizedCoupling = coupling / maxCoupling;

        if (node.type === "file") {
            const fm = fileMetrics.find(f => f.id === node.id);
            const loc = fm?.loc || 0;
            const size = fm?.size || 0;

            results.push({
                nodeId: node.id,
                metrics: {
                    complexity: loc / maxLOC,
                    coupling: normalizedCoupling,
                    size: size / maxSize,
                    rawSize: size,
                    rawLOC: loc,
                },
            });
        } else {
            // For directories, aggregate children metrics
            // We find all file nodes that are descendants of this directory
            // Node IDs are paths relative to the root
            const childFileMetrics = fileMetrics.filter(f => f.id.startsWith(node.id + "/"));
            const totalLOC = childFileMetrics.reduce((sum, f) => sum + f.loc, 0);
            const totalSize = childFileMetrics.reduce((sum, f) => sum + f.size, 0);

            results.push({
                nodeId: node.id,
                metrics: {
                    complexity: totalLOC / maxLOC, // Could also use a different maxLOC for folders if desired
                    coupling: normalizedCoupling,
                    size: totalSize / maxSize,
                    rawSize: totalSize,
                    rawLOC: totalLOC,
                },
            });
        }
    }

    return results;
}
