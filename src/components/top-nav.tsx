import Link from "next/link";
import { Menu } from "lucide-react";
import { NavTrailing } from "@/components/nav-trailing";

export function TopNav() {
  return (
    <header className="h-14 border-b border-line bg-white">
      <div className="shell flex h-full items-center justify-between gap-3 py-0">
        <div className="flex items-center gap-3 text-ink">
          <Menu className="h-5 w-5 text-muted" />
          <Link href="/" className="text-2xl font-semibold tracking-tight text-ink hover:opacity-80">
            Fusion Space
          </Link>
        </div>
        <NavTrailing />
      </div>
    </header>
  );
}
