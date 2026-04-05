import type { ChatResponse, DocumentItem, UploadResponse } from '../types'
import type { HealthResponse } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
const FETCH_TIMEOUT_MS = 30_000

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options?.headers ?? {}),
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || `Request failed with status ${response.status}`)
    }

    if (response.status === 204) {
      return {} as T
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  uploadPdf: async (file: File): Promise<UploadResponse> => {
    const form = new FormData()
    form.append('file', file)
    return request<UploadResponse>('/documents', {
      method: 'POST',
      body: form,
    })
  },

  listDocuments: async (): Promise<DocumentItem[]> => {
    return request<DocumentItem[]>('/documents')
  },

  deleteDocument: async (documentId: string): Promise<void> => {
    await request('/documents/' + encodeURIComponent(documentId), { method: 'DELETE' })
  },

  ask: async (query: string, topK = 5): Promise<ChatResponse> => {
    return request<ChatResponse>('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: topK }),
    })
  },

  health: async (): Promise<HealthResponse> => {
    return request<HealthResponse>('/health')
  },
}
