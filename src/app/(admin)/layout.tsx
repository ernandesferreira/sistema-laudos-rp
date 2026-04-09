import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-44px)] bg-slate-950">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 md:grid-cols-[250px_1fr] md:px-8">
      <AdminSidebar />
      <div className="space-y-4">
        <AdminTopbar />
        {children}
      </div>
      </div>
    </div>
  );
}
