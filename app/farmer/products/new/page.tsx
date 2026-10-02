"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Upload, ImagePlus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { categories } from "@/lib/data"
import { useLanguage } from "@/lib/LanguageContext"

export default function NewProductPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    imageUrl: "",
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append("file", file)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      })

      if (res.ok) {
        const { url } = await res.json()
        setFormData((prev) => ({ ...prev, imageUrl: url }))
      } else {
        const data = await res.json()
        window.alert(data.error || "Upload failed")
        console.error("Upload failed", data.error)
      }
    } catch (err: any) {
      window.alert(err.message || "An unexpected error occurred during upload.")
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          description: formData.description,
          imageUrl: formData.imageUrl,
        }),
      })

      if (res.ok) {
        router.push("/farmer")
        router.refresh()
      } else {
        console.error("Failed to create product")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-[#6B8E23] bg-secondary/30 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Link
            href="/farmer"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("Back to Dashboard")}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{t("Add New Product")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("List a new product for customers to purchase")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">

            {/* Product Image */}
            <Card>
              <CardHeader>
                <CardTitle>{t("Product Image")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#6B8E23] bg-muted/30 p-12 transition-colors hover:border-primary/50 relative">
                  <div className="mb-4 rounded-full bg-primary/10 p-4">
                    {formData.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={formData.imageUrl} alt="Preview" className="h-20 w-20 object-cover rounded-md" />
                    ) : (
                      <ImagePlus className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <p className="mb-2 text-sm font-medium">
                    {formData.imageUrl ? t("Drag to replace image") : t("Drag and drop your image here")}
                  </p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    {t("PNG, JPG up to 5MB")}
                  </p>
                  <Button type="button" variant="outline" className="gap-2 relative">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("Uploading...")}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {t("Choose File")}
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t("Product Details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="space-y-2">
                  <Label htmlFor="name">{t("Product Name")}</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder={t("e.g., Organic Tomatoes")}
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">{t("Category")}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select a category")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c !== "All")
                        .map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">{t("Price (₹ per kg)")}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pl-7"
                        value={formData.price}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock">{t("Stock Quantity (kg)")}</Label>
                    <div className="relative">
                      <Input
                        id="stock"
                        name="stock"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.stock}
                        onChange={handleChange}
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        kg
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("Description")}</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder={t("Describe your product, including growing methods, freshness, and any special qualities...")}
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />
                </div>

              </CardContent>
            </Card>

            {/* Farming Practices */}
            <Card>
              <CardHeader>
                <CardTitle>{t("Farming Practices")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: t("Certified Organic"), desc: t("USDA certified organic produce") },
                    { label: t("No Pesticides"), desc: t("Grown without synthetic pesticides") },
                    { label: t("Non-GMO"), desc: t("Non-genetically modified") },
                    { label: t("Sustainably Grown"), desc: t("Eco-friendly farming practices") },
                  ].map((practice) => (
                    <label
                      key={practice.label}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#6B8E23] p-4 transition-colors hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#6B8E23] text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium">{practice.label}</p>
                        <p className="text-sm text-muted-foreground">{practice.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
              <Link href="/farmer">
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  {t("Cancel")}
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? t("Adding Product...") : t("Add Product")}
              </Button>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}