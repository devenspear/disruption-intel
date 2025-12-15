"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Play, Pause, Trash2, RefreshCw, ExternalLink, Pencil } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Source {
  id: string
  name: string
  type: string
  url: string
  isActive: boolean
  lastChecked: string | null
  checkFrequency: string
  _count: {
    contents: number
  }
}

interface SourceCardProps {
  source: Source
  onToggleActive: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
  onCheck: (id: string) => void
  onProcess: (id: string) => void
  onEdit: (source: Source) => void
  isProcessing?: boolean
}

const sourceTypeLabels: Record<string, string> = {
  YOUTUBE_CHANNEL: "YouTube",
  PODCAST: "Podcast",
  RSS: "RSS",
  SUBSTACK: "Substack",
  TWITTER: "Twitter/X",
  MANUAL: "Manual",
}

const sourceTypeColors: Record<string, string> = {
  YOUTUBE_CHANNEL: "bg-red-600 text-white hover:bg-red-700",
  PODCAST: "bg-purple-600 text-white hover:bg-purple-700",
  RSS: "bg-amber-500 text-black hover:bg-amber-600",
  SUBSTACK: "bg-orange-500 text-white hover:bg-orange-600",
  TWITTER: "bg-sky-500 text-white hover:bg-sky-600",
  MANUAL: "bg-slate-600 text-white hover:bg-slate-700",
}

export function SourceCard({ source, onToggleActive, onDelete, onCheck, onProcess, onEdit, isProcessing }: SourceCardProps) {
  return (
    <Card className="relative aspect-square flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight line-clamp-2">{source.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={sourceTypeColors[source.type]}>
                {sourceTypeLabels[source.type] || source.type}
              </Badge>
              {!source.isActive && (
                <Badge variant="outline" className="text-muted-foreground">
                  Paused
                </Badge>
              )}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(source)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCheck(source.id)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(source.id, !source.isActive)}>
                {source.isActive ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Source
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(source.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 justify-end space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-medium">{source._count.contents} items</span>
          <span className="text-xs">
            {source.lastChecked
              ? `Last checked ${formatDistanceToNow(new Date(source.lastChecked))} ago`
              : "Never checked"}
          </span>
        </div>
        <Button
          className="w-full"
          onClick={() => onProcess(source.id)}
          disabled={isProcessing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          {isProcessing ? "Processing..." : "Process Now"}
        </Button>
      </CardContent>
    </Card>
  )
}
