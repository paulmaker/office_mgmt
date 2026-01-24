import { NextRequest, NextResponse } from "next/server"
import { getPresignedDownloadUrl } from "@/lib/s3"
import { auth } from "@/app/api/auth/[...nextauth]/route"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { key: keyParts } = await params
  
  // Reconstruct key from catch-all segments
  // e.g. /api/files/entity123/2026/01/file.pdf -> key: "entity123/2026/01/file.pdf"
  const key = keyParts.join("/")

  // Security check: Ensure user can only access files for their entity
  // The key structure is: entityId/year/month/filename
  const fileEntityId = key.split('/')[0]
  
  if (fileEntityId !== session.user.entityId) {
     // Platform admins might need access to all, but for now strict scoping
     return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const url = await getPresignedDownloadUrl(key)
    // Redirect to the S3 presigned URL
    return NextResponse.redirect(url)
  } catch (error) {
    console.error("File Access Error:", error)
    return new NextResponse("File not found", { status: 404 })
  }
}
