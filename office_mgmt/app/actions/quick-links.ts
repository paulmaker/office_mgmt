'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const quickLinkSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  category: z.string().min(1, "Category is required"),
  displayOrder: z.number().int().default(0),
})

export type QuickLinkFormData = z.infer<typeof quickLinkSchema>

async function getEntityId() {
  const session = await auth()
  if (!session?.user?.entityId) {
    throw new Error("Unauthorized")
  }
  return session.user.entityId
}

export async function getQuickLinks() {
  const entityId = await getEntityId()
  
  return await prisma.quickLink.findMany({
    where: { entityId },
    orderBy: [
      { category: 'asc' },
      { displayOrder: 'asc' },
      { name: 'asc' }
    ]
  })
}

export async function createQuickLink(data: QuickLinkFormData) {
  try {
    const entityId = await getEntityId()
    const validated = quickLinkSchema.parse(data)
    const quickLink = await prisma.quickLink.create({
      data: { ...validated, entityId },
    })
    revalidatePath('/quick-links')
    return { success: true, data: quickLink }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'An unexpected error occurred'
    return { success: false, error: msg }
  }
}

export async function updateQuickLink(id: string, data: QuickLinkFormData) {
  try {
    const entityId = await getEntityId()
    const validated = quickLinkSchema.parse(data)
    const existing = await prisma.quickLink.findUnique({ where: { id } })
    if (!existing || existing.entityId !== entityId)
      return { success: false, error: 'Quick link not found or unauthorized' }
    const quickLink = await prisma.quickLink.update({
      where: { id },
      data: validated,
    })
    revalidatePath('/quick-links')
    return { success: true, data: quickLink }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'An unexpected error occurred'
    return { success: false, error: msg }
  }
}

export async function deleteQuickLink(id: string) {
  const entityId = await getEntityId()

  // Verify ownership
  const existing = await prisma.quickLink.findUnique({
    where: { id },
  })

  if (!existing || existing.entityId !== entityId) {
    throw new Error("Quick link not found or unauthorized")
  }

  await prisma.quickLink.delete({
    where: { id },
  })

  revalidatePath('/quick-links')
}
