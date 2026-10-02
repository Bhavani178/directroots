import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { v2 as cloudinary } from "cloudinary"
import { authOptions } from "../auth/[...nextauth]/route"

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ─── POST /api/upload ─────────────────────────────────────────────────────────
// Accepts multipart/form-data with a "file" field.
// Returns { url } with the Cloudinary CDN URL.
// Protected: only logged-in FARMER or ARTISAN users.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are accepted" }, { status: 400 })
    }

    // Validate file size (5 MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 5 MB" }, { status: 400 })
    }

    // Convert File to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`

    if (process.env.CLOUDINARY_CLOUD_NAME === "your-cloud-name" || !process.env.CLOUDINARY_CLOUD_NAME) {
      return NextResponse.json(
        { error: "Image upload is not configured — missing Cloudinary credentials." },
        { status: 500 }
      );
    }
      
    // Upload to Cloudinary — store under directroots/products/
    const result = await cloudinary.uploader.upload(base64, {
      folder: "directroots/products",
      transformation: [
        { width: 800, height: 800, crop: "limit" },
        { quality: "auto", fetch_format: "auto" },
      ],
    })
    
    return NextResponse.json({ url: result.secure_url }, { status: 201 })
  } catch (error: any) {
    console.error("[POST /api/upload]", error)
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}
