"use server";

import { generateStructureGraph } from "@/lib/structure-parser";
import { getFileTree } from "@/lib/file-system";

export async function getRepoGraph(localPath: string) {
    try {
        if (!localPath) return { success: false, message: "No path provided." };

        // Use existing file tree to generate structure graph
        const fileTree = await getFileTree(localPath);
        const data = generateStructureGraph(fileTree);

        return { success: true, data };
    } catch (e) {
        console.error("Graph Error:", e);
        return { success: false, message: "Failed to generate graph." };
    }
}
