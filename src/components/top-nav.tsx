import { Grid3X3, Menu, Search, UserCircle } from "lucide-react";

export function TopNav() {
  return (
    <header className="h-14 border-b border-line bg-white">
      <div className="shell flex h-full items-center justify-between gap-3 py-0">
        <div className="flex items-center gap-3 text-ink">
          <Menu className="h-5 w-5 text-muted" />
          <div className="text-2xl font-semibold tracking-tight">Fusion Space</div>
        </div>
        <div className="flex items-center gap-4 text-muted">
          <Search className="h-5 w-5" />
          <Grid3X3 className="h-5 w-5" />
          <UserCircle className="h-7 w-7" />
        </div>
      </div>
    </header>
  );
}
