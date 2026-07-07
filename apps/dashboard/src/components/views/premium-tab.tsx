"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useCadia } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap, Shield, Star } from "lucide-react";
import { PREMIUM_PLANS } from "@/lib/mock-data";
import { toast } from "sonner";

export function PremiumTab() {
  const server = useCadia((s) => s.selectedServer);
  const addLog = useCadia((s) => s.addLog);
  const user = useCadia((s) => s.user);
  const [selected, setSelected] = useState<string | null>(null);

  // Admin/owner can access without a regular user session
  const isAdminUnlocked = useCadia((s) => s.adminUnlocked);
  if (!server || (!user && !isAdminUnlocked)) return null;

  // Fallback user for admin-only sessions
  const effectiveUser = user || { id: "899385550585364481", username: "owner", discriminator: "0", globalName: "Owner", avatar: "#5e3a6d" };

  const handleChoose = (planId: string) => {
    setSelected(planId);
    const plan = PREMIUM_PLANS.find((p) => p.id === planId);
    if (plan) {
      toast.success(`${plan.name} selected`, {
        description: "Opening secure checkout...",
      });
      addLog({
        type: "audit",
        serverId: server.id,
        serverName: server.name,
        actor: effectiveUser.username,
        actorId: effectiveUser.id,
        action: "Selected premium plan",
        details: `Plan: ${plan.name} ($${plan.price}/${plan.period})`,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center py-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center justify-center h-14 w-14 mb-3 rounded-2xl border border-rpg/40 bg-rpg/10 cadia-float"
        >
          <Crown className="h-7 w-7 text-rpg" />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Unlock <span className="text-rpg">Cadia Premium</span>
        </h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Expand your server's capabilities with advanced customization and priority support. Change or cancel your plan at any time.
        </p>
      </div>

      {/* Current plan */}
      <div className="cadia-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles
            className={`h-4 w-4 ${server.premium ? "text-warning" : "text-muted-foreground"}`}
          />
          <span className="text-xs font-semibold text-muted-foreground">
            CURRENT PLAN
          </span>
        </div>
        {server.premium ? (
          <span className="cadia-premium-active-wrapper">
            <span className="cadia-premium-active-tag">
              <span className="relative z-10">Premium Active</span>
            </span>
            {/* Golden particles that escape the tag and drift upward */}
            <span className="cadia-gold-particles">
              <span className="cadia-gold-particle" />
              <span className="cadia-gold-particle" />
              <span className="cadia-gold-particle" />
              <span className="cadia-gold-particle" />
              <span className="cadia-gold-particle" />
              <span className="cadia-gold-particle" />
            </span>
          </span>
        ) : (
          <Badge className="text-[10px] font-semibold border bg-muted text-muted-foreground border-border">
            Free Tier
          </Badge>
        )}
      </div>

      {/* Plans grid : aligned panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch pt-4">
        {PREMIUM_PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className={`cadia-card p-6 mt-4 relative flex flex-col ${
              plan.highlight ? "border-rpg/50 overflow-visible" : ""
            }`}
            style={{
              borderColor: selected === plan.id ? plan.color : undefined,
              boxShadow: plan.highlight ? `0 8px 24px -8px ${plan.color}30` : undefined,
            }}
          >
            {/* Icon + Name + Best Deal badge beside title */}
            <div className="flex items-center gap-3 mb-4 h-14">
              <div
                className="h-11 w-11 flex items-center justify-center rounded-xl border shrink-0"
                style={{ background: `${plan.color}20`, borderColor: `${plan.color}40`, color: plan.color }}
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

            {/* Price : aligned baseline */}
            <div className="mb-5 h-10 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">
                ${plan.price}
              </span>
              <span className="text-xs text-muted-foreground">
                /{plan.period}
              </span>
            </div>

            {/* Features : aligned with consistent line heights */}
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

            {/* Button : aligned at bottom */}
            <Button
              onClick={() => handleChoose(plan.id)}
              disabled={plan.id === "plan-free"}
              className={`cadia-btn w-full text-sm font-semibold h-10 ${
                plan.id === "plan-free"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "text-background"
              }`}
              style={plan.id !== "plan-free" ? { background: plan.color } : undefined}
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
      <div className="cadia-card p-3 flex items-center justify-around flex-wrap gap-2">
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
      </div>
    </div>
  );
}
