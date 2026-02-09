'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileImage, File, X, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getUploadUrl } from '@/app/actions/upload'

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

interface ReceiptUploadProps {
  value?: string[]
  onChange: (keys: string[]) => void
  description?: string
}

export function ReceiptUpload({
  value = [],
  onChange,
  description = 'Upload receipt images or PDFs (max 50MB each).',
}: ReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()
  const keys = Array.isArray(value) ? value : []

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload an image (JPEG, PNG, WebP, GIF) or PDF.',
      })
      return
    }

    if (file.size > MAX_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload a file smaller than 50MB.',
      })
      return
    }

    setIsUploading(true)
    e.target.value = ''

    try {
      const { url, key } = await getUploadUrl(file.name, file.type)
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!uploadResponse.ok) throw new Error('Upload to storage failed')
      onChange([...keys, key])
      toast({
        variant: 'success',
        title: 'Receipt uploaded',
        description: 'File has been attached.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = (index: number) => {
    const next = keys.filter((_, i) => i !== index)
    onChange(next)
  }

  const handleView = (key: string) => {
    if (key.startsWith('data:') || key.startsWith('http')) {
      window.open(key, '_blank')
      return
    }
    window.open(`/api/files/${key}`, '_blank')
  }

  const inputId = `receipt-upload-${Math.random().toString(36).slice(2, 9)}`

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById(inputId)?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {isUploading ? 'Uploading...' : 'Add receipt'}
        </Button>
      </div>
      {keys.length > 0 && (
        <ul className="space-y-2">
          {keys.map((key, index) => (
            <li
              key={key}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded-md text-sm"
            >
              {key.toLowerCase().endsWith('.pdf') ? (
                <File className="h-4 w-4 text-gray-500" />
              ) : (
                <FileImage className="h-4 w-4 text-gray-500" />
              )}
              <span className="flex-1 truncate text-gray-600">
                Receipt {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleView(key)}
              >
                View
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}
