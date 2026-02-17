'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { putObject, deleteObject, getPresignedDownloadUrl } from '@/lib/s3'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const LOGO_MAX_WIDTH = 400
const LOGO_MAX_HEIGHT = 200

/**
 * Upload and optimize company logo.
 * Accepts a base64-encoded image, resizes/optimizes it, uploads to S3,
 * and stores the S3 key in the entity settings.
 */
export async function uploadLogo(formData: FormData) {
  const session = await auth()
  if (!session?.user?.entityId) {
    return { success: false, error: 'Unauthorized' }
  }

  const userRole = (session.user as any)?.role
  if (!['PLATFORM_ADMIN', 'ACCOUNT_ADMIN', 'ENTITY_ADMIN'].includes(userRole)) {
    return { success: false, error: 'Only administrators can update the company logo' }
  }

  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) {
    return { success: false, error: 'No file provided' }
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, WebP, GIF, or SVG image.' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File is too large. Maximum size is 5MB.' }
  }

  try {
    const entityId = session.user.entityId
    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // Resize and optimize the image with sharp
    const optimizedBuffer = await sharp(inputBuffer)
      .resize(LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer()

    const key = `${entityId}/logo/company-logo.png`

    await putObject(key, optimizedBuffer, 'image/png')

    // Get existing settings and update with the logo key
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { settings: true },
    })

    const existingSettings = (entity?.settings as Record<string, unknown>) || {}

    await prisma.entity.update({
      where: { id: entityId },
      data: {
        settings: {
          ...existingSettings,
          logoS3Key: key,
        } as any,
      },
    })

    revalidatePath('/settings')
    return { success: true, key }
  } catch (error) {
    console.error('Logo upload error:', error)
    return { success: false, error: 'Failed to upload logo. Please try again.' }
  }
}

/**
 * Remove the company logo from S3 and entity settings.
 */
export async function removeLogo() {
  const session = await auth()
  if (!session?.user?.entityId) {
    return { success: false, error: 'Unauthorized' }
  }

  const userRole = (session.user as any)?.role
  if (!['PLATFORM_ADMIN', 'ACCOUNT_ADMIN', 'ENTITY_ADMIN'].includes(userRole)) {
    return { success: false, error: 'Only administrators can remove the company logo' }
  }

  try {
    const entityId = session.user.entityId

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { settings: true },
    })

    const existingSettings = (entity?.settings as Record<string, unknown>) || {}
    const logoKey = existingSettings.logoS3Key as string | undefined

    if (logoKey) {
      try {
        await deleteObject(logoKey)
      } catch {
        // Object may not exist, continue to clear the setting
      }
    }

    const { logoS3Key: _, ...settingsWithoutLogo } = existingSettings

    await prisma.entity.update({
      where: { id: entityId },
      data: {
        settings: settingsWithoutLogo as any,
      },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('Logo removal error:', error)
    return { success: false, error: 'Failed to remove logo. Please try again.' }
  }
}

/**
 * Get a presigned URL for the current entity's logo.
 * Returns null if no logo is set.
 */
export async function getLogoUrl(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.entityId) {
    return null
  }

  const entity = await prisma.entity.findUnique({
    where: { id: session.user.entityId },
    select: { settings: true },
  })

  const settings = (entity?.settings as Record<string, unknown>) || {}
  const logoKey = settings.logoS3Key as string | undefined

  if (!logoKey) return null

  try {
    return await getPresignedDownloadUrl(logoKey)
  } catch {
    return null
  }
}
