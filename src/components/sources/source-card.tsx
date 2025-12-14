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
import { MoreVertical, Play, Pause, Trash2, RefreshCw, ExternalLink } from "lucide-react"
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
}

const sourceTypeLabels: Record<string, string> = {
  YOUTUBE_CHANNEL: "YouTube",
  PODCAST: "Podcast",
  RSS: "RSS",
  MANUAL: "Manual",
}

const sourceTypeColors: Record<string, string> = {
  YOUTUBE_CHANNEL: "bg-red-500",
  PODCAST: "bg-purple-500",
  RSS: "bg-orange-500",
  MANUAL: "bg-blue-500",
}

export function SourceCard({ source, onToggleActive, onDelete, onCheck }: SourceCardProps) {
  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{source.name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
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
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{source._count.contents} items</span>
          <span>
            {source.lastChecked
              ? `Last checked ${formatDistanceToNow(new Date(source.lastChecked))} ago`
              : "Never checked"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
