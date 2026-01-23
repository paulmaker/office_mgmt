'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Upload, File, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PDFUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
}

export function PDFUpload({ value, onChange, onRemove }: PDFUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
      })
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB',
      })
      return
    }

    setIsUploading(true)

    try {
      // Convert to base64 for storage
      // In production, you would upload to Vercel Blob, S3, or similar
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        // Store as data URL (can be enhanced to use proper storage service)
        onChange(base64)
        toast({
          variant: 'success',
          title: 'File uploaded',
          description: 'PDF has been uploaded successfully',
        })
        setIsUploading(false)
      }
      reader.onerror = () => {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: 'Failed to read the file',
        })
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
      })
      setIsUploading(false)
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <File className="h-5 w-5 text-gray-500" />
        <div className="flex-1">
          <p className="text-sm font-medium">PDF Document</p>
          <p className="text-xs text-gray-500">
            {value.startsWith('data:') ? 'Base64 encoded' : 'URL provided'}
          </p>
        </div>
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (value.startsWith('data:')) {
              // Open PDF in new window
              window.open(value, '_blank')
            } else {
              window.open(value, '_blank')
            }
          }}
        >
          View
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="pdf-upload">Upload Remittance PDF</Label>
      <div className="flex items-center gap-2">
        <Input
          id="pdf-upload"
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="flex-1"
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById('pdf-upload')?.click()}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Upload PDF remittance document (max 10MB). Alternatively, provide a URL below.
      </p>
    </div>
  )
}
