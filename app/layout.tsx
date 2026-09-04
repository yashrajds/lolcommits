import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitPulse | Automated GitHub Auto-Commit Engine for Vercel",
  description: "Automated, non-destructive GitHub activity generator and commit heartbeat for Vercel with scheduled crons and live dashboard controls.",
  keywords: ["github", "auto commit", "vercel cron", "contribution graph", "git automation"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="ambient-bg" />
        {children}
      </body>
    </html>
  );
}
