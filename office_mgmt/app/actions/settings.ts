'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Schema for entity settings
const settingsSchema = z.object({
  companyName: z.string().optional(),
  companyRegistration: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  emailTimesheets: z.string().email().optional().or(z.literal('')),
  emailInvoices: z.string().email().optional().or(z.literal('')),
  
  // CIS Settings
  cisVerifiedNetRate: z.coerce.number().default(20),
  cisNotVerifiedRate: z.coerce.number().default(30),
  cisVerifiedGrossRate: z.coerce.number().default(0),
  
  // VAT Settings
  vatStandardRate: z.coerce.number().default(20),
  vatReducedRate: z.coerce.number().default(5),
  isVatRegistered: z.boolean().default(false),
  
  // Notifications
  notifyInvoiceOverdue: z.boolean().default(true),
  notifyTimesheetSubmission: z.boolean().default(true),
  notifyVehicleReminders: z.boolean().default(true),
  notifyCisReturn: z.boolean().default(true),
  notifyVatReturn: z.boolean().default(true),
})

export type SettingsFormData = z.infer<typeof settingsSchema>

export async function getSettings() {
  const session = await auth()
  if (!session?.user?.entityId) {
    throw new Error("Unauthorized")
  }

  const entity = await prisma.entity.findUnique({
    where: { id: session.user.entityId },
    select: { settings: true, name: true }
  })

  if (!entity) {
    throw new Error("Entity not found")
  }

  // Merge with defaults
  const defaults: SettingsFormData = {
    companyName: entity.name, // Default to entity name
    companyRegistration: '',
    vatNumber: '',
    address: '',
    phone: '',
    emailTimesheets: '',
    emailInvoices: '',
    cisVerifiedNetRate: 20,
    cisNotVerifiedRate: 30,
    cisVerifiedGrossRate: 0,
    vatStandardRate: 20,
    vatReducedRate: 5,
    isVatRegistered: false,
    notifyInvoiceOverdue: true,
    notifyTimesheetSubmission: true,
    notifyVehicleReminders: true,
    notifyCisReturn: true,
    notifyVatReturn: true,
  }

  // If settings exist, merge them. Otherwise return defaults.
  return entity.settings ? { ...defaults, ...(entity.settings as object) } : defaults
}

export async function updateSettings(data: SettingsFormData) {
  const session = await auth()
  if (!session?.user?.entityId) {
    throw new Error("Unauthorized")
  }

  // Validate data
  const validated = settingsSchema.parse(data)

  await prisma.entity.update({
    where: { id: session.user.entityId },
    data: {
      settings: validated as any, // Prisma Json type workaround
      // Optionally update the entity name if company name changed
      ...(validated.companyName ? { name: validated.companyName } : {})
    }
  })

  revalidatePath('/settings')
  return { success: true }
}
