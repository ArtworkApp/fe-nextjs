import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "../components/auth/SessionProvider";

export const metadata: Metadata = {
  title: "Artwork Listing",
  description: "Browse and filter original artworks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
