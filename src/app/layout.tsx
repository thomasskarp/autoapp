import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AutoApp — Software para Agencias de Autos",
  description: "ERP + CRM profesional para agencias de autos. Gestioná tu stock, leads y publicaciones desde un solo lugar.",
};

import { InfoPriceProvider } from "@/context/info-price-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${jakarta.variable} font-sans antialiased text-[#F3F4F6]`} suppressHydrationWarning>
        <InfoPriceProvider>
          {children}
        </InfoPriceProvider>
      </body>
    </html>
  );
}
