"use server";

import { createClient } from "@/lib/supabase/server";
import fs from "fs/promises";
import path from "path";

interface CodeChunk {
    path: string;
    content: string;
    startLine: number;
    endLine: number;
}

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

async function getEmbeddings(texts: string[]): Promise<number[][]> {
    const token = process.env.HUGGING_FACE_TOKEN;
    if (!token) throw new Error("HUGGING_FACE_TOKEN is missing in .env");

    const response = await fetch(HF_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: texts }),
    });

    if (!response.ok) {
        const error = await response.text();
        // Handle model loading/queueing
        if (response.status === 503) {
            console.log("Model is loading, retrying in 5 seconds...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            return getEmbeddings(texts);
        }
        throw new Error(`HF API Error: ${error}`);
    }

    return response.json();
}

/**
 * Splits code into chunks of ~1000 chars with overlap.
 */
function chunkCode(filePath: string, content: string): CodeChunk[] {
    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];
    const CHUNK_LEN = 1000;

    let currentChunkLines: string[] = [];
    let currentLen = 0;
    let startLine = 1;

    for (let i = 0; i < lines.length; i++) {
        currentChunkLines.push(lines[i]);
        currentLen += lines[i].length + 1;

        if (currentLen >= CHUNK_LEN || i === lines.length - 1) {
            chunks.push({
                path: filePath,
                content: currentChunkLines.join('\n'),
                startLine: startLine,
                endLine: i + 1
            });

            // Handle overlap - keep last few lines for context
            const overlapCount = Math.min(currentChunkLines.length, 3);
            const overlapLines = currentChunkLines.slice(-overlapCount);
            currentChunkLines = [...overlapLines];
            currentLen = currentChunkLines.reduce((acc, l) => acc + l.length + 1, 0);
            startLine = i + 1 - overlapCount + 2;
        }
    }

    return chunks;
}

async function walk(dir: string, baseDir: string): Promise<string[]> {
    const files = await fs.readdir(dir);
    let result: string[] = [];
    const ignoreFolders = ["node_modules", ".git", ".next", "dist", "build"];
    const allowedExts = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".c", ".cpp"];

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            if (ignoreFolders.includes(file)) continue;
            result = result.concat(await walk(fullPath, baseDir));
        } else {
            if (allowedExts.includes(path.extname(file))) {
                result.push(path.relative(baseDir, fullPath));
            }
        }
    }
    return result;
}

export async function indexRepository(localPath: string, repoId: string) {
    try {
        const supabase = await createClient();
        const files = await walk(localPath, localPath);
        const allChunks: CodeChunk[] = [];

        for (const file of files) {
            const content = await fs.readFile(path.join(localPath, file), "utf-8");
            const chunks = chunkCode(file, content);
            allChunks.push(...chunks);
        }

        console.log(`Repository ${repoId}: Chunking complete. ${allChunks.length} chunks generated.`);

        // Process in batches of 10 to avoid API limits and timeouts
        const BATCH_SIZE = 10;
        for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
            const batch = allChunks.slice(i, i + BATCH_SIZE);
            const batchTexts = batch.map(c => `File: ${c.path}\n\n${c.content}`);

            const embeddings = await getEmbeddings(batchTexts);

            const rowsToInsert = batch.map((chunk, index) => ({
                repository_id: repoId,
                path: chunk.path,
                content: chunk.content,
                embedding: embeddings[index],
                metadata: {
                    startLine: chunk.startLine,
                    endLine: chunk.endLine
                }
            }));

            const { error } = await supabase.from("code_embeddings").insert(rowsToInsert);
            if (error) throw error;
        }

        return { success: true, count: allChunks.length };
    } catch (e) {
        console.error("Indexing Error:", e);
        return { success: false, error: String(e) };
    }
}

export async function searchCode(query: string, repoId: string, limit: number = 5) {
    try {
        const [embedding] = await getEmbeddings([query]);
        const supabase = await createClient();

        const { data, error } = await supabase.rpc("match_code_chunks", {
            query_embedding: embedding,
            match_threshold: 0.3,
            match_count: limit,
            repo_id: repoId
        });

        if (error) throw error;
        return { success: true, results: data };
    } catch (e) {
        console.error("Search Error:", e);
        return { success: false, error: String(e) };
    }
}
