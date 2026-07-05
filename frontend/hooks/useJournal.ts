import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  createJournalEntry,
  getJournalEntries,
  uploadJournalAttachment,
  type CreateJournalEntryDto,
  type JournalEntry,
  type JournalAttachment,
} from '../app/lib/api'

export type EntryType = 'ai_analysis' | 'manual_note' | 'ai_chart' | 'external_image'
export type FilterType = 'all' | 'ai_analysis' | 'manual_note' | 'image'

function normalizeUploadableFile(file: File | Blob, index: number): File {
  if (file instanceof File) {
    return file
  }

  return new File([file], `attachment_${index}.png`, {
    type: file.type || 'application/octet-stream',
  })
}

async function filesToJournalAttachments(files: (File | Blob)[], imageType: string): Promise<JournalAttachment[]> {
  return Promise.all(
    files.map(async (file, index) => {
      const normalizedFile = normalizeUploadableFile(file, index)
      const uploaded = await uploadJournalAttachment(normalizedFile, imageType)

      return {
        id: crypto.randomUUID(),
        storage_key: uploaded.storage_key,
        public_url: uploaded.public_url,
        file_name: uploaded.file_name,
        attachment_type: uploaded.attachment_type,
        mime_type: uploaded.mime_type,
        size_bytes: uploaded.size_bytes,
      }
    })
  )
}

export function useJournal(portfolioId: string, symbol?: string) {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ['journal', portfolioId],
    queryFn: () => getJournalEntries(portfolioId),
    enabled: Boolean(portfolioId),
  })

  const symbolCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const entry of allEntries) {
      if (entry.symbol) {
        counts[entry.symbol] = (counts[entry.symbol] || 0) + 1
      }
    }
    return counts
  }, [allEntries])

  const entries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return allEntries.filter((entry) => {
      if (symbol && entry.symbol !== symbol) return false
      if (filter === 'ai_analysis' && entry.entry_type !== 'ai_analysis') return false
      if (filter === 'manual_note' && entry.entry_type !== 'manual_note') return false
      if (filter === 'image' && entry.attachment_count <= 0) return false

      if (!normalizedSearch) return true

      return [entry.title, entry.content, ...(entry.tags ?? [])]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    })
  }, [allEntries, filter, search, symbol])

  const { mutateAsync: createEntry } = useMutation({
    mutationFn: async ({
      entry_type,
      title,
      content,
      tags = [],
      files = [],
      imageType = 'upload',
    }: {
      entry_type: EntryType
      title: string
      content: string
      tags?: string[]
      files?: (File | Blob)[]
      imageType?: string
    }) => {
      const attachments = files.length > 0 ? await filesToJournalAttachments(files, imageType) : []
      const payload: CreateJournalEntryDto = {
        symbol: symbol || null,
        entry_type,
        title,
        content,
        tags,
        is_pinned: false,
        attachments: attachments.map((attachment) => ({
          storage_key: attachment.storage_key,
          public_url: attachment.public_url,
          file_name: attachment.file_name,
          attachment_type: attachment.attachment_type,
          mime_type: attachment.mime_type,
          size_bytes: attachment.size_bytes,
        })),
      }

      return createJournalEntry(portfolioId, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal', portfolioId] })
    },
  })

  const saveAIAnalysis = async (
    aiText: string,
    elementRef: React.RefObject<HTMLElement>
  ) => {
    const toastId = toast.loading('Dang luu phan tich...')
    try {
      const files: Blob[] = []
      if (elementRef.current) {
        const canvas = await html2canvas(elementRef.current, {
          backgroundColor: '#0d1528',
          scale: 2,
        })
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((value) => {
            if (value) {
              resolve(value)
              return
            }
            reject(new Error('Failed to capture analysis image'))
          }, 'image/png')
        })
        files.push(blob)
      }

      await createEntry({
        entry_type: 'ai_analysis',
        title: `AI Phan tich ${symbol || 'tong quat'} - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        content: aiText,
        files,
        imageType: 'screenshot',
      })
      toast.success('Da luu vao nhat ky', { id: toastId })
    } catch {
      toast.error('Luu that bai', { id: toastId })
    }
  }

  return {
    entries,
    isLoading,
    symbolCounts,
    filter,
    setFilter,
    search,
    setSearch,
    createEntry,
    saveAIAnalysis,
  }
}
