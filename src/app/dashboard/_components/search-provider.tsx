"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";

interface SearchContextValue {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Search is transient per-section UI state, not something that should leak
  // from e.g. the Appointments list into Billing after navigating. Adjusted
  // during render (React's "adjusting state when a prop changes" pattern)
  // rather than in an effect, to avoid an extra post-commit render pass.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setSearchTerm("");
  }

  const value = useMemo(() => ({ searchTerm, setSearchTerm }), [searchTerm]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchTerm(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearchTerm must be used within SearchProvider");
  return ctx;
}
