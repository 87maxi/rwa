import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SolanaProvider } from "@/providers/SolanaProvider";
import { NotificationContainer } from "@/components/NotificationContainer";
import { NetworkStatus } from "@/components/NetworkStatus";
import { ClientOnly } from "@/components/ClientOnly";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solana RWA Token Platform",
  description: "Create and manage compliant security tokens on Solana blockchain with built-in KYC/AML compliance, transfer restrictions, and regulatory controls.",
  keywords: ["solana", "rwa", "tokenization", "security-tokens", "compliance", "kyc", "aml"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SolanaProvider network={(process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'localnet' | 'devnet' | 'mainnet') || 'localnet'}>
          <ClientOnly fallback={children}>
            {children}
          </ClientOnly>
          <ClientOnly fallback={<div className="fixed top-4 right-4 z-50" />}>
            <NotificationContainer />
          </ClientOnly>
          <ClientOnly fallback={<div className="fixed top-4 right-20 z-50 w-48 h-10" />}>
            <NetworkStatus />
          </ClientOnly>
        </SolanaProvider>
      </body>
    </html>
  );
}
