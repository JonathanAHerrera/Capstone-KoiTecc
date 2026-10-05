import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
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
  themeColor: "#0B0F19",
  colorScheme: "dark",
};

const themeBootstrapScript = `
  try {
    var savedTheme = localStorage.getItem("cmmc-ready-theme");
    var theme = savedTheme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", theme === "light" ? "#F8FAFC" : "#0B0F19");
  } catch (_) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
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
