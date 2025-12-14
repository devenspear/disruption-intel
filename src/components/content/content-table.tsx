"use client"

import Link from "next/link"
import { format } from "date-fns"
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
  FileText
} from "lucide-react"

// Content type icon component with modern styling
function ContentTypeIcon({ type, sourceType }: { type?: string; sourceType: string }) {
  const isPodcast = type === "PODCAST_EPISODE" || sourceType === "PODCAST"
  if (isPodcast) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30">
        <Headphones className="h-4 w-4 text-purple-400" />
      </div>
    )
  }
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

interface Content {
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
  onSort
}: ContentTableProps) {
  return (
    <Table className="w-full table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[60px]">Type</TableHead>
          <TableHead>
            <SortableHeader
              column="title"
              label="Title"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="w-[100px]">Source</TableHead>
          <TableHead className="w-[120px]">Status</TableHead>
          <TableHead className="w-[80px]">
            <SortableHeader
              column="wordCount"
              label="Words"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="w-[70px]">Score</TableHead>
          <TableHead className="w-[100px]">
            <SortableHeader
              column="publishedAt"
              label="Published"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contents.map((content) => (
          <TableRow key={content.id} className="group">
            <TableCell className="w-[60px]">
              <ContentTypeIcon type={content.contentType} sourceType={content.source.type} />
            </TableCell>
            <TableCell className="max-w-0">
              <Link
                href={`/content/${content.id}`}
                className="font-medium hover:text-primary truncate block transition-colors"
                title={content.title}
              >
                {content.title}
              </Link>
            </TableCell>
            <TableCell className="w-[100px]">
              <Badge variant="secondary" className="truncate max-w-full font-normal">
                {content.source.name}
              </Badge>
            </TableCell>
            <TableCell className="w-[120px]">
              <StatusBadge status={content.status} />
            </TableCell>
            <TableCell className="w-[80px]">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <FileText className="h-3 w-3" />
                {content.transcript?.wordCount?.toLocaleString() || "-"}
              </div>
            </TableCell>
            <TableCell className="w-[70px]">
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
            <TableCell className="w-[100px] text-sm text-muted-foreground">
              {format(new Date(content.publishedAt), "MMM d, yy")}
            </TableCell>
            <TableCell className="w-[50px]">
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
        ))}
      </TableBody>
    </Table>
  )
}
