import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseEquity — synthetic demo",
  description:
    "Provider-facing hackathon prototype: parallel, guideline-informed check for female-pattern cardiac presentations at triage intake. Synthetic data only; not clinical software.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
