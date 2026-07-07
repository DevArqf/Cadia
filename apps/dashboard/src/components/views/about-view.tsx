"use client";

import { motion } from "framer-motion";
import { CadiaLogo } from "@/components/cadia-logo";
import { CadiaFooter } from "@/components/cadia-footer";
import { useCadia } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Swords,
  Trophy,
  Sparkles,
  ChevronRight,
  Heart,
  Code,
  Users,
} from "lucide-react";

const SECTIONS = [
  {
    icon: Shield,
    title: "Control without Complexity",
    color: "#3bb143",
    text: "Cadia gives administrators precise control over commands, channels, and roles without turning routine work into configuration overhead. Automated protection handles common threats, audit records preserve accountability, and focused permissions keep staff access appropriate.",
  },
  {
    icon: Swords,
    title: "Engagement with Depth",
    color: "#5e3a6d",
    text: "Cadia's optional RPG system turns everyday participation into progression. Members can choose classes, complete quests, compete, cooperate, and build lasting profiles. Server owners retain control over pacing, rewards, and access.",
  },
  {
    icon: Trophy,
    title: "Progress Members Can See",
    color: "#65b8da",
    text: "Live leaderboards, achievements, and seasonal goals make contribution visible. New members can find a path forward, established members can protect their standing, and staff can recognize progress without manual tracking.",
  },
  {
    icon: Heart,
    title: "Built with Care",
    color: "#e94041",
    text: "Cadia is built around practical community management. The project is open source, its controls are designed to be understandable, and its free tier provides the foundation needed to operate a capable Discord server.",
  },
];

export function AboutView() {
  const setView = useCadia((s) => s.setView);

  return (
    <div className="relative min-h-screen overflow-hidden cadia-bg scanlines">
      <div className="cadia-particles" />
      <div className="cadia-bg-shine" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-border/40 backdrop-blur-xl bg-card/30">
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-3 cursor-pointer"
          aria-label="Go to home"
        >
          <CadiaLogo size={36} animated={false} />
          <span className="font-pixel text-sm text-cadia tracking-wider">CADIA</span>
        </button>
        <Button
          onClick={() => setView("landing")}
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to Home
        </Button>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex mb-4"
          >
            <CadiaLogo size={72} animated={true} />
          </motion.div>
          <h1 className="font-pixel text-2xl sm:text-4xl text-cadia text-glow-cadia mb-3 tracking-wider">
            ABOUT CADIA
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Purpose-built tools for communities that expect clarity, control, and room to grow.
          </p>
        </motion.div>

        {/* 4 alternating image/text sections */}
        <div className="space-y-16 sm:space-y-24">
          {SECTIONS.map((section, i) => {
            const isImageRight = i % 2 === 0; // even = image right, odd = image left
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5 }}
                className={`flex flex-col ${
                  isImageRight ? "sm:flex-row" : "sm:flex-row-reverse"
                } items-center gap-8 sm:gap-10`}
              >
                {/* Text side */}
                <div className="flex-1 text-left">
                  <div
                    className="inline-flex h-11 w-11 items-center justify-center mb-4 rounded-xl border-2"
                    style={{
                      background: `${section.color}20`,
                      borderColor: `${section.color}60`,
                      color: section.color,
                      boxShadow: `0 0 16px -4px ${section.color}60`,
                    }}
                  >
                    <section.icon className="h-5 w-5" />
                  </div>
                  <h2
                    className="font-pixel text-base sm:text-lg mb-4 tracking-wide"
                    style={{ color: section.color }}
                  >
                    {section.title.toUpperCase()}
                  </h2>
                  <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                    {section.text}
                  </p>
                </div>

                {/* Image side (placeholder) */}
                <div
                  className="flex-shrink-0 w-full sm:w-64 h-48 sm:h-56 rounded-2xl border-2 flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${section.color}15, rgba(17,22,29,0.6))`,
                    borderColor: `${section.color}40`,
                    boxShadow: `0 0 24px -8px ${section.color}50`,
                  }}
                >
                  {/* Placeholder icon */}
                  <div
                    className="flex flex-col items-center gap-3 opacity-50"
                    style={{ color: section.color }}
                  >
                    <section.icon className="h-12 w-12" />
                    <span className="text-[10px] font-pixel tracking-wider">
                      IMAGE
                    </span>
                  </div>
                  {/* Decorative grid pattern */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `linear-gradient(${section.color} 1px, transparent 1px), linear-gradient(90deg, ${section.color} 1px, transparent 1px)`,
                      backgroundSize: "20px 20px",
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-20"
        >
          {[
            { icon: Users, value: "1,200+", label: "Servers", color: "#65b8da" },
            { icon: Code, value: "50K+", label: "Commands/day", color: "#3bb143" },
            { icon: Shield, value: "99.9%", label: "Uptime", color: "#5e3a6d" },
            { icon: Heart, value: "100%", label: "Open source", color: "#e94041" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="cadia-card p-4 text-center"
            >
              <stat.icon
                className="h-5 w-5 mx-auto mb-2"
                style={{ color: stat.color }}
              />
              <div className="text-lg font-bold text-foreground">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mt-16"
        >
          <Button
            onClick={() => setView("landing")}
            className="cadia-btn bg-cadia text-background hover:bg-cadia-dark text-sm font-semibold h-12 px-8"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Get Started with Cadia
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Start free. Upgrade when your community needs more.
          </p>
        </motion.div>
      </main>

      <CadiaFooter />
    </div>
  );
}
