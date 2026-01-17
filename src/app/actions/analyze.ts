"use server";

import { cloneRepository } from "@/lib/git";
import { getFileTree, FileNode } from "@/lib/file-system";
import { createClient } from "@/lib/supabase/server";

export type AnalysisResult = {
    success: boolean;
    message?: string;
    repoName?: string;
    fileTree?: FileNode[];
    localPath?: string;
};

export async function analyzeRepository(repoUrl: string): Promise<AnalysisResult> {
    try {
        if (!repoUrl.startsWith("http")) {
            return { success: false, message: "Invalid URL provided." };
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Clone
        const localPath = await cloneRepository(repoUrl);

        // 2. Scan
        const fileTree = await getFileTree(localPath);

        const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "unknown-repo";

        // 3. Persist if user is logged in
        if (user) {
            await supabase.from("repositories").upsert({
                user_id: user.id,
                url: repoUrl,
                name: repoName,
                last_analyzed_at: new Date().toISOString()
            }, { onConflict: "user_id, url" });
        }

        return {
            success: true,
            repoName,
            fileTree,
            localPath
        };
    } catch (error) {
        console.error("Analysis failed:", error);
        return { success: false, message: error instanceof Error ? error.message : "Failed to analyze repository." };
    }
}
