import "@/src/styles/globals.css";
import { Metadata, Viewport } from "next";
import { Link } from "@nextui-org/link";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/src/config/site";
import { fontSans } from "@/src/config/fonts";
import { Navbar } from "@/src/components/navbar";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // if (!AppDataSource.isInitialized) {
  //   AppDataSource.initialize()
  //     .then(() => {
  //       console.log("Database connected successfully!");
  //       console.log("Entities registered:", AppDataSource.options.entities);
  //     })
  //     .catch((error) => {
  //       console.error("Database connection failed:", error);
  //     });
  // }

  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <div className="relative flex flex-col h-screen">
            <Navbar />
            <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">
              {children}
            </main>
            <footer className="w-full flex items-center justify-center py-3 gap-2">
              <Link
                isExternal
                className="flex items-center gap-1 text-current"
                href="https://odutechspace.com"
                title="nextui.org homepage"
              >
                <span className="text-default-600">Powered by</span>
                <p className="text-primary">Odutechspace</p>
              </Link>
              <Link
                isExternal
                className="flex items-center gap-1 text-current"
                href="https://preview.themeforest.net/item/lineago-genealogy-wordpress-theme/full_screen_preview/35901606?_ga=2.63273638.881761778.1736344956-555333545.1731923038"
                title="nextui.org homepage"
              >
                Inspo
              </Link>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
