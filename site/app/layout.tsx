import type { Metadata } from "next";
import { Heebo, Rubik } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tzviair-goals.vercel.app"),
  title: "היעדים שלנו | צבי אייר",
  description: "לוח היעדים הפשוט של צוות צבי אייר",
  icons: {
    icon: "/tzviair-logo.png",
    shortcut: "/tzviair-logo.png",
  },
  openGraph: {
    title: "היעדים שלנו | צבי אייר",
    description: "סוגרים פרויקטים. מתקדמים יחד.",
    url: "/",
    siteName: "צבי אייר",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1693,
        height: 929,
        alt: "לוח היעדים של צבי אייר",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "היעדים שלנו | צבי אייר",
    description: "סוגרים פרויקטים. מתקדמים יחד.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} ${rubik.variable}`}>{children}</body>
    </html>
  );
}
