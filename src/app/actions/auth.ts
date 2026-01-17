"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signInWithGithub() {
    const supabase = await createClient();
    const headerList = await headers();
    const host = headerList.get("host");
    const origin = headerList.get("origin");

    // Fallback logic for redirect URL
    let redirectTo = `${origin}/auth/callback`;
    if (!origin && host) {
        const protocol = host.includes('localhost') ? 'http' : 'https';
        redirectTo = `${protocol}://${host}/auth/callback`;
    }

    console.log("Attempting GitHub Sign In. Redirecting to:", redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
            redirectTo,
        },
    });

    if (error) {
        console.error("Auth Error:", error);
        return redirect("/?error=auth_failed");
    }

    if (data.url) {
        redirect(data.url);
    }
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
}

export async function getUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
