"use client"

import Link from "next/link"
import { format } from "date-fns"
import { useState, useRef, useCallback, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreHorizontal,
  ExternalLink,
  Sparkles,
  Archive,
  Trash2,
  PlayCircle,
  Headphones,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  Twitter,
  GripVertical
} from "lucide-react"

// Default column widths
const DEFAULT_COLUMN_WIDTHS = {
  checkbox: 40,
  type: 60,
  title: 300,
  source: 120,
  status: 110,
  words: 80,
  score: 70,
  published: 100,
  actions: 50,
}

const STORAGE_KEY = "disruption-intel-column-widths"

// Load column widths from localStorage
function loadColumnWidths(): typeof DEFAULT_COLUMN_WIDTHS {
  if (typeof window === "undefined") return DEFAULT_COLUMN_WIDTHS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) }
    }
  } catch {
    // ignore
  }
  return DEFAULT_COLUMN_WIDTHS
}

// Save column widths to localStorage
function saveColumnWidths(widths: typeof DEFAULT_COLUMN_WIDTHS) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
  } catch {
    // ignore
  }
}

// Resize handle component
function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startXRef.current = e.clientX
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current
      if (Math.abs(delta) > 2) {
        onResize(delta)
        startXRef.current = e.clientX
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, onResize])

  return (
    <div
      className={`absolute right-0 top-0 h-full w-4 cursor-col-resize flex items-center justify-center z-10 group/resize ${
        isDragging ? "bg-primary/20" : "hover:bg-muted/50"
      }`}
      onMouseDown={handleMouseDown}
    >
      <GripVertical className={`h-3 w-3 ${isDragging ? "text-primary" : "text-muted-foreground/50 group-hover/resize:text-muted-foreground"}`} />
    </div>
  )
}

// Content type icon component with modern styling
function ContentTypeIcon({ type, sourceType }: { type?: string; sourceType: string }) {
  const isPodcast = type === "PODCAST_EPISODE" || sourceType === "PODCAST"
  const isSubstack = sourceType === "SUBSTACK"
  const isArticle = type === "ARTICLE" || sourceType === "RSS"
  const isTweet = type === "SOCIAL_POST" || sourceType === "TWITTER"

  if (isPodcast) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30">
        <Headphones className="h-4 w-4 text-purple-400" />
      </div>
    )
  }

  if (isSubstack) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-600/30">
        <FileText className="h-4 w-4 text-orange-500" />
      </div>
    )
  }

  if (isArticle) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30">
        <FileText className="h-4 w-4 text-orange-400" />
      </div>
    )
  }

  if (isTweet) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500/20 to-sky-600/20 border border-sky-500/30">
        <Twitter className="h-4 w-4 text-sky-400" />
      </div>
    )
  }

  // YouTube/Video
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30">
      <PlayCircle className="h-4 w-4 text-red-400" />
    </div>
  )
}

// Status badge with modern icons
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
    PENDING: {
      icon: <Clock className="h-3 w-3" />,
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      label: "Pending"
    },
    PROCESSING: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      label: "Processing"
    },
    ANALYZED: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      label: "Analyzed"
    },
    FAILED: {
      icon: <AlertCircle className="h-3 w-3" />,
      className: "bg-red-500/10 text-red-500 border-red-500/20",
      label: "Failed"
    },
    ARCHIVED: {
      icon: <Archive className="h-3 w-3" />,
      className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      label: "Archived"
    },
  }

  const { icon, className, label } = config[status] || config.PENDING

  return (
    <Badge variant="outline" className={`${className} gap-1 font-medium`}>
      {icon}
      {label}
    </Badge>
  )
}

export interface Content {
  id: string
  title: string
  publishedAt: string
  status: string
  contentType?: string
  thumbnailUrl: string | null
  originalUrl: string
  source: {
    id: string
    name: string
    type: string
  }
  transcript: {
    wordCount: number
    source?: string
  } | null
  analyses: Array<{
    relevanceScore: number | null
  }>
  _count: {
    tags: number
    usageHistory: number
  }
}

interface ContentTableProps {
  contents: Content[]
  onAnalyze: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort?: (column: string) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

function SortableHeader({
  column,
  label,
  currentSort,
  currentOrder,
  onSort,
  className = ""
}: {
  column: string
  label: string
  currentSort?: string
  currentOrder?: "asc" | "desc"
  onSort?: (column: string) => void
  className?: string
}) {
  const isActive = currentSort === column

  return (
    <button
      onClick={() => onSort?.(column)}
      className={`flex items-center gap-1 hover:text-foreground transition-colors ${className}`}
    >
      {label}
      {isActive ? (
        currentOrder === "asc" ? (
          <ArrowUp className="h-3 w-3 text-primary" />
        ) : (
          <ArrowDown className="h-3 w-3 text-primary" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  )
}

export function ContentTable({
  contents,
  onAnalyze,
  onArchive,
  onDelete,
  sortBy,
  sortOrder,
  onSort,
  selectedIds = new Set(),
  onSelectionChange
}: ContentTableProps) {
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS)

  // Load saved column widths on mount
  useEffect(() => {
    setColumnWidths(loadColumnWidths())
  }, [])

  const handleResize = useCallback((column: keyof typeof DEFAULT_COLUMN_WIDTHS, delta: number) => {
    setColumnWidths(prev => {
      const newWidth = Math.max(40, prev[column] + delta)
      const newWidths = { ...prev, [column]: newWidth }
      saveColumnWidths(newWidths)
      return newWidths
    })
  }, [])

  const allSelected = contents.length > 0 && contents.every(c => selectedIds.has(c.id))
  const someSelected = contents.some(c => selectedIds.has(c.id)) && !allSelected

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    if (checked) {
      const newSelection = new Set(selectedIds)
      contents.forEach(c => newSelection.add(c.id))
      onSelectionChange(newSelection)
    } else {
      const newSelection = new Set(selectedIds)
      contents.forEach(c => newSelection.delete(c.id))
      onSelectionChange(newSelection)
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (!onSelectionChange) return
    const newSelection = new Set(selectedIds)
    if (checked) {
      newSelection.add(id)
    } else {
      newSelection.delete(id)
    }
    onSelectionChange(newSelection)
  }

  return (
    <div className="overflow-x-auto">
      <Table style={{ minWidth: Object.values(columnWidths).reduce((a, b) => a + b, 0) }}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead style={{ width: columnWidths.checkbox }} className="relative">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected
                  }
                }}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.type }} className="relative">
              Type
              <ResizeHandle onResize={(delta) => handleResize("type", delta)} />
            </TableHead>
            <TableHead style={{ width: columnWidths.title }} className="relative">
              <SortableHeader
                column="title"
                label="Title"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <ResizeHandle onResize={(delta) => handleResize("title", delta)} />
            </TableHead>
            <TableHead style={{ width: columnWidths.source }} className="relative">
              <SortableHeader
                column="sourceName"
                label="Source"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <ResizeHandle onResize={(delta) => handleResize("source", delta)} />
            </TableHead>
            <TableHead style={{ width: columnWidths.status }} className="relative">
              <SortableHeader
                column="status"
                label="Status"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <ResizeHandle onResize={(delta) => handleResize("status", delta)} />
            </TableHead>
            <TableHead style={{ width: columnWidths.words }} className="relative">
              <SortableHeader
                column="wordCount"
                label="Words"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <ResizeHandle onResize={(delta) => handleResize("words", delta)} />
            </TableHead>
            <TableHead style={{ width: columnWidths.score }} className="relative">
              <SortableHeader
                column="relevanceScore"
                label="Score"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <ResizeHandle onResize={(delta) => handleResize("score", delta)} />
            </TableHead>
            <TableHead style={{ width: columnWidths.published }} className="relative">
              <SortableHeader
                column="publishedAt"
                label="Published"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <ResizeHandle onResize={(delta) => handleResize("published", delta)} />
            </TableHead>
            <TableHead style={{ width: columnWidths.actions }}></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contents.map((content) => {
            const isSelected = selectedIds.has(content.id)
            return (
              <TableRow
                key={content.id}
                className={`group ${isSelected ? 'bg-primary/5' : ''}`}
              >
                <TableCell style={{ width: columnWidths.checkbox }}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectOne(content.id, checked as boolean)}
                    aria-label={`Select ${content.title}`}
                  />
                </TableCell>
                <TableCell style={{ width: columnWidths.type }}>
                  <ContentTypeIcon type={content.contentType} sourceType={content.source.type} />
                </TableCell>
                <TableCell style={{ width: columnWidths.title, maxWidth: columnWidths.title }}>
                  <Link
                    href={`/content/${content.id}`}
                    className="font-medium hover:text-primary truncate block transition-colors"
                    title={content.title}
                  >
                    {content.title}
                  </Link>
                </TableCell>
                <TableCell style={{ width: columnWidths.source, maxWidth: columnWidths.source }}>
                  <Badge variant="secondary" className="truncate max-w-full font-normal">
                    {content.source.name}
                  </Badge>
                </TableCell>
                <TableCell style={{ width: columnWidths.status }}>
                  <StatusBadge status={content.status} />
                </TableCell>
                <TableCell style={{ width: columnWidths.words }}>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {content.transcript?.wordCount?.toLocaleString() || "-"}
                  </div>
                </TableCell>
                <TableCell style={{ width: columnWidths.score }}>
                  {content.analyses[0]?.relevanceScore ? (
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: content.analyses[0].relevanceScore >= 0.8
                            ? '#22c55e'
                            : content.analyses[0].relevanceScore >= 0.5
                            ? '#f59e0b'
                            : '#ef4444'
                        }}
                      />
                      <span className="text-sm font-medium">
                        {(content.analyses[0].relevanceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell style={{ width: columnWidths.published }} className="text-sm text-muted-foreground">
                  {format(new Date(content.publishedAt), "MMM d, yy")}
                </TableCell>
                <TableCell style={{ width: columnWidths.actions }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/content/${content.id}`} className="gap-2">
                          <Eye className="h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAnalyze(content.id)} className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        Run Analysis
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={content.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Original
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onArchive(content.id)} className="gap-2">
                        <Archive className="h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2 text-destructive focus:text-destructive"
                        onClick={() => onDelete(content.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
