"use server";

import { getFileContent, saveFileContent } from "@/lib/file-system";
import path from "path";

export async function readFileContent(localPath: string, filePath: string) {
    try {
        if (!localPath || !filePath) return { success: false, content: "" };
        const content = await getFileContent(localPath, filePath);
        return { success: true, content };
    } catch (e) {
        return { success: false, content: "Error reading file." };
    }
}

export async function updateFileContent(localPath: string, filePath: string, content: string) {
    try {
        if (!localPath || !filePath) return { success: false };
        const success = await saveFileContent(localPath, filePath, content);
        return { success };
    } catch (e) {
        console.error("Action Error:", e);
        return { success: false };
    }
}
