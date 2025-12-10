import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Odds Oracle - Smart Sports Betting Insights",
  description: "Get smart insights for smarter bets with The Odds Oracle. College basketball odds, statistics, and betting analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex h-screen overflow-hidden bg-body-bg">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden lg:ml-72">
              <Header />
              <main className="flex-1 overflow-y-auto bg-body-bg">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
