import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import GoogleProvider from "@/components/GoogleProvider";
import { AuthProvider } from "@/contexts/AuthContext";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FitAI — treinos personalizados com IA",
    template: "%s · FitAI",
  },
  description:
    "Monte treinos com inteligência artificial, registre suas séries e acompanhe sua evolução de volume, força e recordes.",
  applicationName: "FitAI",
  keywords: ["treino", "academia", "musculação", "hipertrofia", "IA", "evolução"],
  openGraph: {
    title: "FitAI — treinos personalizados com IA",
    description: "Continue de onde parou no seu treino.",
    siteName: "FitAI",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0c0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`h-full bg-background font-sans text-foreground antialiased ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-background text-foreground">
        <GoogleProvider>
          <AuthProvider>{children}</AuthProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
