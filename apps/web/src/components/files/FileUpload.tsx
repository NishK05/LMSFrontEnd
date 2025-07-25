import React, { useRef, useState } from 'react'
import { Button } from '@lms/ui'

interface FileUploadProps {
  courseId: string
  userId: string
  onUpload: (files: any[]) => void
  assignmentId?: string
}

export default function FileUpload({ courseId, userId, onUpload, assignmentId }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [protect, setProtect] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return
    setLoading(true)
    setError('')
    const formData = new FormData()
    for (const file of selectedFiles) {
      formData.append('files', file)
    }
    formData.append('classIds', courseId)
    formData.append('userId', userId)
    formData.append('folderPath', '')
    formData.append('protect', String(protect))
    if (assignmentId) formData.append('assignmentId', assignmentId)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        onUpload(data.data)
        setSelectedFiles([])
        setProtect(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (e) {
      setError('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="border rounded px-2 py-1"
        />
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={protect}
            onChange={e => setProtect(e.target.checked)}
          />
          <span className="text-sm">Protect PDFs</span>
        </label>
        <Button onClick={handleUpload} disabled={loading || selectedFiles.length === 0}>
          {loading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  )
} 