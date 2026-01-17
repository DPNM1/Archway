import fs from "fs/promises";
import path from "path";
import { getFileTree, FileNode } from "./file-system";

export interface GraphNode {
    id: string;
    label: string;
    type?: string;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
}

export interface DependencyData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// Simple regex for ES6 imports
const IMPORT_REGEX = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
// Dynamic imports? const x = await import(...) - maybe later.

async function getAllFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let files: string[] = [];
    for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = [...files, ...(await getAllFiles(fullPath))];
        } else if (entry.name.match(/\.(ts|tsx|js|jsx)$/)) {
            files.push(fullPath);
        }
    }
    return files;
}

export async function generateDependencyGraph(repoPath: string): Promise<DependencyData> {
    const files = await getAllFiles(repoPath);
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Map full path to relative ID
    const pathToId = (p: string) => path.relative(repoPath, p).replace(/\\/g, "/");

    // 1. Create Nodes
    for (const file of files) {
        const id = pathToId(file);
        nodes.push({ id, label: path.basename(file) });
    }

    // 2. Parse Imports and Create Edges
    for (const file of files) {
        const sourceId = pathToId(file);
        const content = await fs.readFile(file, "utf-8");

        let match;
        while ((match = IMPORT_REGEX.exec(content)) !== null) {
            const importPath = match[1];

            // Resolve import path
            if (importPath.startsWith(".")) {
                try {
                    const dir = path.dirname(file);
                    // Try extensions
                    const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];
                    let resolvedTarget = null;

                    for (const ext of extensions) {
                        const searchPath = path.resolve(dir, importPath + ext);
                        if (files.includes(searchPath)) {
                            resolvedTarget = searchPath;
                            break;
                        }
                    }

                    if (resolvedTarget) {
                        const targetId = pathToId(resolvedTarget);
                        edges.push({
                            id: `${sourceId}->${targetId}`,
                            source: sourceId,
                            target: targetId
                        });
                    }
                } catch (e) {
                    // Ignore resolution errors
                }
            }
        }
    }

    return { nodes, edges };
}
