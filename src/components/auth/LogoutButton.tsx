"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.push("/");
      router.refresh();
      setIsLoading(false);
    }
  }

  return (
    <button type="button" className="btn-secondary text-xs" onClick={handleLogout} disabled={isLoading}>
      {isLoading ? "Saindo..." : "Sair"}
    </button>
  );
}
