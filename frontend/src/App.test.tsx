import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const { uploadPdf, listDocuments, deleteDocument, ask, health } = vi.hoisted(() => ({
  uploadPdf: vi.fn(), listDocuments: vi.fn(), deleteDocument: vi.fn(), ask: vi.fn(), health: vi.fn(),
}))

vi.mock('./services/api', () => ({ api: { uploadPdf, listDocuments, deleteDocument, ask, health } }))

describe('App', () => {
  beforeEach(() => {
    uploadPdf.mockReset(); listDocuments.mockReset(); deleteDocument.mockReset(); ask.mockReset(); health.mockReset()
    health.mockResolvedValue({ status: 'ok', service: 'PDF RAG Chatbot API' })
  })

  it('renders empty doc state', async () => {
    listDocuments.mockResolvedValue([])
    render(<App />)
    fireEvent.click(screen.getByText('Documents'))
    await waitFor(() => expect(screen.getByText('No documents yet')).toBeInTheDocument())
  })

  it('shows loading initially', async () => {
    listDocuments.mockImplementation(() => new Promise(r => setTimeout(() => r([]), 100)))
    render(<App />)
    fireEvent.click(screen.getByText('Documents'))
    await waitFor(() => expect(screen.getByText('Loading…')).toBeInTheDocument())
  })

  it('uploads and chats', async () => {
    listDocuments.mockResolvedValueOnce([]).mockResolvedValueOnce([{ document_id: 'd1', filename: 'x.pdf', chunks_created: 5 }])
    uploadPdf.mockResolvedValue({ document_id: 'd1', filename: 'x.pdf', chunks_created: 5 })
    ask.mockResolvedValue({ answer: 'Answer text', latency_ms: 10, sources: [] })
    render(<App />)
    fireEvent.click(screen.getByText('Documents'))
    const fi = screen.getByLabelText('Upload PDF') as HTMLInputElement
    fireEvent.change(fi, { target: { files: [new File(['%PDF'], 'x.pdf', { type: 'application/pdf' })] } })
    await waitFor(() => expect(uploadPdf).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByText('Chat'))
    const ta = screen.getByPlaceholderText('Ask about your documents…')
    fireEvent.change(ta, { target: { value: 'Hello?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(ask).toHaveBeenCalledWith('Hello?'))
  })

  it('enter submits', async () => {
    listDocuments.mockResolvedValue([{ document_id: 'd1', filename: 'x.pdf', chunks_created: 1 }])
    ask.mockResolvedValue({ answer: 'ok', latency_ms: 5, sources: [] })
    render(<App />)
    await waitFor(() => expect(screen.getByText('Start a conversation')).toBeInTheDocument())
    const ta = screen.getByPlaceholderText('Ask about your documents…')
    fireEvent.change(ta, { target: { value: 'Enter' } })
    fireEvent.keyDown(ta, { key: 'Enter' })
    await waitFor(() => expect(ask).toHaveBeenCalledWith('Enter'))
  })
})
