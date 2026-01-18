import type { FileNode } from "./file-system";

export interface MetricData {
    complexity: number;  // Normalized 0-1, derived from LOC and nesting depth
    coupling: number;    // Normalized 0-1, inbound + outbound dependencies
    size: number;        // Normalized 0-1, file size
    rawSize: number;     // Actual bytes
    rawLOC: number;      // Lines of code
}

export interface GraphNode {
    id: string;
    label: string;
    type: "dir" | "file";
    parentId?: string;
    metrics?: MetricData;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    data?: any;
    animated?: boolean;
    style?: any;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export function generateStructureGraph(fileTree: FileNode[]): GraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    function traverse(node: FileNode, parentId?: string) {
        // Add Node
        nodes.push({
            id: node.path,
            label: node.name,
            type: node.type === "dir" ? "dir" : "file",
            parentId: parentId
        });

        // Add Edge from Parent
        if (parentId) {
            edges.push({
                id: `${parentId}->${node.path}`,
                source: parentId,
                target: node.path
            });
        }

        // Recurse
        if (node.children) {
            node.children.forEach(child => traverse(child, node.path));
        }
    }

    fileTree.forEach(rootNode => traverse(rootNode));

    return { nodes, edges };
}
