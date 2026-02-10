'use server'

import { prisma } from "@/lib/prisma"
import { getBaseUrl } from "@/lib/app-url"
import { resend, EMAIL_FROM } from "@/lib/email"
import { randomBytes } from "crypto"
import { hash } from "bcryptjs"
import { addHours } from "date-fns"

export async function forgotPassword(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        entity: true
      }
    })

    if (!user) {
      // Don't reveal that the user does not exist
      return { success: true }
    }

    const token = randomBytes(32).toString('hex')
    const expiry = addHours(new Date(), 24) // 24 hours expiry

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      }
    })

    const baseUrl = getBaseUrl()
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject: 'Reset your password',
      html: `
        <p>Hello ${user.name || 'User'},</p>
        <p>Someone requested a password reset for your account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `
    })

    return { success: true }
  } catch (error) {
    console.error("Forgot Password Error:", error)
    throw new Error("Failed to process request")
  }
}

export async function resetPassword(token: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { resetToken: token }
    })

    if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      throw new Error("Invalid or expired token")
    }

    const hashedPassword = await hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Reset Password Error:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to reset password")
  }
}

export async function verifyResetToken(token: string) {
  const user = await prisma.user.findUnique({
    where: { resetToken: token }
  })

  if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
    return { valid: false }
  }

  return { valid: true, email: user.email }
}

export async function inviteUser(email: string, name: string, entityId: string, role: string) {
    // This is a helper that can be called from admin actions
    // It creates the user (if not exists) and sends an invite
    
    // Check existence
    const existing = await prisma.user.findUnique({ where: { email }})
    if (existing) {
        throw new Error("User already exists")
    }

    // Create user without password
    const user = await prisma.user.create({
        data: {
            email,
            name,
            entityId,
            role: role as any,
            isActive: true
        },
        include: { entity: true }
    })

    // Generate token
    const token = randomBytes(32).toString('hex')
    const expiry = addHours(new Date(), 48) // 48 hours for invite

    await prisma.user.update({
        where: { id: user.id },
        data: {
            resetToken: token,
            resetTokenExpiry: expiry
        }
    })

    const baseUrl = getBaseUrl()
    const inviteUrl = `${baseUrl}/auth/reset-password?token=${token}`

    await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: `Welcome to ${user.entity.name}`,
        html: `
          <p>Hello ${name},</p>
          <p>You have been invited to join <strong>${user.entity.name}</strong> on the Office Manager platform.</p>
          <p>Click the link below to set your password and access your account:</p>
          <a href="${inviteUrl}">${inviteUrl}</a>
          <p>This link will expire in 48 hours.</p>
        `
    })

    return user
}
