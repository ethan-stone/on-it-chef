"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { ChefHat, Settings, LogOut } from "lucide-react";

const links = [
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    queryClient.clear();
    await signOut({ redirectUrl: "/" });
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-52 bg-card border-r border-border flex-col z-30">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <ChefHat className="w-7 h-7 text-medium-brown" />
            <span className="text-lg font-bold text-dark-brown">
              On-It Chef
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-book-page text-dark-brown border border-border"
                    : "text-medium-brown hover:bg-book-page"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-medium-brown hover:bg-book-page w-full transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 flex">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors cursor-pointer relative ${
                isActive ? "text-dark-brown" : "text-medium-brown"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-4 right-4 h-0.5 bg-medium-brown rounded-full" />
              )}
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
        <button
          onClick={handleSignOut}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-medium-brown cursor-pointer hover:text-dark-brown transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </nav>
    </>
  );
}
