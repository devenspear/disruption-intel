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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ExternalLink, Brain, Archive, Trash2, Video, Mic } from "lucide-react"

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
    <Table className="w-full table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">Type</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="w-[100px]">Source</TableHead>
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead className="w-[80px]">Words</TableHead>
          <TableHead className="w-[70px]">Score</TableHead>
          <TableHead className="w-[100px]">Published</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contents.map((content) => (
          <TableRow key={content.id}>
            <TableCell className="w-[50px]">
              <ContentTypeIcon type={content.contentType} sourceType={content.source.type} />
            </TableCell>
            <TableCell className="max-w-0">
              <Link
                href={`/content/${content.id}`}
                className="font-medium hover:underline truncate block"
                title={content.title}
              >
                {content.title}
              </Link>
            </TableCell>
            <TableCell className="w-[100px]">
              <Badge variant="outline" className="truncate max-w-full">{content.source.name}</Badge>
            </TableCell>
            <TableCell className="w-[100px]">
              <Badge className={statusColors[content.status]}>
                {content.status}
              </Badge>
            </TableCell>
            <TableCell className="w-[80px]">
              <span className="text-sm">{content.transcript?.wordCount?.toLocaleString() || "-"}</span>
            </TableCell>
            <TableCell className="w-[70px]">
              {content.analyses[0]?.relevanceScore
                ? `${(content.analyses[0].relevanceScore * 100).toFixed(0)}%`
                : "-"}
            </TableCell>
            <TableCell className="w-[100px] text-sm">
              {format(new Date(content.publishedAt), "MMM d, yy")}
            </TableCell>
            <TableCell className="w-[50px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
