import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import GoogleProvider from "@/components/GoogleProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

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
  title: "FitAI",
  description: "Continue de onde parou no seu treino.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`h-full antialiased ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* Moldura de brasa fixa na borda do viewport — presente em toda
            página, acompanha o scroll. Referência direta: bordas coloridas
            vivas nos sites de agência que o usuário pediu pra seguir. */}
        <div className="brand-frame" aria-hidden="true" />
        <LanguageProvider>
          <GoogleProvider>
            <AuthProvider>{children}</AuthProvider>
          </GoogleProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
