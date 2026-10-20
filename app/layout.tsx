import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles.css";
import { Providers } from "@/app/providers";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PrepChat | Institutional Placement Intelligence",
  description: "Official IIM Indore Preparation Committee Interview Intelligence System",
  icons: {
    icon: "/logo.png"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("prepchat-theme")||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);if(t==="dark")document.documentElement.classList.add("dark-mode");}catch(e){}})();`
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
