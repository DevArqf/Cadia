"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useCadia } from "@/lib/store";
import { CadiaLogo } from "@/components/cadia-logo";
import { CadiaFooter } from "@/components/cadia-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap, Shield, Star, ArrowLeft } from "lucide-react";
import { PREMIUM_PLANS } from "@/lib/mock-data";
import { toast } from "sonner";

export function PremiumView() {
  const user = useCadia((s) => s.user);
  const setView = useCadia((s) => s.setView);
  const addLog = useCadia((s) => s.addLog);
  const [selected, setSelected] = useState<string | null>(null);

  const effectiveUser = user || {
    id: "899385550585364481",
    username: "owner",
    discriminator: "0",
    globalName: "Owner",
    avatar: "#5e3a6d",
  };

  const handleChoose = (planId: string) => {
    setSelected(planId);
    const plan = PREMIUM_PLANS.find((p) => p.id === planId);
    if (plan) {
      toast.success(`${plan.name} selected`, {
        description: "Opening secure checkout...",
      });
      addLog({
        type: "audit",
        serverId: "-",
        serverName: "-",
        actor: effectiveUser.username,
        actorId: effectiveUser.id,
        action: "Selected premium plan",
        details: `Plan: ${plan.name} ($${plan.price}/${plan.period})`,
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden cadia-bg scanlines">
      <div className="cadia-particles" />
      <div className="cadia-bg-shine" />

      {/* Header */}
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
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to Home
        </Button>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center h-16 w-16 mb-4 rounded-2xl border border-rpg/40 bg-rpg/10 cadia-float"
          >
            <Crown className="h-8 w-8 text-rpg" />
          </motion.div>
          <h1 className="font-pixel text-2xl sm:text-4xl text-rpg mb-3 tracking-wider">
            CADIA PREMIUM
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Give your team more flexibility with advanced customization and priority support. Change or cancel your plan at any time.
          </p>
        </motion.div>

        {/* Plans grid : 3 plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {PREMIUM_PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              whileHover={{ y: -4 }}
              className={`cadia-card p-6 mt-4 relative flex flex-col ${
                plan.highlight ? "border-rpg/50 overflow-visible" : ""
              }`}
              style={{
                borderColor: selected === plan.id ? plan.color : undefined,
                boxShadow: plan.highlight
                  ? `0 8px 24px -8px ${plan.color}30`
                  : undefined,
              }}
            >
              {/* Icon + Name + Best Deal badge beside title */}
              <div className="flex items-center gap-3 mb-4 h-14">
                <div
                  className="h-11 w-11 flex items-center justify-center rounded-xl border shrink-0"
                  style={{
                    background: `${plan.color}20`,
                    borderColor: `${plan.color}40`,
                    color: plan.color,
                  }}
                >
                  {plan.id === "plan-free" ? (
                    <Shield className="h-5 w-5" />
                  ) : plan.id === "plan-pro" ? (
                    <Zap className="h-5 w-5" />
                  ) : (
                    <Star className="h-5 w-5" />
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <h3 className="text-lg font-bold" style={{ color: plan.color }}>
                    {plan.name}
                  </h3>
                  {plan.highlight && (
                    <span className="cadia-best-deal-badge">Best Deal</span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="mb-5 h-10 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">
                  ${plan.price}
                </span>
                <span className="text-xs text-muted-foreground">/{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-xs text-foreground/85 leading-relaxed"
                  >
                    <Check
                      className="h-3.5 w-3.5 mt-0.5 shrink-0"
                      style={{ color: plan.color }}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Button : luxurious golden shine on paid plans */}
              <Button
                onClick={() => handleChoose(plan.id)}
                disabled={plan.id === "plan-free"}
                className={`w-full text-sm font-semibold h-10 ${
                  plan.id === "plan-free"
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "cadia-premium-btn text-background"
                }`}
                style={
                  plan.id !== "plan-free" ? { background: plan.color } : undefined
                }
              >
                {plan.id === "plan-free"
                  ? "Current Tier"
                  : selected === plan.id
                    ? (
                    <>
                      <span className="cadia-check" /> Selected
                    </>
                  )
                    : `Choose ${plan.name}`}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="cadia-card p-3 flex items-center justify-around flex-wrap gap-2 mt-8"
        >
          {[
            { icon: Shield, label: "Secure checkout" },
            { icon: Zap, label: "Instant activation" },
            { icon: Crown, label: "Cancel anytime" },
          ].map((t) => (
            <div
              key={t.label}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <t.icon className="h-3.5 w-3.5 text-cadia" />
              {t.label}
            </div>
          ))}
        </motion.div>
      </main>

      <CadiaFooter />
    </div>
  );
}
