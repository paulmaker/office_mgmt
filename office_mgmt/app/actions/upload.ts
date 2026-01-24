'use server'

import { getPresignedUploadUrl } from "@/lib/s3"
import { nanoid } from "nanoid"
import { auth } from "@/app/api/auth/[...nextauth]/route"

export async function getUploadUrl(filename: string, contentType: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Generate a unique key
  // Structure: entityId/year/month/random-filename
  const entityId = session.user.entityId
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const ext = filename.split('.').pop()
  const key = `${entityId}/${year}/${month}/${nanoid()}.${ext}`

  const url = await getPresignedUploadUrl(key, contentType)

  return { url, key }
}
