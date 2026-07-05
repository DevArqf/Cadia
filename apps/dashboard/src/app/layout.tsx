import type { Metadata } from 'next';
import { Geist, Geist_Mono, Press_Start_2P } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin']
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin']
});

const pixelFont = Press_Start_2P({
	variable: '--font-pixel',
	weight: '400',
	subsets: ['latin'],
	display: 'swap'
});

export const metadata: Metadata = {
	title: 'Cadia - Manage your server',
	description: 'Manage your Discord server with Cadia - a modular bot with a secure, fast dashboard.',
	keywords: ['Cadia', 'Discord Bot', 'Dashboard', 'Moderation', 'RPG'],
	authors: [{ name: 'Cadia' }],
	icons: {
		icon: '/cadia-logo.png',
		shortcut: '/cadia-logo.png',
		apple: '/cadia-logo.png'
	},
	openGraph: {
		title: 'Cadia - Manage your server',
		description: 'Manage your Discord server with Cadia - a modular bot with a secure, fast dashboard.',
		images: ['/cadia-logo.png']
	}
};

// This inline script runs BEFORE React hydrates, guaranteeing window.cadia
// exists the moment the page loads. The owner-only command is namespaced
// under cadia.dev.admin.panel() to avoid being guessed.
const CADIA_BOOT_SCRIPT = `
(function() {
  if (window.cadia) return;
  window.cadia = {
    dev: {
      admin: {
        panel: function() {
          window.dispatchEvent(new CustomEvent('cadia:admin'));
        }
      }
    }
  };
})();
`;

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning className="dark">
			<head>
				<script dangerouslySetInnerHTML={{ __html: CADIA_BOOT_SCRIPT }} suppressHydrationWarning />
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} antialiased bg-background text-foreground min-h-screen`}
			>
				{children}
			</body>
		</html>
	);
}
