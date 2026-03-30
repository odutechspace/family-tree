import { Navbar } from "@/src/components/navbar";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="pt-14">{children}</main>
    </>
  );
}
