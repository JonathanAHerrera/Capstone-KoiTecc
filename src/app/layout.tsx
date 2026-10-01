import type { Metadata, Viewport } from "next";
import { Figtree, Instrument_Serif } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CMMC Ready",
  description:
    "Walk through CMMC Level 1 and Level 2 one requirement at a time: upload proof, get an AI review, and export a readiness package.",
  applicationName: "CMMC Ready",
  appleWebApp: {
    capable: true,
    title: "CMMC Ready",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fdfcfb",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ToastProvider>
          <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col min-h-dvh">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
