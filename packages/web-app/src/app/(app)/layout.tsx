import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-book-page">
      <Nav />
      <main className="lg:ml-52 pb-20 lg:pb-0">
        <div className="max-w-3xl md:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
