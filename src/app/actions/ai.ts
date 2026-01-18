"use server";

import { groq, MODEL_ID } from "@/lib/groq";
import type { FileNode } from "@/lib/file-system";
import { searchCode } from "./rag";
import { createClient } from "@/lib/supabase/server";

export type ChatMessage = {
    role: "user" | "assistant" | "system";
    content: string;
};

import type { GraphNode } from "@/lib/structure-parser";

const MAX_TREE_NODES = 300;

function flattenTree(
    nodes: FileNode[],
    depth = 0,
    state = { count: 0, truncated: false },
    graphNodes?: GraphNode[]
): string {
    let result = "";
    for (const node of nodes) {
        if (state.count >= MAX_TREE_NODES) {
            if (!state.truncated) {
                result += `${"  ".repeat(depth)}... (TRUNCATED: Repository too large for full AI context)\n`;
                state.truncated = true;
            }
            break;
        }

        const graphNode = graphNodes?.find(gn => gn.id === node.path);
        const metricsStr = graphNode?.metrics
            ? `[Complexity: ${graphNode.metrics.complexity.toFixed(2)}][Coupling: ${graphNode.metrics.coupling.toFixed(2)}][Size: ${graphNode.metrics.size.toFixed(2)}]`
            : "";

        result += `${"  ".repeat(depth)}- ${node.name} (${node.type}) [path: ${node.path}]${metricsStr}\n`;
        state.count++;

        if (node.children) {
            result += flattenTree(node.children, depth + 1, state, graphNodes);
        }
    }
    return result;
}

export async function generateProjectSummary(fileTree: FileNode[]): Promise<string> {
    try {
        const treeString = flattenTree(fileTree);
        const prompt = `
        You are an expert software architect. Analyze the following file structure and provide a concise summary (max 3 sentences).
        
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

export async function chatWithRepo(
    history: ChatMessage[],
    fileTree: FileNode[],
    currentFileContext?: string,
    repoUrl?: string,
    graphNodes?: GraphNode[]
): Promise<string> {
    try {
        const treeString = flattenTree(fileTree, 0, { count: 0, truncated: false }, graphNodes);
        const userQuery = history[history.length - 1]?.content || "";
        let ragContext = "";

        // Perform Semantic Search if repoUrl is provided
        if (repoUrl && userQuery) {
            try {
                const supabase = await createClient();
                const { data: repo } = await supabase
                    .from("repositories")
                    .select("id")
                    .eq("url", repoUrl)
                    .single();

                if (repo) {
                    const searchRes = await searchCode(userQuery, repo.id, 3);
                    if (searchRes.success && searchRes.results) {
                        ragContext = "\nRelevant code snippets found via semantic search:\n" +
                            searchRes.results.map((r: any) => `File: ${r.path}\nContent:\n${r.content}`).join('\n---\n');
                    }
                }
            } catch (ragError) {
                console.error("RAG Search failed, proceeding without it:", ragError);
            }
        }

        const visibleHistory = history.slice(-10);

        const systemPrompt = `
        You are Archway, the Visual AI Architect. You have two modes of operation:
        
        MODE 1: COMMAND & CONTROL (The default for actions)
        - Goal: Perform actions like 'open' (navigate), 'zoom' (focus), 'split', or 'make zone' (createZone).
        - Style: EXTREMELY MINIMAL. One short sentence max. NO YAPPING.
        - Example: "Opening src directory.", "Database zone created.", "Zooming into auth logic."

        MODE 2: ARCHITECTURAL EXPLANATION (Triggered by questions about logic/code/design)
        - Goal: Provide deep technical insight into how the code works.
        - Style: SYSTEMATIC and HIGHLY STRUCTURED. Use markdown (headings, bold text, lists).
        - Formatting Rules: 
            1. Use **Bold Headings** (###) for major sections.
            2. Leave AT LEAST one empty line between paragraphs and sections.
            3. Use bullet points for steps or features to ensure scanability.
            4. Use code blocks for any code snippets.
            5. NEVER give a single massive paragraph. Break it down into logical blocks.
        - Requirement: Even when explaining, ALWAYS include a <ArchwayAction> tag to focus on the relative file.
        - Path Rule: ALWAYS use the exact string found in the [path: ...] brackets from the Project Context for the "node" attribute in any tag. Do not guess or shorten the path.
        - Metric Insight: You are provided with [Complexity: 0-1][Coupling: 0-1] metrics for files. 
            * If Complexity > 0.7, proactively suggest splitting the file using <ArchwayAction command="split" ... />.
            * If Coupling > 0.7, mention that this file is a "Dependency Weight" and changes might have large side effects.

        CRITICAL TAGS (You MUST use these for any graph/file changes):
        - <ArchwayAction command="focus" node="path/to/file" lines="10-20" /> (Use this for 'zoom')
        - <ArchwayAction command="split" node="path/to/file" lines="10-20" /> (Use for 'split')
        - <ArchwayAction command="navigate" node="path/to/folder_or_file" /> (Use for 'open')
        - <ArchwayAction command="createZone" name="Name" color="#hex" nodes="path/1,path/2" /> (Use for 'make zone')

        Project Context (RAG & Tree):
        ${treeString}
        ${currentFileContext ? `Active File:\n${currentFileContext.substring(0, 3000)}` : ""}
        ${ragContext}
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

        const answer = completion.choices[0]?.message?.content || "I didn't understand that.";
        console.log("AI Answer length:", answer.length);
        return answer;

    } catch (e) {
        console.error("Chat Error Details:", e);
        return `Error communicating with AI service: ${e instanceof Error ? e.message : String(e)}`;
    }
}
