"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCadia } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Lock,
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Check,
} from "lucide-react";

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60_000; // 1 minute
const LOCKOUT_MS = 60_000; // 1 minute lockout after MAX_ATTEMPTS

interface AttemptRecord {
  ts: number;
  reason: string;
}

/**
 * Owner-only admin console listener.
 *
 * Reachable exclusively via the secret console command:
 *   cadia.dev.admin.panel()
 *
 * No keyboard shortcut (too easy to discover).
 * No public-facing explanation of access methods.
 * All access attempts : successful and failed : are silently recorded
 * to the audit log; no warnings are displayed to non-owners.
 */
export function AdminConsoleListener() {
  const open = useCadia((s) => s.adminConsoleOpen);
  const close = useCadia((s) => s.closeAdminConsole);
  const setView = useCadia((s) => s.setView);
  const addLog = useCadia((s) => s.addLog);
  const user = useCadia((s) => s.user);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [tick, setTick] = useState(0); // forces re-render for countdown
  const hintRef = useRef(false);

  // === 1) Listen for the secret console command ===
  useEffect(() => {
    const handler = async () => {
      const response = await fetch("/api/admin/session", { cache: "no-store" }).catch(() => null);
      if (response?.ok) {
        useCadia.setState({ adminUnlocked: true, view: "admin" });
        return;
      }
      useCadia.getState().openAdminConsole();
    };
    window.addEventListener("cadia:admin", handler);
    return () => window.removeEventListener("cadia:admin", handler);
  }, []);

  // === 3) Lockout countdown ticker ===
  useEffect(() => {
    if (lockedUntil === null) return;
    const i = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(i);
  }, [lockedUntil]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPassword("");
        setError(null);
        setShowHint(false);
        setShowPassword(false);
        hintRef.current = false;
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Clean expired attempts
  const activeAttempts = attempts.filter(
    (a) => Date.now() - a.ts < ATTEMPT_WINDOW_MS,
  );
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - activeAttempts.length);
  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const lockSecondsLeft = isLocked
    ? Math.ceil((lockedUntil! - Date.now()) / 1000)
    : 0;
  void tick; // referenced to re-render on countdown

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isLocked) {
      setError(`Locked. Try again in ${lockSecondsLeft}s.`);
      return;
    }

    const newAttempt: AttemptRecord = {
      ts: Date.now(),
      reason: "submit",
    };
    const nextAttempts = [...activeAttempts, newAttempt];
    setAttempts(nextAttempts);

    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    const result = await response?.json().catch(() => ({}));
    const ok = response?.ok && result?.authorized === true;

    if (ok) {
      setShowHint(true);
      hintRef.current = true;
      setAttempts([]);
    } else {
      const reason = !password
          ? "missing password"
          : "invalid credentials";
      setError(
        `Access denied (${reason}). ${MAX_ATTEMPTS - nextAttempts.length} attempt${
          MAX_ATTEMPTS - nextAttempts.length === 1 ? "" : "s"
        } left.`,
      );

      // Silently log the failed attempt
      addLog({
        type: "audit",
        serverId: "-",
        serverName: "-",
        actor: user?.username || "unknown",
        actorId: user?.id || "0",
        action: "Failed admin login attempt",
        details: `Reason: ${reason} · attempt ${nextAttempts.length}/${MAX_ATTEMPTS}`,
      });

      if (nextAttempts.length >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setError(
          `Too many attempts. Locked for ${LOCKOUT_MS / 1000}s.`,
        );
      }

      setPassword("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md border-rpg/40 p-0 overflow-hidden bg-card backdrop-blur-xl border-rpg/30 shadow-2xl">
        {/* Animated top accent bar */}
        <div className="h-1 bg-gradient-to-r from-rpg via-cadia to-rpg" />

        <DialogHeader className="px-5 pt-4 pb-2">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-rpg">
            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="h-7 w-7 rounded-lg bg-rpg/15 border border-rpg/40 flex items-center justify-center"
            >
              <Shield className="h-4 w-4" />
            </motion.div>
            <span className="font-pixel text-sm tracking-wider">CADIA</span>
            <span className="text-foreground/80">Owner Access</span>
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {showHint ? (
            <motion.div
              key="hint"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="px-5 pb-5 space-y-3"
            >
              <div className="rounded-lg border border-success/40 bg-success/10 p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                    className="h-5 w-5 rounded-full bg-success flex items-center justify-center"
                  >
                    <Check className="h-3 w-3 text-background" />
                  </motion.div>
                  <p className="text-success text-sm font-bold">
                    Verified
                  </p>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Your secure administrator session is active for 30 minutes.
                </p>
              </div>
              <Button
                onClick={() => {
                  useCadia.setState({ adminUnlocked: true });
                  setView("admin");
                  close();
                }}
                className="cadia-btn w-full bg-success text-background hover:bg-success/90 text-sm font-semibold h-10"
              >
                <Shield className="h-4 w-4 mr-1.5" />
                Enter Panel
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="px-5 pb-5 space-y-3"
            >
              {/* Password field */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-pw" className="text-xs font-semibold flex items-center gap-1.5">
                  <KeyRound className="h-3 w-3 text-rpg" />
                  Owner Password
                </Label>
                <div className="relative">
                  <Input
                    id="admin-pw"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="font-mono text-sm h-10 pr-10"
                    autoComplete="off"
                    disabled={isLocked}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Attempts / lockout indicator */}
              <div className="flex items-center justify-between text-[10px]">
                {isLocked ? (
                  <span className="text-fail font-semibold flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" />
                    Locked : {lockSecondsLeft}s
                  </span>
                ) : (
                  <span
                    className={
                      remainingAttempts <= 2
                        ? "text-warning font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} left
                  </span>
                )}
                <span className="text-muted-foreground/60 font-mono">
                  secure 30-minute session
                </span>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg border border-fail/40 bg-fail/10 p-2.5 text-xs text-fail flex items-center gap-2"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={isLocked}
                  className="flex-1 cadia-btn text-sm font-medium h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLocked}
                  className="flex-1 cadia-btn bg-rpg text-white hover:bg-rpg/90 text-sm font-semibold h-10"
                >
                  <Lock className="h-3.5 w-3.5 mr-1.5" />
                  Verify
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
