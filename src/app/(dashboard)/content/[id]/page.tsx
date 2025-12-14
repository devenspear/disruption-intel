"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TranscriptViewer } from "@/components/content/transcript-viewer"
import { AnalysisDisplay } from "@/components/analysis/analysis-display"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  ExternalLink,
  Brain,
  Clock,
  FileText,
  Tag,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { toast } from "sonner"

interface TranscriptSegment {
  start: number
  duration?: number
  end?: number
  text: string
}

interface ContentDetail {
  id: string
  title: string
  description: string | null
  publishedAt: string
  duration: number | null
  thumbnailUrl: string | null
  originalUrl: string
  externalId: string
  status: string
  source: {
    id: string
    name: string
    type: string
  }
  transcript: {
    id: string
    fullText: string
    segments: TranscriptSegment[]
    wordCount: number
    language: string
    source: string
  } | null
  analyses: Array<{
    id: string
    model: string
    summary: string
    keyInsights: string[]
    quotableLines: string[]
    relevanceScore: number | null
    result: Record<string, unknown>
    tokensUsed: number
    processingTime: number
    createdAt: string
    prompt: {
      name: string
    }
  }>
  tags: Array<{
    id: string
    name: string
    color: string | null
  }>
  usageHistory: Array<{
    id: string
    destination: string
    notes: string | null
    usedAt: string
  }>
}

interface TranscriptDebug {
  videoId: string
  timestamp: string
  itemCount: number | null
  errorType: string | null
  errorMessage: string | null
}

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [content, setContent] = useState<ContentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false)
  const [transcriptError, setTranscriptError] = useState<string | null>(null)
  const [transcriptDebug, setTranscriptDebug] = useState<TranscriptDebug | null>(null)

  const fetchContent = async () => {
    try {
      const res = await fetch(`/api/content/${id}`)
      if (res.ok) {
        const data = await res.json()
        setContent(data)
      } else if (res.status === 404) {
        router.push("/content")
      }
    } catch (error) {
      console.error("Failed to fetch content:", error)
      toast.error("Failed to load content")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContent()
  }, [id])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const res = await fetch(`/api/content/${id}/analyze`, {
        method: "POST",
      })
      if (res.ok) {
        toast.success("Analysis triggered")
        // Poll for updates
        setTimeout(fetchContent, 3000)
      } else {
        toast.error("Failed to trigger analysis")
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFetchTranscript = async () => {
    setIsFetchingTranscript(true)
    setTranscriptError(null)
    setTranscriptDebug(null)

    try {
      const res = await fetch(`/api/content/${id}/transcript`, {
        method: "POST",
      })
      const data = await res.json()

      if (data.debug) {
        setTranscriptDebug(data.debug)
      }

      if (data.success) {
        toast.success(`Transcript fetched: ${data.transcript?.wordCount || 0} words`)
        fetchContent()
      } else {
        setTranscriptError(data.error || "Failed to fetch transcript")
        toast.error(data.error || "Failed to fetch transcript")
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Network error"
      setTranscriptError(errMsg)
      toast.error(errMsg)
    } finally {
      setIsFetchingTranscript(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Content not found</p>
        <Button asChild className="mt-4">
          <Link href="/content">Back to Content</Link>
        </Button>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-500",
    PROCESSING: "bg-blue-500",
    ANALYZED: "bg-green-500",
    FAILED: "bg-red-500",
    ARCHIVED: "bg-gray-500",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/content">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Content
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{content.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline">{content.source.name}</Badge>
            <Badge className={statusColors[content.status]}>{content.status}</Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(content.publishedAt))} ago
            </span>
            {content.transcript && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {content.transcript.wordCount.toLocaleString()} words
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a
              href={content.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Original
            </a>
          </Button>
          <Button onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Brain className="mr-2 h-4 w-4" />
            )}
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </Button>
        </div>
      </div>

      {/* Tags */}
      {content.tags.length > 0 && (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {content.tags.map((tag) => (
            <Badge key={tag.id} variant="secondary">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Transcript */}
        <Card className="h-[700px] flex flex-col">
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {content.transcript ? (
              <TranscriptViewer
                segments={content.transcript.segments}
                fullText={content.transcript.fullText}
                videoId={content.externalId}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-4">
                <p className="text-muted-foreground">
                  No transcript available
                </p>
                <Button onClick={handleFetchTranscript} disabled={isFetchingTranscript}>
                  {isFetchingTranscript ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    "Fetch Transcript"
                  )}
                </Button>

                {/* Error Display */}
                {transcriptError && (
                  <div className="w-full max-w-md p-4 bg-red-950 border border-red-800 rounded-lg text-left">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-red-400">Transcript Error</p>
                        <p className="text-sm text-red-300">{transcriptError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Debug Info */}
                {transcriptDebug && (
                  <div className="w-full max-w-md p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-left">
                    <p className="text-xs font-medium text-zinc-400 mb-2">Debug Info</p>
                    <div className="space-y-1 text-xs font-mono text-zinc-500">
                      <p>Video ID: {transcriptDebug.videoId}</p>
                      <p>Timestamp: {transcriptDebug.timestamp}</p>
                      <p>Items Found: {transcriptDebug.itemCount ?? "N/A"}</p>
                      {transcriptDebug.errorType && (
                        <p className="text-red-400">Error Type: {transcriptDebug.errorType}</p>
                      )}
                      {transcriptDebug.errorMessage && (
                        <p className="text-red-400 break-all">Error: {transcriptDebug.errorMessage}</p>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-zinc-600">
                  Video ID: {content.externalId}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Analysis */}
        <div className="space-y-6">
          <AnalysisDisplay
            analyses={content.analyses}
            onReanalyze={handleAnalyze}
          />

          {/* Usage History */}
          {content.usageHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usage History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {content.usageHistory.map((usage) => (
                    <div
                      key={usage.id}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <div>
                        <p className="font-medium">{usage.destination}</p>
                        {usage.notes && (
                          <p className="text-sm text-muted-foreground">
                            {usage.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(usage.usedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
