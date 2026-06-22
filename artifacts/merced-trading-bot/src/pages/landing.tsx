import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Activity, ArrowRight, TrendingUp, Zap, Shield, Globe } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
      
      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[128px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 flex flex-col items-center text-center px-4 max-w-4xl"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-secondary-border mb-8">
          <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse"></span>
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Live Signal Intelligence</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          Trade Smarter with <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">Real Market Intelligence</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl font-light">
          A precision signal intelligence platform for serious traders. Connect your broker and receive razor-sharp data, live signals, and actionable insights.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link href="/connect">
            <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto font-medium">
              Connect Broker
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left w-full max-w-3xl">
          <div className="flex flex-col items-center sm:items-start p-6 bg-card border border-card-border rounded-xl">
            <Activity className="h-8 w-8 text-accent mb-4" />
            <h3 className="font-semibold text-lg mb-2">Real-time Analysis</h3>
            <p className="text-sm text-muted-foreground">Lightning-fast signal generation scanning thousands of assets constantly.</p>
          </div>
          <div className="flex flex-col items-center sm:items-start p-6 bg-card border border-card-border rounded-xl">
            <Shield className="h-8 w-8 text-blue-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Precision Risk</h3>
            <p className="text-sm text-muted-foreground">Calculated stop losses and multiple take profit levels for exact execution.</p>
          </div>
          <div className="flex flex-col items-center sm:items-start p-6 bg-card border border-card-border rounded-xl">
            <Globe className="h-8 w-8 text-purple-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Multi-Broker</h3>
            <p className="text-sm text-muted-foreground">Seamlessly connect with top brokers including Binance, Bybit, and Exness.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
