import React from 'react'
// Utility functions for Discussion Board

// Cross-link parsing: converts #123 to clickable links
export function parseCrossLinks(text: string, onLinkClick?: (code: string) => void): (string | JSX.Element)[] {
  const regex = /#(\d+)/g
  const parts: (string | JSX.Element)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const code = match[0]
    parts.push(
      <span
        key={match.index}
        className="text-blue-600 underline cursor-pointer"
        onClick={() => onLinkClick && onLinkClick(code)}
      >
        {code}
      </span>
    )
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts
}

// File validation for attachments
export function validateAttachment(file: File): string | null {
  const allowedTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'text/csv',
    'application/x-python-code',
    'text/x-python',
  ]
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(py|txt|csv|pdf|png|jpe?g)$/i)) {
    return 'Unsupported file type.'
  }
  if (file.size > maxSize) {
    return 'File size exceeds 5MB.'
  }
  return null
}

// Badge logic for roles
export function getRoleBadge(role: string): { label: string; className: string } {
  switch (role) {
    case 'ADMIN':
      return { label: 'Admin', className: 'bg-red-100 text-red-700' }
    case 'TEACHER':
      return { label: 'Staff', className: 'bg-blue-100 text-blue-700' }
    case 'COLLABORATOR':
      return { label: 'Collab', className: 'bg-green-100 text-green-700' }
    default:
      return { label: 'Student', className: 'bg-purple-100 text-purple-700' }
  }
}

// Privacy label
export function getPrivacyLabel(privacy: string): string {
  switch (privacy) {
    case 'PRIVATE':
      return 'Private (staff/collab only)'
    case 'ANONYMOUS':
      return 'Anonymous'
    default:
      return 'Public'
  }
} 