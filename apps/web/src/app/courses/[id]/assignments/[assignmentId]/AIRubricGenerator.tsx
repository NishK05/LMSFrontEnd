"use client"

import { useState, useRef } from 'react'
import { Button } from '@lms/ui'
import { Upload, Sparkles, X, Check } from 'lucide-react'

interface AIRubricGeneratorProps {
  courseId: string
  assignmentId: string
  assignmentMaxScore: number
  onSuccess: () => void
  onCancel: () => void
}

export function AIRubricGenerator({ courseId, assignmentId, assignmentMaxScore, onSuccess, onCancel }: AIRubricGeneratorProps) {
  const [promptImage, setPromptImage] = useState<File | null>(null)
  const [solutionImages, setSolutionImages] = useState<File[]>([])
  const [rubricName, setRubricName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<{
    totalPoints: number
    isValid: boolean
    expectedPoints: number
  } | null>(null)

  const promptFileRef = useRef<HTMLInputElement>(null)
  const solutionFileRef = useRef<HTMLInputElement>(null)

  const handlePromptImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file for the prompt')
        return
      }
      setPromptImage(file)
      setError(null)
    }
  }

  const handleSolutionImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      setError('Please select at least one image file for the solution')
      return
    }
    
    setSolutionImages(imageFiles)
    setError(null)
  }

  const removePromptImage = () => {
    setPromptImage(null)
    if (promptFileRef.current) {
      promptFileRef.current.value = ''
    }
  }

  const removeSolutionImage = (index: number) => {
    setSolutionImages(prev => prev.filter((_, i) => i !== index))
    if (solutionFileRef.current) {
      solutionFileRef.current.value = ''
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleGenerate = async () => {
    if (!promptImage || solutionImages.length === 0 || !rubricName.trim()) {
      setError('Please provide a prompt image, at least one solution image, and a rubric name')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      // Convert files to base64
      const promptBase64 = await convertFileToBase64(promptImage)
      const solutionBase64s = await Promise.all(solutionImages.map(convertFileToBase64))

      const response = await fetch(`/api/gradebook/${courseId}/assignments/${assignmentId}/rubrics/ai-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptImage: promptBase64,
          solutionImages: solutionBase64s,
          rubricName: rubricName.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setValidation(data.validation)
        onSuccess()
      } else {
        setError(data.error || 'Failed to generate rubric')
      }
    } catch (err) {
      setError('Failed to generate rubric. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {error}
          </div>
        </div>
      )}

      {validation && (
        <div className={`p-4 border rounded-xl text-sm ${
          validation.isValid 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-yellow-50 border-yellow-200 text-yellow-700'
        }`}>
          <div className="flex items-center gap-2">
            {validation.isValid ? <Check className="w-4 h-4" /> : <span>⚠</span>}
            <span>
              AI generated rubric with {validation.totalPoints} points 
              {!validation.isValid && ` (should be ${validation.expectedPoints})`}
            </span>
          </div>
        </div>
      )}

      {/* Rubric Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rubric Name *
        </label>
        <input
          type="text"
          value={rubricName}
          onChange={(e) => setRubricName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          placeholder="Enter rubric name"
        />
      </div>

      {/* Prompt Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Assignment Prompt Image *
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
          {promptImage ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-700 font-medium">{promptImage.name}</span>
                <Button onClick={removePromptImage} size="sm" variant="ghost" className="text-red-500 hover:bg-red-100">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Upload the assignment prompt image</p>
              <Button
                onClick={() => promptFileRef.current?.click()}
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                Select Image
              </Button>
            </div>
          )}
          <input
            ref={promptFileRef}
            type="file"
            accept="image/*"
            onChange={handlePromptImageChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Solution Images Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Solution Images * (Upload at least one)
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
          {solutionImages.length > 0 ? (
            <div className="space-y-3">
              {solutionImages.map((file, index) => (
                <div key={index} className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                  <Button 
                    onClick={() => removeSolutionImage(index)} 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 hover:bg-red-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Upload solution images</p>
              <Button
                onClick={() => solutionFileRef.current?.click()}
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                Select Images
              </Button>
            </div>
          )}
          <input
            ref={solutionFileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleSolutionImagesChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <p className="font-medium mb-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          How it works:
        </p>
        <ul className="space-y-1 text-xs">
          <li>• Upload the assignment prompt image</li>
          <li>• Upload one or more solution images</li>
          <li>• AI will analyze the images and generate a detailed rubric</li>
          <li>• The rubric will be structured with sections, parts, and items</li>
          <li>• You can edit the generated rubric before saving</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Assignment worth: <span className="font-medium">{assignmentMaxScore} points</span>
        </div>
        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={generating || !promptImage || solutionImages.length === 0 || !rubricName.trim()}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Rubric
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 