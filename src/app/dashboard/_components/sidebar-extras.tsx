"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AddBusinessModal } from "./add-business-modal";
import type { BusinessOption } from "./business-switcher";
import { AddBusinessIcon, PuzzleIcon } from "./icons";

const itemClass = "flex h-13 w-13 flex-col items-center justify-center gap-1 rounded-[10px] transition-colors";

export function SidebarExtras({ businesses, activeClinicId }: { businesses: BusinessOption[]; activeClinicId: string }) {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const extensionsActive = pathname.startsWith("/dashboard/extensions");

  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/dashboard/extensions"
        className={itemClass}
        style={{ color: extensionsActive ? "#fff" : "#93A5B8", background: extensionsActive ? "rgba(20,184,166,0.18)" : "transparent" }}
      >
        <PuzzleIcon />
        <span className="text-[10px]">Extensões</span>
      </Link>
      <button type="button" onClick={() => setModalOpen(true)} className={itemClass} style={{ color: "#93A5B8" }}>
        <AddBusinessIcon />
        <span className="text-[10px]">Negócio</span>
      </button>

      <AddBusinessModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        businesses={businesses}
        activeClinicId={activeClinicId}
      />
    </div>
  );
}
