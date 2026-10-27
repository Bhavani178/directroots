"use client"

import useSWR, { mutate } from "swr"
import { Loader2, Trash2, Users, Leaf, ShoppingBag } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const roleColors: Record<string, string> = {
  CUSTOMER: "bg-blue-100 text-blue-700",
  FARMER:   "bg-green-100 text-green-700",
  ARTISAN:  "bg-purple-100 text-purple-700",
  ADMIN:    "bg-red-100 text-red-700",
}
const roleIcons: Record<string, string> = {
  CUSTOMER: "👤", FARMER: "🌾", ARTISAN: "🎨", ADMIN: "🛡️",
}

export default function AdminUsersPage() {
  const { data: users, isLoading } = useSWR("/api/admin/users", fetcher)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [filter, setFilter] = useState("ALL")

  const filtered = (users ?? []).filter((u: any) => filter === "ALL" || u.role === filter)

  const handleDelete = async (id: number, name: string, role: string) => {
    if (role === "ADMIN") { toast.error("Cannot delete admin account"); return }
    if (!confirm(`Delete user "${name}"? All their data will be removed.`)) return
    setDeleting(id)
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success(`"${name}" removed`); mutate("/api/admin/users") }
    else toast.error("Failed to delete user")
    setDeleting(null)
  }

  const counts = {
    ALL:      (users ?? []).length,
    CUSTOMER: (users ?? []).filter((u: any) => u.role === "CUSTOMER").length,
    FARMER:   (users ?? []).filter((u: any) => u.role === "FARMER").length,
    ARTISAN:  (users ?? []).filter((u: any) => u.role === "ARTISAN").length,
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">{users?.length ?? 0} registered users on DirectRoots</p>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {(["ALL", "CUSTOMER", "FARMER", "ARTISAN"] as const).map(role => (
          <button
            key={role}
            onClick={() => setFilter(role)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              filter === role
                ? "bg-[#6B8E23] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-[#6B8E23]"
            }`}
          >
            {roleIcons[role] ?? "🌍"} {role} ({counts[role as keyof typeof counts] ?? 0})
          </button>
        ))}
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#6B8E23]" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Farm / Address</th>
                    <th className="px-4 py-3 text-center">Orders</th>
                    <th className="px-4 py-3 text-center">Products</th>
                    <th className="px-4 py-3 text-left">Joined</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6B8E23]/10 text-sm font-bold text-[#6B8E23]">
                            {user.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleColors[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {roleIcons[user.role]} {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-500 text-xs max-w-[160px] truncate">
                        {user.farmName || user.address || "—"}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-600">
                          <ShoppingBag className="h-3 w-3" />
                          {user._count?.orders ?? 0}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-600">
                          <Leaf className="h-3 w-3" />
                          {user._count?.products ?? 0}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {user.role !== "ADMIN" && (
                          <button
                            onClick={() => handleDelete(user.id, user.name, user.role)}
                            disabled={deleting === user.id}
                            className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                          >
                            {deleting === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
