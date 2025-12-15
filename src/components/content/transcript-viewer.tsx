"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface TranscriptSegment {
  start: number
  duration?: number
  end?: number
  text: string
}

interface TranscriptViewerProps {
  segments: TranscriptSegment[]
  fullText: string
  videoId?: string
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

export function TranscriptViewer({ segments, fullText, videoId }: TranscriptViewerProps) {
  const [search, setSearch] = useState("")
  const [copied, setCopied] = useState(false)

  const filteredSegments = search
    ? segments.filter((s) =>
        s.text.toLowerCase().includes(search.toLowerCase())
      )
    : segments

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    toast.success("Transcript copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTimestampClick = (seconds: number) => {
    if (videoId) {
      window.open(
        `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(seconds)}`,
        "_blank"
      )
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcript..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {segments.length > 0 ? (
          <div className="space-y-2">
            {filteredSegments.map((segment, index) => (
              <div
                key={index}
                className="flex gap-3 p-2 rounded hover:bg-accent/50 group"
              >
                <button
                  onClick={() => handleTimestampClick(segment.start)}
                  className="text-xs font-mono text-primary hover:underline whitespace-nowrap"
                >
                  {formatTimestamp(segment.start)}
                </button>
                <p className="text-sm leading-relaxed">
                  {search ? (
                    <HighlightText text={segment.text} highlight={search} />
                  ) : (
                    segment.text
                  )}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6"
                  onClick={async () => {
                    await navigator.clipboard.writeText(segment.text)
                    toast.success("Segment copied")
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : fullText ? (
          <div className="p-2">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {search ? (
                <HighlightText text={fullText} highlight={search} />
              ) : (
                fullText
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No transcript content available
          </p>
        )}
      </ScrollArea>
    </div>
  )
}

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  const parts = text.split(new RegExp(`(${highlight})`, "gi"))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-500/30 text-foreground">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}
