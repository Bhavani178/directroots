import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { v2 as cloudinary } from "cloudinary"
import { authOptions } from "../auth/[...nextauth]/route"
import { checkRateLimit } from "@/lib/rate-limit"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Magic byte signature verification for image content
function isValidImageBuffer(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (mimeType === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  }
  if (mimeType === "image/webp") {
    return (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    )
  }
  return false
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024 // 4 MB (within Vercel's 4.5MB serverless body limit)

export async function POST(req: Request) {
  // 1. Authentication check
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Role Authorization: Only authenticated producers and admins can upload
  const role = session.user?.role
  if (role !== "FARMER" && role !== "ARTISAN" && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only farmers, artisans, and administrators can upload product media." },
      { status: 403 }
    )
  }

  // 3. Rate limiting: Max 15 uploads per 5 minutes per user
  const rateLimit = checkRateLimit(req, `upload:${session.user.id}`, 15, 5 * 60)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Upload rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.` },
      { status: 429 }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // 4. Strict MIME type validation (Reject SVG and active content)
    const mimeType = file.type.toLowerCase().trim()
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP images are permitted (SVG is prohibited for security)." },
        { status: 400 }
      )
    }

    // 5. Size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 4 MB limit." },
        { status: 400 }
      )
    }

    // 6. Inspect actual file content bytes (magic byte validation)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (!isValidImageBuffer(buffer, mimeType)) {
      return NextResponse.json(
        { error: "File content does not match the declared image signature." },
        { status: 400 }
      )
    }

    // 7. Verify Cloudinary configuration safely
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
    if (!cloudName || cloudName === "your-cloud-name") {
      return NextResponse.json(
        { error: "Image storage service is not configured. Please contact the administrator." },
        { status: 503 }
      )
    }

    const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`

    const result = await cloudinary.uploader.upload(base64, {
      folder: "directroots/products",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [
        { width: 1200, height: 1200, crop: "limit" },
        { quality: "auto", fetch_format: "auto" },
      ],
    })

    return NextResponse.json({ url: result.secure_url }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/upload]", error)
    return NextResponse.json({ error: "Failed to process image upload." }, { status: 500 })
  }
}
