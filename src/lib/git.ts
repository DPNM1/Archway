import simpleGit from "simple-git";
import path from "path";
import fs from "fs/promises";
import os from "os";

// Directory to store cloned repos temporarily
// Using os.tmpdir() ensures it works on Vercel's read-only file system (only /tmp is writable)
export const REPO_DIR = path.join(os.tmpdir(), "archway_repos");

export async function cloneRepository(repoUrl: string): Promise<string> {
    const git = simpleGit();
    const repoName = repoUrl.split("/").pop()?.replace(".git", "") || `repo-${Date.now()}`;
    const targetPath = path.join(REPO_DIR, repoName);

    // Ensure clone directory exists
    try {
        await fs.access(targetPath);
        // If exists, pull latest? Or just return path for MVP. 
        // For MVP, if it exists, we assume it's valid. 
        // Real app would likely use unique IDs.
        return targetPath;
    } catch {
        // Doesn't exist, clone it
        await fs.mkdir(REPO_DIR, { recursive: true });
        await git.clone(repoUrl, targetPath);
        return targetPath;
    }
}
