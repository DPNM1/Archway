"use server";

import { cloneRepository } from "@/lib/git";
import AdmZip from "adm-zip";

import path from "path";

export async function downloadRepository(repoUrl: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
        const localPath = await cloneRepository(repoUrl);
        const zip = new AdmZip();

        // Add local folder contents to zip, nested in a folder with the repo name
        const folderName = path.basename(localPath);
        zip.addLocalFolder(localPath, folderName);

        const buffer = zip.toBuffer();
        return { success: true, data: buffer.toString("base64") };
    } catch (e: any) {
        console.error("Download Error:", e);
        return { success: false, error: e.message || "Failed to zip repository" };
    }
}
