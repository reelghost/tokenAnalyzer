import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Token Bill Analyzer | KPLC Meter Analysis",
  description: "Analyze your KPLC token purchases and view detailed billing information for your electricity meter.",
  keywords: ["KPLC", "token", "electricity", "meter", "bill analyzer", "Kenya Power"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
