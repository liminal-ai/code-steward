import type { Metadata } from "next";
import {
  Plus_Jakarta_Sans,
  IBM_Plex_Sans,
  Libre_Baskerville,
  Sora,
  Outfit,
  Geist_Mono,
} from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({ variable: "--font-plus-jakarta", subsets: ["latin"] });
const ibmPlex = IBM_Plex_Sans({ variable: "--font-ibm-plex", weight: ["400", "500", "600", "700"], subsets: ["latin"] });
const libreBaskerville = Libre_Baskerville({ variable: "--font-libre", weight: ["400", "700"], subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Code Steward",
  description: "Your code review workstation",
};

const fontVars = [
  plusJakarta.variable,
  ibmPlex.variable,
  libreBaskerville.variable,
  sora.variable,
  outfit.variable,
  geistMono.variable,
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("cs-theme")||"classic";document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
