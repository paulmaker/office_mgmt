'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Upload, Trash2, Loader2, ImageIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { uploadLogo, removeLogo, getLogoUrl } from '@/app/actions/logo'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export function LogoUpload() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadLogo()
  }, [])

  const loadLogo = async () => {
    try {
      const url = await getLogoUrl()
      setLogoUrl(url)
    } catch {
      // No logo set, that's fine
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so the same file can be re-selected
    e.target.value = ''

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, WebP, GIF, or SVG image.',
      })
      return
    }

    if (file.size > MAX_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
      })
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('logo', file)

      const result = await uploadLogo(formData)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Reload the logo after successful upload
      const url = await getLogoUrl()
      setLogoUrl(url)

      toast({
        variant: 'success',
        title: 'Logo uploaded',
        description: 'Your company logo has been updated and will appear on invoices.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload logo.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)

    try {
      const result = await removeLogo()

      if (!result.success) {
        throw new Error(result.error)
      }

      setLogoUrl(null)

      toast({
        variant: 'success',
        title: 'Logo removed',
        description: 'Your company logo has been removed from invoices.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Remove failed',
        description: error instanceof Error ? error.message : 'Failed to remove logo.',
      })
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Company Logo
        </CardTitle>
        <CardDescription>
          Upload your company logo to display on sales invoices. The image will be
          resized and optimized automatically (max 400x200px).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg bg-gray-50">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : logoUrl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Company logo"
                className="max-h-32 max-w-full object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading ? 'Uploading...' : 'Replace Logo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRemove}
                disabled={isRemoving}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {isRemoving ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">
                  Click to upload logo
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  JPEG, PNG, WebP, GIF, or SVG (max 5MB)
                </span>
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  )
}
