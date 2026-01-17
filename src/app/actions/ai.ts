"use server";

import { groq, MODEL_ID } from "@/lib/groq";
import type { FileNode } from "@/lib/file-system";

export type ChatMessage = {
    role: "user" | "assistant" | "system";
    content: string;
};

function flattenTree(nodes: FileNode[], depth = 0): string {
    let result = "";
    for (const node of nodes) {
        result += `${"  ".repeat(depth)}- ${node.name} (${node.type})\n`;
        if (node.children) {
            result += flattenTree(node.children, depth + 1);
        }
    }
    return result;
}

export async function generateProjectSummary(fileTree: FileNode[]): Promise<string> {
    try {
        const treeString = flattenTree(fileTree);
        const prompt = `
        You are an expert software architect. Analyze the following file structure of a software project and provide a concise summary (max 3 sentences) of what this project likely does, its stack, and architecture.
        
        File Tree:
        ${treeString}
        
        Summary:
        `;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: MODEL_ID,
            temperature: 0.5,
            max_tokens: 300,
        });

        return completion.choices[0]?.message?.content || "Could not generate summary.";
    } catch (e) {
        console.error("AI Error:", e);
        return "Failed to generate summary due to API error.";
    }
}

export async function chatWithRepo(history: ChatMessage[], fileTree: FileNode[], currentFileContext?: string): Promise<string> {
    try {
        const treeString = flattenTree(fileTree);
        // Prune history to last 10 messages to save tokens
        const visibleHistory = history.slice(-10);

        const systemPrompt = `
        You are Archway, an expert AI coding assistant.
        You have access to the file structure of the user's project:
        ${treeString}

        ${currentFileContext ? `The user is currently viewing this file content:\n${currentFileContext.substring(0, 5000)}... (truncated)` : ""}
        
        Answer questions about the codebase. Be concise and technical.
        
        GRAPH CONTROL:
        You can control the project structure graph by including special action tags in your response.
        - To focus and expand an existing file node (in-place highlight), use: <ArchwayAction command="focus" node="path/to/file" lines="10-20" />
        - To create a separate dedicated focus node (virtual node) for deep analysis, use: <ArchwayAction command="split" node="path/to/file" lines="10-20" />
        
        CRITICAL RULES:
        1. If you identify or describe specific lines of code, you MUST include an ArchwayAction tag!
        2. Use "focus" by default to show code in-place. Use "split" ONLY if the user asks to "separate", "split", or if the code is long and needs its own node.
        3. The 'node' path MUST exactly match the file structure above (forward slashes).
        4. Place tags at the VERY END of your response.

        EXAMPLES:
        - "The error handling is on lines 25-30: <ArchwayAction command="focus" node="src/main.ts" lines="25-30" />"
        - "Let's split this complex logic into a focus node: <ArchwayAction command="split" node="lib/auth.ts" lines="100-250" />"

        COMMUNICATION STYLE:
        - Be clean, friendly, and professionally technical.
        - Avoid unnecessary symbols unless required for code.
        - Keep the reply tidy and easy to read.
        `;

        const messages: ChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...visibleHistory
        ];

        const completion = await groq.chat.completions.create({
            messages: messages as { role: 'user' | 'assistant' | 'system', content: string }[],
            model: MODEL_ID,
            temperature: 0.7,
            max_tokens: 1000,
        });

        return completion.choices[0]?.message?.content || "I didn't understand that.";

    } catch (e) {
        console.error("Chat Error:", e);
        return "Error communicating with AI service.";
    }
}
