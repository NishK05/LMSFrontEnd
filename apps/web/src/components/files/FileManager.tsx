import React, { useState, useEffect, useRef } from 'react'
import type { FileManagerMode, LMSFile, LMSFolder } from '@lms/types'
import { Button } from '@lms/ui'
import { Folder as FolderIcon, File as FileIcon, Upload, Download, Trash2, Edit, Loader2, CheckCircle, XCircle, Users, Move, MoreHorizontal } from 'lucide-react'

interface FileManagerProps {
  mode: FileManagerMode
  courseId: string
  userId: string
  userRole: string
}

interface Course {
  id: string
  title: string
}

function getBreadcrumbs(path: string) {
  if (!path) return []
  const parts = path.split('/').filter(Boolean)
  return parts.map((part, idx) => ({
    name: part,
    path: parts.slice(0, idx + 1).join('/'),
  }))
}

export function FileManager({ mode, courseId, userId, userRole }: FileManagerProps) {
  const [folders, setFolders] = useState<LMSFolder[]>([])
  const [files, setFiles] = useState<LMSFile[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([courseId])
  const [showClassSelector, setShowClassSelector] = useState(false)
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [pendingUpload, setPendingUpload] = useState<FileList | null>(null)
  
  // Teacher actions state
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'file' | 'folder'; name: string } | null>(null)
  const [movingItem, setMovingItem] = useState<{ id: string; type: 'file' | 'folder'; name: string } | null>(null)
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [previewFile, setPreviewFile] = useState<LMSFile | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch available courses for multi-class selection
  useEffect(() => {
    if (mode === 'teacher') {
      const fetchCourses = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses`)
          const data = await res.json()
          if (data.success) {
            setAvailableCourses(data.data || [])
          }
        } catch (e) {
          console.error('Failed to fetch courses:', e)
        }
      }
      fetchCourses()
    }
  }, [mode])

  // Fetch files/folders for the current course and path
  const fetchFiles = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/course/${courseId}`)
      const data = await res.json()
      if (data.success) {
        // Filter by currentPath
        const allFolders: LMSFolder[] = data.data.folders || []
        const allFiles: LMSFile[] = data.data.files || []
        const foldersInPath = allFolders.filter(f => (f.path || '') === currentPath)
        const filesInPath = allFiles.filter(f => (f.path || '') === currentPath)
        setFolders(foldersInPath)
        setFiles(filesInPath)
      } else {
        setError(data.error || 'Failed to load files')
      }
    } catch (e) {
      setError('Failed to load files')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    fetchFiles()
  }, [courseId, currentPath])

  // Handle file/folder upload
  const handleUpload = async (filesToUpload: FileList | File[]) => {
    setError('')
    setSuccess('')
    setUploadProgress(0)
    if (!filesToUpload || filesToUpload.length === 0) return
    
    // If teacher mode and multiple courses available, show class selector
    if (mode === 'teacher' && availableCourses.length > 1) {
      setPendingUpload(filesToUpload as FileList)
      setShowClassSelector(true)
      return
    }
    
    // Otherwise, proceed with upload
    await performUpload(filesToUpload)
  }

  // Perform the actual upload
  const performUpload = async (filesToUpload: FileList | File[], classIds: string[] = selectedClasses) => {
    const formData = new FormData()
    for (const file of Array.from(filesToUpload)) {
      formData.append('files', file)
    }
    formData.append('classIds', classIds.join(','))
    formData.append('userId', userId)
    formData.append('folderPath', currentPath)
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('Upload successful!')
        setSelectedFiles([])
        setPendingUpload(null)
        setShowClassSelector(false)
        setTimeout(() => setSuccess(''), 2000)
        // Immediately refresh files
        fetchFiles()
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (e) {
      setError('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  // Handle class selection for upload
  const handleClassSelection = () => {
    if (pendingUpload) {
      performUpload(pendingUpload, selectedClasses)
    }
  }

  // Drag-and-drop upload
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (mode === 'teacher') {
      handleUpload(e.dataTransfer.files)
    }
  }

  // Click-to-select upload
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && mode === 'teacher') {
      handleUpload(e.target.files)
    }
  }

  // Download file
  const handleDownload = async (fileId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/download/${fileId}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = files.find(f => f.id === fileId)?.filename || 'file'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setError('Download failed')
    }
  }

  // Teacher actions
  const handleRename = async () => {
    if (!editingItem || !newName.trim()) return
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          newName: newName.trim(),
          type: editingItem.type
        })
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`${editingItem.type === 'file' ? 'File' : 'Folder'} renamed successfully!`)
        setEditingItem(null)
        setNewName('')
        setTimeout(() => setSuccess(''), 2000)
        // Refresh files
        fetchFiles()
      } else {
        setError(data.error || 'Rename failed')
      }
    } catch (e) {
      setError('Rename failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMove = async () => {
    if (!movingItem || !newPath.trim()) return
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: movingItem.id,
          newFolderPath: newPath.trim(),
          type: movingItem.type
        })
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`${movingItem.type === 'file' ? 'File' : 'Folder'} moved successfully!`)
        setMovingItem(null)
        setNewPath('')
        setTimeout(() => setSuccess(''), 2000)
        // Refresh files
        fetchFiles()
      } else {
        setError(data.error || 'Move failed')
      }
    } catch (e) {
      setError('Move failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id: string, type: 'file' | 'folder', name: string) => {
    if (!confirm(`Are you sure you want to delete ${type} "${name}"?`)) return
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/${id}?type=${type}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`${type === 'file' ? 'File' : 'Folder'} deleted successfully!`)
        setTimeout(() => setSuccess(''), 2000)
        // Refresh files
        fetchFiles()
      } else {
        setError(data.error || 'Delete failed')
      }
    } catch (e) {
      setError('Delete failed')
    } finally {
      setActionLoading(false)
    }
  }

  // Helper: check if file is previewable by browser
  function isPreviewable(file: LMSFile) {
    const previewableTypes = [
      'application/pdf',
      'image/',
      'text/',
      'application/json',
      'application/xml',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/rtf',
      'application/csv',
      'text/csv',
      'text/markdown',
    ]
    return previewableTypes.some(type => file.mimetype.startsWith(type) || file.mimetype === type)
  }

  // Breadcrumb navigation
  const breadcrumbs = getBreadcrumbs(currentPath)

  // Render
  return (
    <div className="bg-white/80 rounded-2xl shadow-lg border border-purple-100 p-6 min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-purple-900">Files</h2>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-purple-400 ml-2" />}
        </div>
        {mode === 'teacher' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Upload
            </Button>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        )}
      </div>
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-4 text-sm text-purple-600">
        <span
          className={`cursor-pointer hover:underline ${currentPath === '' ? 'font-bold text-purple-900' : ''}`}
          onClick={() => setCurrentPath('')}
        >
          Root
        </span>
        {breadcrumbs.map((bc, idx) => (
          <React.Fragment key={bc.path}>
            <span className="mx-1">/</span>
            <span
              className={`cursor-pointer hover:underline ${idx === breadcrumbs.length - 1 ? 'font-bold text-purple-900' : ''}`}
              onClick={() => setCurrentPath(bc.path)}
            >
              {bc.name}
            </span>
          </React.Fragment>
        ))}
      </div>
      
      {/* Drag-and-drop area */}
      {mode === 'teacher' && (
        <div
          className="border-2 border-dashed border-purple-200 rounded-xl p-6 mb-4 text-center text-purple-400 hover:bg-purple-50 transition cursor-pointer"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          Drag and drop files here, or click Upload above
        </div>
      )}
      
      {/* Error/Success messages */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 mb-2"><XCircle className="w-4 h-4" /> {error}</div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-green-600 mb-2"><CheckCircle className="w-4 h-4" /> {success}</div>
      )}
      
      {/* File/folder list */}
      <div className="overflow-x-auto">
        {folders.length === 0 && files.length === 0 && !loading ? (
          <div className="text-center py-12">
            <FolderIcon className="w-16 h-16 text-purple-300 mx-auto mb-4" />
            <p className="text-purple-500 mb-2">No files or folders found</p>
            <p className="text-sm text-purple-400">
              {mode === 'teacher' ? 'Upload files to get started' : 'Files will appear here when uploaded by your instructor'}
            </p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-purple-700 border-b border-purple-200">
                <th className="text-left py-3 px-2">Name</th>
                <th className="text-left py-3 px-2 hidden md:table-cell">Type</th>
                <th className="text-left py-3 px-2 hidden lg:table-cell">Size</th>
                <th className="text-left py-3 px-2 hidden lg:table-cell">Uploaded</th>
                <th className="text-left py-3 px-2 hidden md:table-cell">Visible In</th>
                <th className="text-left py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Folders */}
              {folders.map(folder => (
                <tr key={folder.id} className="hover:bg-purple-50 border-b border-purple-100">
                  <td className="py-3 px-2">
                    <div 
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setCurrentPath(folder.path)}
                    >
                      <FolderIcon className="w-5 h-5 text-purple-400" />
                      <span className="font-medium text-purple-900">{folder.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 hidden md:table-cell">Folder</td>
                  <td className="py-3 px-2 hidden lg:table-cell">-</td>
                  <td className="py-3 px-2 hidden lg:table-cell">{new Date(folder.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-2 hidden md:table-cell">
                    <span className="text-xs text-purple-500">{folder.visibleInClasses?.join(', ') || courseId}</span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      {mode === 'teacher' && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => setEditingItem({ id: folder.id, type: 'folder', name: folder.name })} title="Rename">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setMovingItem({ id: folder.id, type: 'folder', name: folder.name })} title="Move">
                            <Move className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(folder.id, 'folder', folder.name)} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Files */}
              {files.map(file => (
                <tr
                  key={file.id}
                  className="hover:bg-purple-50 border-b border-purple-100 cursor-pointer"
                  onDoubleClick={() => setPreviewFile(file)}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-5 h-5 text-purple-400" />
                      <span className="font-medium text-purple-900">{file.filename}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 hidden md:table-cell">{file.mimetype.split('/')[0]}</td>
                  <td className="py-3 px-2 hidden lg:table-cell">{(file.size / 1024).toFixed(1)} KB</td>
                  <td className="py-3 px-2 hidden lg:table-cell">{new Date(file.uploadedAt).toLocaleDateString()}</td>
                  <td className="py-3 px-2 hidden md:table-cell">
                    <span className="text-xs text-purple-500">{file.visibleInClasses?.join(', ') || courseId}</span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleDownload(file.id)} title="Download">
                        <Download className="w-4 h-4" />
                      </Button>
                      {mode === 'teacher' && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => setEditingItem({ id: file.id, type: 'file', name: file.filename })} title="Rename">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setMovingItem({ id: file.id, type: 'file', name: file.filename })} title="Move">
                            <Move className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(file.id, 'file', file.filename)} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Progress bar */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="w-full bg-purple-200 rounded-full h-2 mt-4">
          <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
        </div>
      )}

      {/* Multi-Class Selector Modal */}
      {showClassSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Select Classes</h3>
            <p className="text-sm text-gray-600 mb-4">Choose which classes should have access to these files:</p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableCourses.map(course => (
                <label key={course.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClasses.includes(course.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClasses(prev => [...prev, course.id])
                      } else {
                        setSelectedClasses(prev => prev.filter(id => id !== course.id))
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{course.title}</span>
                </label>
              ))}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowClassSelector(false)
                  setPendingUpload(null)
                  setSelectedClasses([courseId])
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleClassSelection}
                disabled={selectedClasses.length === 0}
              >
                Upload to Selected Classes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Rename {editingItem.type}</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`Enter new name for ${editingItem.name}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditingItem(null); setNewName('') }} disabled={actionLoading}>
                Cancel
              </Button>
              <Button onClick={handleRename} disabled={actionLoading || !newName.trim()}>
                {actionLoading ? 'Renaming...' : 'Rename'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {movingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Move {movingItem.type}</h3>
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="Enter destination folder path (e.g., documents/assignments)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setMovingItem(null); setNewPath('') }} disabled={actionLoading}>
                Cancel
              </Button>
              <Button onClick={handleMove} disabled={actionLoading || !newPath.trim()}>
                {actionLoading ? 'Moving...' : 'Move'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <span className="font-semibold truncate max-w-[80%]">{previewFile.filename}</span>
              <button onClick={() => setPreviewFile(null)} className="text-2xl font-bold text-gray-500 hover:text-gray-700">&times;</button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50">
              {isPreviewable(previewFile) ? (
                <iframe
                  src={`${process.env.NEXT_PUBLIC_API_URL}/files/preview/${previewFile.id}`}
                  title="File Preview"
                  className="w-full h-full border-0"
                  style={{ minHeight: '60vh' }}
                />
              ) : (
                <div className="text-center text-gray-500 p-8">
                  <p>Cannot preview this file type in browser.</p>
                  <p className="text-xs mt-2">Try downloading the file to view it.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 