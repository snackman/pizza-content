'use client'

import { useCallback, useState } from 'react'
import { ContentType } from '@/types/database'
import {
  validateFile,
  FILE_SIZE_LIMITS,
  ALLOWED_EXTENSIONS,
  formatFileSize,
  detectContentType,
} from '@/lib/upload'

interface FileUploaderProps {
  contentType: ContentType
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  selectedFile: File | null
  disabled?: boolean
}

export function FileUploader({
  contentType,
  onFileSelect,
  onFileRemove,
  selectedFile,
  disabled = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [disabled, contentType]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [contentType]
  )

  const handleFile = (file: File) => {
    setError(null)

    // Auto-detect type if possible
    const detectedType = detectContentType(file)
    if (detectedType && detectedType !== contentType) {
      setError(`This file appears to be a ${detectedType}. Please select the correct content type.`)
      return
    }

    // Validate file
    const validation = validateFile(file, contentType)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    onFileSelect(file)
  }

  const acceptTypes = ALLOWED_EXTENSIONS[contentType].join(',')
  const maxSize = FILE_SIZE_LIMITS[contentType]

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Upload File
      </label>

      {selectedFile ? (
        <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 truncate max-w-[200px]">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onFileRemove}
              disabled={disabled}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all
            ${isDragging ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-gray-400'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <input
            type="file"
            accept={acceptTypes}
            onChange={handleFileInput}
            disabled={disabled}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-gray-700 font-medium">
                  {isDragging ? 'Drop your file here' : 'Drag and drop or click to upload'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {ALLOWED_EXTENSIONS[contentType].join(', ').toUpperCase()} up to {formatFileSize(maxSize)}
                </p>
              </div>
            </div>
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
