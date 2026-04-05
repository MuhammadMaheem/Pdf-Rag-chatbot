export interface SourceChunk {
  chunk_id: string
  source: string
  page: number
  score: number
  content: string
}

export interface ChatResponse {
  answer: string
  sources: SourceChunk[]
  latency_ms: number
}

export interface DocumentItem {
  document_id: string
  filename: string
  chunks_created: number
}

export interface UploadResponse {
  document_id: string
  filename: string
  chunks_created: number
}

export interface HealthResponse {
  status: string
  service: string
}
