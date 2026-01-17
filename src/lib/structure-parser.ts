import type { FileNode } from "./file-system";

export interface GraphNode {
    id: string;
    label: string;
    type: "dir" | "file";
    parentId?: string;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
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
