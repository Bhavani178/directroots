"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { MapPin, Navigation, ImagePlus, Loader2, Save, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import dynamic from "next/dynamic"

const LocationPicker = dynamic(() => import("@/components/location-picker"), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">Loading interactive map...</div>,
})

import { useLanguage } from "@/lib/LanguageContext"

export default function ProfilePage() {
  const { t } = useLanguage()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    lat: null as number | null,
    lng: null as number | null,
    profileImage: "",
    farmName: "",
    bio: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setFormData({
              name: data.name || "",
              address: data.address || "",
              lat: data.lat ?? null,
              lng: data.lng ?? null,
              profileImage: data.profileImage || "",
              farmName: data.farmName || "",
              bio: data.bio || "",
            })
          }
          setIsLoading(false)
        })
        .catch((err) => {
          console.error(err)
          setIsLoading(false)
        })
    }
  }, [status, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

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
        setFormData((prev) => ({ ...prev, profileImage: url }))
      } else {
        const data = await res.json()
        window.alert(data.error || "Upload failed")
      }
    } catch (err: any) {
      window.alert(err.message || "An unexpected error occurred during upload.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleConfirmLocation = (confirmedLat: number, confirmedLng: number, addressText?: string) => {
    setFormData((prev) => ({
      ...prev,
      lat: confirmedLat,
      lng: confirmedLng,
      address: addressText || prev.address,
    }))
    window.alert(`Location pin set to: ${confirmedLat.toFixed(5)}, ${confirmedLng.toFixed(5)}`)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        lat: formData.lat,
        lng: formData.lng,
        profileImage: formData.profileImage,
        ...(session?.user?.role === "FARMER" && {
          farmName: formData.farmName,
          bio: formData.bio,
        }),
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        setFormData((prev) => ({
          ...prev,
          address: data.address || prev.address,
          lat: data.lat ?? prev.lat,
          lng: data.lng ?? prev.lng,
        }))
        window.alert("Profile saved successfully!")
      } else {
        const err = await res.json()
        window.alert(err.error || "Failed to save profile.")
      }
    } catch (err) {
      console.error(err)
      window.alert("An error occurred while saving.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {t("Loading profile...")}
      </div>
    )
  }

  const isFarmer = session?.user?.role === "FARMER"

  return (
    <div className="min-h-screen bg-secondary/10">
      <div className="border-b border-[#6B8E23] bg-secondary/30 py-8">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight">{t("My Profile")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("Manage your account settings and preferences")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Profile Image */}
          <Card>
            <CardHeader>
              <CardTitle>{t("Profile Image")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#6B8E23] bg-muted/30 p-8 transition-colors hover:border-primary/50 relative">
                <div className="mb-4 rounded-full bg-primary/10 p-4 overflow-hidden h-24 w-24 flex items-center justify-center">
                  {formData.profileImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={formData.profileImage} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-primary" />
                  )}
                </div>
                <Button type="button" variant="outline" className="gap-2 relative">
                  {isUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {t("Uploading...")}</>
                  ) : (
                    <><ImagePlus className="h-4 w-4" /> {t("Choose Image")}</>
                  )}
                  <input
                    type="file"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t("Basic Information")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("Full Name")}</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>{t("Location & Map Pin")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <LocationPicker
                initialLat={formData.lat}
                initialLng={formData.lng}
                initialAddress={formData.address}
                onConfirmLocation={handleConfirmLocation}
                confirmButtonText={t("Confirm Profile Pin Location")}
              />

              {formData.lat !== null && formData.lng !== null && (
                <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>
                    {t("Confirmed coordinates:")} {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Farmer Only Fields */}
          {isFarmer && (
            <Card>
              <CardHeader>
                <CardTitle>{t("Farm Details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="farmName">{t("Farm Name")}</Label>
                  <Input
                    id="farmName"
                    name="farmName"
                    value={formData.farmName}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">{t("About the Farm (Bio)")}</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={handleChange}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" className="w-full gap-2" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("Save Profile")}
          </Button>
        </form>
      </div>
    </div>
  )
}
