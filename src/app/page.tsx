"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github,
  ArrowRight,
  Network,
  Bot,
  Zap,
  Search,
  History,
  Layout,
  ShieldCheck,
  ChevronRight,
  Globe
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginDialog } from "@/components/features/auth/LoginDialog";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [supabase.auth]);

  const handleAnalyze = () => {
    if (!url) return;
    router.push(`/workspace?repo=${encodeURIComponent(url)}`);
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  };

  const staggeredContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden">
      <LoginDialog isOpen={isLoginOpen} onOpenChange={setIsLoginOpen} />

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 px-6 py-4 ${scrolled ? "bg-black/60 backdrop-blur-md border-b border-white/5" : "bg-transparent"
        }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative w-8 h-8">
              <Image src="/assets/logo.png" alt="Archway Logo" fill className="object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tighter text-white">ARCHWAY</span>
          </div>

          <div className="flex items-center gap-6">
            <AnimatePresence>
              {!user ? (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  <Button
                    variant="ghost"
                    className="text-slate-400 hover:text-white transition-colors"
                    onClick={() => setIsLoginOpen(true)}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="bg-white text-black hover:bg-slate-200 rounded-full px-6 font-semibold transition-all h-9"
                    onClick={() => setIsLoginOpen(true)}
                  >
                    Get Started
                  </Button>
                </motion.div>
              ) : (
                <div className="flex items-center gap-4">
                  <Button
                    className="bg-white text-black hover:bg-slate-200 rounded-full px-6 font-semibold transition-all h-9 flex items-center gap-2"
                    onClick={() => router.push('/explorer')}
                  >
                    <History className="h-4 w-4" />
                    Dashboard
                  </Button>
                  <div className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-xs font-bold">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-white/5 to-transparent blur-3xl rounded-full opacity-20 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center mb-12"
          >
            {/* Main Centered Logo */}
            <div className="relative w-24 h-24 md:w-32 md:h-32 mb-6">
              <Image
                src="/assets/logo.png"
                alt="Archway Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-xl font-bold tracking-[0.3em] text-white mb-2">ARCHWAY</h1>
            <p className="text-slate-500 italic text-sm md:text-base font-medium">
              "Don't just read the code. See the code."
            </p>
          </motion.div>

          <motion.h2
            {...fadeInUp}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-[0.9] font-[family-name:var(--font-outfit)]"
          >
            THE PROACTIVE <br />
            <span className="text-white/40 italic">ARCHITECT.</span>
          </motion.h2>

          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed"
          >
            Archway transforms cryptic repositories into interactive neural graphs and data-driven insights.
            Navigate your architecture with the clarity you deserve.
          </motion.p>

          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.4 }}
            className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-2xl mx-auto"
          >
            <div className="relative w-full group">
              <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl group-hover:bg-white/10 transition-all duration-500" />
              <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl p-2 pl-4 backdrop-blur-xl focus-within:border-white/30 transition-all">
                <Globe className="h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Paste GitHub repository URL..."
                  className="bg-transparent border-none outline-none flex-1 px-4 text-white placeholder:text-slate-600 font-medium"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />
                <Button
                  onClick={handleAnalyze}
                  className="bg-white text-black hover:bg-slate-200 rounded-xl px-6 font-bold shadow-2xl h-11"
                >
                  Analyze
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>


        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggeredContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            <FeatureCard
              icon={<Network className="h-6 w-6" />}
              title="Neural Graph"
              description="Visualize complex dependencies as an interactive neural network. Hover to trace paths and identify bottlenecks."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Metric Insights"
              description="Get real-time complexity and coupling analysis. We flag hotspots before they become technical debt."
            />
            <FeatureCard
              icon={<Bot className="h-6 w-6" />}
              title="AI Architect"
              description="Llama-powered intelligence that reviews your whole structure at once. Not just code help—architectural help."
            />
          </motion.div>
        </div>
      </section>


      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 relative">
                <Image src="/assets/logo.png" alt="Archway Logo" fill className="object-contain" />
              </div>
              <span className="text-lg font-bold tracking-tighter">ARCHWAY</span>
            </div>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <FooterColumn title="Product" links={["Features", "Enterprise", "Pricing"]} />
            <FooterColumn title="Resources" links={["Documentation", "API Guide", "Community"]} />
            <FooterColumn title="Legal" links={["Privacy", "Terms", "Security"]} />
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 uppercase tracking-widest font-medium">
          <span>© 2026 ARCHWAY LABS INC.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">X / Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 }
      }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all group"
    >
      <div className="mb-6 p-4 w-fit rounded-2xl bg-white/5 group-hover:bg-white text-white group-hover:text-black transition-all">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">
        {description}
      </p>
      <div className="mt-6 flex items-center text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
        Learn More <ChevronRight className="ml-1 h-3 w-3" />
      </div>
    </motion.div>
  );
}


function FooterColumn({ title, links }: { title: string, links: string[] }) {
  return (
    <div className="space-y-6">
      <h4 className="text-xs font-bold uppercase tracking-[0.2em]">{title}</h4>
      <ul className="space-y-4">
        {links.map(link => (
          <li key={link}>
            <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">{link}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
