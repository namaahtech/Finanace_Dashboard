import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AuthProvider } from "@/components/layout/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
 title: "Namaah Panel",
 description: "Performance, Incentive & Payout Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
 return (
 <html lang="en" suppressHydrationWarning>
 <body className={inter.className}>
 <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
 <AuthProvider>{children}</AuthProvider>
 </ThemeProvider>
 </body>
 </html>
 );
}
