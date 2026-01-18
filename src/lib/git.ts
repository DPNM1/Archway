import * as git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import os from "os";

// Directory to store cloned repos temporarily
// Using os.tmpdir() ensures it works on Vercel's read-only file system (only /tmp is writable)
export const REPO_DIR = path.join(os.tmpdir(), "archway_repos");

export async function cloneRepository(repoUrl: string): Promise<string> {
    const repoName = repoUrl.split("/").pop()?.replace(".git", "") || `repo-${Date.now()}`;
    const targetPath = path.join(REPO_DIR, repoName);

    // Ensure clone directory exists
    try {
        await fsp.access(targetPath);
        // If exists, for MVP we assume it's valid.
        return targetPath;
    } catch {
        // Doesn't exist, clone it
        await fsp.mkdir(REPO_DIR, { recursive: true });

        // isomorphic-git clone
        await git.clone({
            fs,
            http,
            dir: targetPath,
            url: repoUrl,
            singleBranch: true,
            depth: 1
        });

        return targetPath;
    }
}
