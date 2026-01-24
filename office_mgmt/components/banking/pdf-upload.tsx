'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getUploadUrl } from '@/app/actions/upload'

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

    // Validate file size (max 50MB for S3, much larger than before)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload a file smaller than 50MB',
      })
      return
    }

    setIsUploading(true)

    try {
      // 1. Get Presigned URL
      const { url, key } = await getUploadUrl(file.name, file.type)

      // 2. Upload directly to S3
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Upload to storage failed')
      }

      // 3. Store the key
      onChange(key)
      
      toast({
        variant: 'success',
        title: 'File uploaded',
        description: 'PDF has been uploaded successfully',
      })
    } catch (error) {
      console.error(error)
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleView = () => {
      if (!value) return
      
      // If it's a legacy base64 file (starts with data:), open directly
      if (value.startsWith('data:') || value.startsWith('http')) {
          window.open(value, '_blank')
          return
      }

      // Otherwise it's an S3 key, use our secure proxy route
      // We pass the key as the path
      window.open(`/api/files/${value}`, '_blank')
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <File className="h-5 w-5 text-gray-500" />
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium truncate">Document Uploaded</p>
          <p className="text-xs text-gray-500 truncate">
            {value.startsWith('data:') ? 'Legacy File' : 'Stored Securely'}
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
          onClick={handleView}
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
          {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
              <Upload className="h-4 w-4 mr-2" />
          )}
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Upload PDF remittance document (max 50MB).
      </p>
    </div>
  )
}
