import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitPulse | Automated GitHub Auto-Commit Engine for Vercel",
  description:
    "Automated, non-destructive GitHub activity generator and commit heartbeat for Vercel with scheduled crons and live dashboard controls.",
  keywords: [
    "github",
    "auto commit",
    "vercel cron",
    "contribution graph",
    "git automation",
    "gitpulse",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="ambient-bg" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
