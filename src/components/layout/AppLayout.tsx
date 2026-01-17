import { AppSidebar } from "./AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <AppSidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header/Top bar can go here if needed later */}
                <div className="flex-1 w-full h-full relative">
                    <div className="absolute inset-0 overflow-auto p-6 md:p-8">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
