'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useCadia } from '@/lib/store';
import { CadiaLogo } from '@/components/cadia-logo';
import { CadiaFooter } from '@/components/cadia-footer';
import { Button } from '@/components/ui/button';
import { Settings, Swords, Trophy, ChevronRight, Server, Users, Clock, Loader2 } from 'lucide-react';

const SUPPORT_INVITE = 'https://discord.gg/26R7kXa6dx';

// Three feature cards — each slides in from a different direction
const FEATURES = [
	{
		icon: Settings,
		title: 'Moderation & System',
		color: '#3bb143',
		desc: 'Full suite of moderation tools — kick, ban, mute, warn — with auto-mod rules, raid protection, and per-command permissions. Configure everything down to the channel and role. Audit logs record every action so nothing goes unseen.',
		slideDirection: 'left' as const
	},
	{
		icon: Swords,
		title: 'RPG & Adventure',
		color: '#5e3a6d',
		desc: 'Turn your server into a living world. Classes, leveling, quests, PvP battles, and PvE encounters. Members earn XP, unlock abilities, and climb the ranks. Fully configurable — balance stats, drop rates, rewards, and cooldowns to fit your community.',
		slideDirection: 'right' as const
	},
	{
		icon: Trophy,
		title: 'Leaderboard & Competition',
		color: '#65b8da',
		desc: "Track every member's progress with real-time leaderboards. Weekly and all-time rankings, seasonal competitions, and achievement badges. Display top members in a dedicated channel, celebrate milestones, and reward your most active players.",
		slideDirection: 'left' as const
	}
];

// Slide animation variants based on direction
const slideVariants = {
	left: {
		hidden: { opacity: 0, x: -60 },
		visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
	},
	right: {
		hidden: { opacity: 0, x: 60 },
		visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
	}
};

export function LandingView() {
	const startLogin = useCadia((s) => s.startLogin);
	const isAuthenticating = useCadia((s) => s.isAuthenticating);
	const setView = useCadia((s) => s.setView);
	const [hover, setHover] = useState(false);
	const [hoveredCard, setHoveredCard] = useState<number | null>(null);

	// === Animated counters for live stats ===
	const [servers, setServers] = useState(0);
	const [users, setUsers] = useState(0);
	const [responseTime, setResponseTime] = useState(0);
	const statsRef = useRef<HTMLDivElement>(null);
	const statsAnimated = useRef(false);

	useEffect(() => {
		const el = statsRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !statsAnimated.current) {
						statsAnimated.current = true;
						fetch('/api/bot-status', { cache: 'no-store' })
							.then((res) => res.json())
							.catch(() => ({ guildCount: 0, userCount: 0, responseTimeMs: 0 }))
							.then((status) => {
								const targets = {
									servers: Number(status.guildCount || 0),
									users: Number(status.userCount || 0),
									responseTime: Number(status.responseTimeMs || 0)
								};
								const duration = 2000;
								const start = Date.now();
								const interval = setInterval(() => {
									const elapsed = Date.now() - start;
									const progress = Math.min(elapsed / duration, 1);
									const eased = 1 - Math.pow(1 - progress, 3);
									setServers(Math.floor(targets.servers * eased));
									setUsers(Math.floor(targets.users * eased));
									setResponseTime(Math.floor(targets.responseTime * eased));
									if (progress >= 1) clearInterval(interval);
								}, 30);
							});
					}
				});
			},
			{ threshold: 0.3 }
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const handleAddBot = () => {
		window.location.href = '/api/invite';
	};

	const handleLearnMore = () => {
		setView('terms');
		setTimeout(() => {
			window.dispatchEvent(new CustomEvent('cadia:highlight-legal'));
		}, 200);
	};

	const formatNumber = (n: number) => {
		if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
		if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
		return n.toString();
	};

	return (
		<div className="relative min-h-screen overflow-hidden cadia-bg scanlines">
			<div className="cadia-particles" />
			<div className="cadia-bg-shine" />

			<header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5">
				<button onClick={() => setView('landing')} className="flex items-center gap-3 cursor-pointer" aria-label="Go to home">
					<CadiaLogo size={44} animated={false} />
					<span className="font-pixel text-base text-cadia text-glow-cadia tracking-wider">CADIA</span>
				</button>
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.3, duration: 0.4 }}
					className="flex items-center gap-2"
				>
					<a href={SUPPORT_INVITE} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-block">
						<Button className="cadia-btn bg-cadia text-background hover:bg-cadia-dark text-sm font-semibold">Join Server</Button>
					</a>
					<Button onClick={startLogin} disabled={isAuthenticating} variant="outline" className="cadia-btn text-sm font-semibold">
						Dashboard
					</Button>
					<Button
						onClick={handleAddBot}
						disabled={isAuthenticating}
						className="cadia-btn bg-cadia text-background hover:bg-cadia-dark text-sm font-semibold"
					>
						{isAuthenticating ? (
							<>
								<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
								Connecting…
							</>
						) : (
							'Add to Discord'
						)}
					</Button>
				</motion.div>
			</header>

			<main className="relative z-10 flex flex-col items-center justify-center px-4 pt-10 pb-14 sm:pt-14 sm:pb-20 text-center max-w-3xl mx-auto">
				<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-5">
					<CadiaLogo size={160} />
				</motion.div>

				<motion.h1
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2, duration: 0.4 }}
					className="font-bold leading-tight mb-3"
				>
					<span className="font-pixel text-cadia text-glow-cadia text-3xl sm:text-5xl md:text-6xl block mb-2">CADIA</span>
					<span className="text-foreground text-lg sm:text-2xl md:text-3xl font-semibold">The ultimate RPG and Utility Discord bot.</span>
				</motion.h1>

				<motion.p
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3, duration: 0.4 }}
					className="text-sm sm:text-base text-muted-foreground max-w-lg mb-7 leading-relaxed"
				>
					A modular Discord bot with a secure, fast dashboard. Moderation, RPG, audit logging — all configurable down to the command.
				</motion.p>

				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4, duration: 0.4 }}
					className="flex flex-col sm:flex-row items-center gap-3 mb-14"
				>
					<Button
						onClick={handleAddBot}
						disabled={isAuthenticating}
						onMouseEnter={() => setHover(true)}
						onMouseLeave={() => setHover(false)}
						className="cadia-btn bg-cadia text-background hover:bg-cadia-dark text-sm font-semibold h-14 px-8 group"
					>
						{isAuthenticating ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Connecting…
							</>
						) : (
							<>
								Start your adventure with Cadia
								<ChevronRight className={`h-4 w-4 ml-2 transition-transform ${hover ? 'translate-x-1' : ''}`} />
							</>
						)}
					</Button>
				</motion.div>

				{/* Feature cards — stacked vertically, each slides in from an
            alternating direction. Animate on mount (not whileInView) so the
            cards always render on mobile, where IntersectionObserver-based
            scroll reveals can fail to fire and leave cards invisible. */}
				<div className="flex flex-col gap-5 w-full">
					{FEATURES.map((f, i) => (
						<motion.div
							key={f.title}
							variants={slideVariants[f.slideDirection]}
							initial="hidden"
							animate="visible"
							transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: 'easeOut' }}
							onMouseEnter={() => setHoveredCard(i)}
							onMouseLeave={() => setHoveredCard(null)}
							className="relative rounded-2xl border p-6 text-left transition-all duration-300 cursor-default overflow-hidden"
							style={{
								background: hoveredCard === i ? `linear-gradient(135deg, ${f.color}18, rgba(17,22,29,0.6))` : 'rgba(17,22,29,0.5)',
								borderColor: hoveredCard === i ? `${f.color}80` : 'rgba(255,255,255,0.08)',
								boxShadow:
									hoveredCard === i ? `0 0 0 1px ${f.color}40, 0 8px 32px -8px ${f.color}60, 0 0 24px -4px ${f.color}50` : 'none',
								transform: hoveredCard === i ? 'translateY(-6px)' : 'translateY(0)'
							}}
						>
							<div
								className="absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl pointer-events-none transition-opacity duration-300"
								style={{
									background: f.color,
									opacity: hoveredCard === i ? 0.25 : 0
								}}
							/>

							<div className="flex items-start gap-4">
								<div
									className="flex-shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all duration-300"
									style={{
										background: `${f.color}20`,
										borderColor: `${f.color}60`,
										color: f.color,
										boxShadow:
											hoveredCard === i
												? `0 0 16px -2px ${f.color}80, inset 0 0 12px -4px ${f.color}40`
												: `0 0 12px -4px ${f.color}40`,
										transform: hoveredCard === i ? 'scale(1.1)' : 'scale(1)'
									}}
								>
									<f.icon className="h-6 w-6" />
								</div>

								<div className="flex-1 min-w-0">
									<h3 className="font-pixel text-[11px] mb-3 tracking-wide" style={{ color: f.color }}>
										{f.title.toUpperCase()}
									</h3>
									<p className="text-sm text-foreground/75 leading-relaxed">{f.desc}</p>
								</div>
							</div>
						</motion.div>
					))}
				</div>

				{/* Cadia Live Stats card */}
				<motion.div
					ref={statsRef}
					initial={{ opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: '-80px' }}
					transition={{ duration: 0.4 }}
					className="w-full mt-8 rounded-2xl border border-cadia/30 p-6 text-left"
					style={{
						background: 'linear-gradient(135deg, rgba(101,184,218,0.08), rgba(17,22,29,0.6))',
						boxShadow: '0 0 24px -8px rgba(101,184,218,0.3)'
					}}
				>
					<div className="mb-1">
						<h3 className="font-pixel text-sm text-cadia text-glow-cadia tracking-wider mb-1">CADIA LIVE STATS</h3>
						<p className="text-xs text-muted-foreground">Check real-time performance reports of Cadia</p>
					</div>

					<div className="grid grid-cols-3 gap-4 mt-5">
						<div className="text-center">
							<div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cadia/30 bg-cadia/10 mb-2">
								<Server className="h-4 w-4 text-cadia" />
							</div>
							<div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{formatNumber(servers)}</div>
							<div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Total Servers</div>
						</div>

						<div className="text-center border-x border-border/30">
							<div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-success/30 bg-success/10 mb-2">
								<Users className="h-4 w-4 text-success" />
							</div>
							<div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{formatNumber(users)}</div>
							<div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Total Users</div>
						</div>

						<div className="text-center">
							<div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-warning/30 bg-warning/10 mb-2">
								<Clock className="h-4 w-4 text-warning" />
							</div>
							<div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{responseTime}ms</div>
							<div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Response Time</div>
						</div>
					</div>

					{/* Stats footer */}
					<div className="mt-5 pt-4 border-t border-border/30">
						<p className="text-[10px] sm:text-[11px] text-muted-foreground/70 text-center leading-relaxed">
							All real-time statistics are taken from the bot which users agreed to after adding Cadia to their server.{' '}
							<button
								onClick={handleLearnMore}
								className="text-cadia hover:text-cadia-dark underline underline-offset-2 transition-colors"
							>
								Learn more
							</button>
							.
						</p>
					</div>
				</motion.div>
			</main>

			<CadiaFooter />
		</div>
	);
}
