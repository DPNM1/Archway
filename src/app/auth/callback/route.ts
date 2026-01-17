import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    console.log("Auth callback reached:", request.url);
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");

    if (code) {
        console.log("Exchanging code for session...");
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error("Code exchange error:", error);
            return NextResponse.redirect(`${requestUrl.origin}/?error=auth_exchange_failed`);
        }
    } else {
        console.warn("No code found in auth callback");
    }

    // URL to redirect to after sign in process completes
    console.log("Redirecting back to origin:", requestUrl.origin);
    return NextResponse.redirect(requestUrl.origin);
}
