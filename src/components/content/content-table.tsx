"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ExternalLink, Brain, Archive, Trash2, Video, Mic } from "lucide-react"
import { format } from "date-fns"

// Content type icon component
function ContentTypeIcon({ type, sourceType }: { type?: string; sourceType: string }) {
  const isPodcast = type === "PODCAST_EPISODE" || sourceType === "PODCAST"
  if (isPodcast) {
    return (
      <span title="Podcast Episode">
        <Mic className="h-4 w-4 text-purple-500 flex-shrink-0" />
      </span>
    )
  }
  return (
    <span title="Video">
      <Video className="h-4 w-4 text-red-500 flex-shrink-0" />
    </span>
  )
}

// Transcript source badge component
function TranscriptSourceBadge({ source }: { source?: string }) {
  if (!source) return null

  const sourceLabels: Record<string, { label: string; color: string }> = {
    youtube_auto: { label: "YouTube", color: "bg-red-100 text-red-700" },
    podcast_rss: { label: "RSS", color: "bg-green-100 text-green-700" },
    podcast_scraped: { label: "Scraped", color: "bg-yellow-100 text-yellow-700" },
    youtube_fallback: { label: "YT Fallback", color: "bg-orange-100 text-orange-700" },
    manual: { label: "Manual", color: "bg-blue-100 text-blue-700" },
  }

  const config = sourceLabels[source] || { label: source, color: "bg-gray-100 text-gray-700" }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${config.color}`} title={`Transcript source: ${source}`}>
      {config.label}
    </span>
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
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  PROCESSING: "bg-blue-500",
  ANALYZED: "bg-green-500",
  FAILED: "bg-red-500",
  ARCHIVED: "bg-gray-500",
}

export function ContentTable({ contents, onAnalyze, onArchive, onDelete }: ContentTableProps) {
  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">Type</TableHead>
          <TableHead className="min-w-[300px]">Title</TableHead>
          <TableHead className="w-[120px]">Source</TableHead>
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead className="w-[100px]">Words</TableHead>
          <TableHead className="w-[80px]">Score</TableHead>
          <TableHead className="w-[120px]">Published</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contents.map((content) => (
          <TableRow key={content.id}>
            <TableCell>
              <ContentTypeIcon type={content.contentType} sourceType={content.source.type} />
            </TableCell>
            <TableCell>
              <Link
                href={`/content/${content.id}`}
                className="font-medium hover:underline line-clamp-2"
              >
                {content.title}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{content.source.name}</Badge>
            </TableCell>
            <TableCell>
              <Badge className={statusColors[content.status]}>
                {content.status}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <span>{content.transcript?.wordCount?.toLocaleString() || "-"}</span>
                <TranscriptSourceBadge source={content.transcript?.source} />
              </div>
            </TableCell>
            <TableCell>
              {content.analyses[0]?.relevanceScore
                ? `${(content.analyses[0].relevanceScore * 100).toFixed(0)}%`
                : "-"}
            </TableCell>
            <TableCell>
              {format(new Date(content.publishedAt), "MMM d, yyyy")}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/content/${content.id}`}>View Details</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAnalyze(content.id)}>
                    <Brain className="mr-2 h-4 w-4" />
                    Analyze
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={content.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Original
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchive(content.id)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(content.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
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
