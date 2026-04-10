import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { getCurrentAuthUser } from "@/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentAuthUser();

  return (
    <div className="min-h-[calc(100vh-44px)] bg-transparent">
      <div className="mx-auto grid w-full max-w-[1280px] gap-4 px-4 py-5 md:grid-cols-[290px_1fr] md:px-8 md:py-7">
        <AdminSidebar
          currentUser={
            user
              ? {
                  roles: user.roles,
                  permissions: user.permissions,
                }
              : null
          }
        />
        <div className="space-y-4">
          <AdminTopbar
            currentUser={
              user
                ? {
                    name: user.name,
                    roles: user.roles,
                    permissions: user.permissions,
                  }
                : null
            }
          />
          {children}
        </div>
      </div>
    </div>
  );
}
