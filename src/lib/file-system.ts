import fs from "fs/promises";
import path from "path";

export interface FileNode {
    name: string;
    path: string;
    type: "file" | "dir";
    children?: FileNode[];
}

export async function getFileTree(dirPath: string, rootPath: string = ""): Promise<FileNode[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const nodes: FileNode[] = [];

    for (const entry of entries) {
        // Skip hidden files and common ignore patterns
        if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist" || entry.name === "build") {
            continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.join(rootPath, entry.name);

        const node: FileNode = {
            name: entry.name,
            path: relativePath, // Use relative path for ID/Navigation
            type: entry.isDirectory() ? "dir" : "file",
        };

        if (entry.isDirectory()) {
            node.children = await getFileTree(fullPath, relativePath);
        }

        nodes.push(node);
    }

    // Sort: directories first, then files
    return nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "dir" ? -1 : 1;
    });
}

export async function getFileContent(dirPath: string, relativePath: string): Promise<string> {
    try {
        const fullPath = path.join(dirPath, relativePath);
        // Verify path is within dirPath to prevent traversal attacks
        if (!fullPath.startsWith(dirPath)) {
            throw new Error("Invalid path");
        }
        return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
        return "";
    }
}

export async function saveFileContent(dirPath: string, relativePath: string, content: string): Promise<boolean> {
    try {
        const fullPath = path.join(dirPath, relativePath);
        // Verify path is within dirPath to prevent traversal attacks
        if (!fullPath.startsWith(dirPath)) {
            throw new Error("Invalid path");
        }
        await fs.writeFile(fullPath, content, 'utf-8');
        return true;
    } catch (error) {
        console.error("Save Error:", error);
        return false;
    }
}
