import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SolanaProvider } from "@/providers/SolanaProvider";
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SolanaProvider network="localnet">
          {children}
        </SolanaProvider>
      </body>
    </html>
  );
}
