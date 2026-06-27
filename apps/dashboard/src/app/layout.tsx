import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cadia | Dashboard",
  description: "Cadia is a .",
  keywords: ["Cadia", "Discord Bot", "Dashboard", "Moderation", "RPG"],
  authors: [{ name: "Cadia" }],
  metadataBase: new URL(
    process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  icons: {
    icon: "/cadia-logo.png",
    shortcut: "/cadia-logo.png",
    apple: "/cadia-logo.png",
  },
  openGraph: {
    title: "Cadia | Dashboard",
    description: "Cadia is a .",
    images: ["/cadia-logo.png"],
  },
};

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
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: CADIA_BOOT_SCRIPT }}
          suppressHydrationWarning
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
