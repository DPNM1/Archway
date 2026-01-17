"use server";

import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "./ai";

export async function saveChat(repoUrl: string, messages: ChatMessage[]) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, message: "Not authenticated" };

        const { error } = await supabase.from("chats").upsert({
            user_id: user.id,
            repo_url: repoUrl,
            messages: messages,
            updated_at: new Date().toISOString()
        }, { onConflict: "user_id, repo_url" });

        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error("Save Chat Error:", e);
        return { success: false, message: "Failed to save chat history" };
    }
}

export async function loadChat(repoUrl: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, message: "Not authenticated" };

        const { data, error } = await supabase
            .from("chats")
            .select("messages")
            .eq("user_id", user.id)
            .eq("repo_url", repoUrl)
            .single();

        if (error && error.code !== "PGRST116") throw error; // PGRST116 is "no rows found"

        return { success: true, messages: data?.messages as ChatMessage[] || [] };
    } catch (e) {
        console.error("Load Chat Error:", e);
        return { success: false, message: "Failed to load chat history" };
    }
}
