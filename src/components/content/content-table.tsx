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
import { MoreHorizontal, ExternalLink, Brain, Archive, Trash2 } from "lucide-react"

interface Content {
  id: string
  title: string
  publishedAt: string
  status: string
  thumbnailUrl: string | null
  originalUrl: string
  source: {
    id: string
    name: string
    type: string
  }
  transcript: {
    wordCount: number
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[400px]">Title</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Words</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Published</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contents.map((content) => (
          <TableRow key={content.id}>
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
              {content.transcript?.wordCount?.toLocaleString() || "-"}
            </TableCell>
            <TableCell>
              {content.analyses[0]?.relevanceScore
                ? `${(content.analyses[0].relevanceScore * 100).toFixed(0)}%`
                : "-"}
            </TableCell>
            <TableCell>
              {formatDistanceToNow(new Date(content.publishedAt))} ago
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
