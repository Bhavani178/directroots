"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Search, Trash2, PlusCircle, Pencil, Loader2, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import Image from "next/image"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function AdminProductsPage() {
  const { data: products, isLoading } = useSWR("/api/admin/products", fetcher)
  const [search, setSearch] = useState("")
  const [editId, setEditId] = useState<number | null>(null)
  const [editStock, setEditStock] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [deleting, setDeleting] = useState<number | null>(null)

  const filtered = (products ?? []).filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    const res = await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success(`"${name}" deleted`); mutate("/api/admin/products") }
    else toast.error("Failed to delete")
    setDeleting(null)
  }

  const handleSaveEdit = async (id: number) => {
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stock: editStock, price: editPrice }),
    })
    if (res.ok) { toast.success("Updated!"); mutate("/api/admin/products"); setEditId(null) }
    else toast.error("Failed to update")
  }

  const startEdit = (p: any) => {
    setEditId(p.id); setEditStock(String(p.stock)); setEditPrice(String(p.price))
  }

  const categoryColors: Record<string, string> = {
    "Vegetables": "bg-green-100 text-green-700",
    "Fruits": "bg-orange-100 text-orange-700",
    "Grains & Pulses": "bg-yellow-100 text-yellow-700",
    "Dairy": "bg-blue-100 text-blue-700",
    "Spices & Herbs": "bg-red-100 text-red-700",
    "Oils & Honey": "bg-amber-100 text-amber-700",
    "Handmade Crafts": "bg-purple-100 text-purple-700",
    "Dry Fruits & Nuts": "bg-stone-100 text-stone-700",
    "Flowers & Plants": "bg-pink-100 text-pink-700",
    "Pickles & Processed": "bg-teal-100 text-teal-700",
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">{products?.length ?? 0} products across all categories</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8E23]/50"
        />
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
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Seller</th>
                    <th className="px-4 py-3 text-right">Price (₹)</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-100">
                            {p.imageUrl
                              ? <Image src={p.imageUrl} alt={p.name} fill sizes="40px" className="object-cover" />
                              : <div className="h-full w-full bg-gray-100 flex items-center justify-center text-xs">📦</div>
                            }
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{p.name}</p>
                            {p.isOrganic && <span className="text-xs text-green-600 font-medium">🌿 Organic</span>}
                            {p.isHandmade && <span className="text-xs text-purple-600 font-medium">✨ Handmade</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[p.category] ?? "bg-gray-100 text-gray-600"}`}>
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.farmer?.farmName || p.farmer?.name}</td>
                      <td className="px-4 py-3 text-right">
                        {editId === p.id ? (
                          <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-[#6B8E23]" />
                        ) : (
                          <span className="font-medium text-gray-900">₹{p.price}/{p.unit}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editId === p.id ? (
                          <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)}
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-[#6B8E23]" />
                        ) : (
                          <span className={p.stock === 0 ? "text-red-500 font-medium" : "text-gray-700"}>{p.stock}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {editId === p.id ? (
                            <>
                              <button onClick={() => handleSaveEdit(p.id)} className="rounded p-1.5 text-green-600 hover:bg-green-50"><Check className="h-4 w-4" /></button>
                              <button onClick={() => setEditId(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(p)} className="rounded p-1.5 text-blue-500 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(p.id, p.name)} disabled={deleting === p.id}
                                className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50">
                                {deleting === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No products found.</td></tr>
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
