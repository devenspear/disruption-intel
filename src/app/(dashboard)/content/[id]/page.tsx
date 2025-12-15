"use client"

import { useEffect, useState, use, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TranscriptViewer } from "@/components/content/transcript-viewer"
import { AnalysisDisplay } from "@/components/analysis/analysis-display"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  ExternalLink,
  Brain,
  Clock,
  FileText,
  Tag,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  Video,
  Mic,
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
  contentType: string | null
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

interface AnalysisStep {
  name: string
  status: "pending" | "running" | "complete" | "error"
  message?: string
}

// Helper functions for transcript source display
function getTranscriptSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    youtube_auto: "YouTube",
    podcast_rss: "RSS",
    podcast_scraped: "Scraped",
    youtube_fallback: "YT Fallback",
    manual: "Manual",
  }
  return labels[source] || source
}

function getTranscriptSourceColor(source: string): string {
  const colors: Record<string, string> = {
    youtube_auto: "bg-red-100 text-red-700",
    podcast_rss: "bg-green-100 text-green-700",
    podcast_scraped: "bg-yellow-100 text-yellow-700",
    youtube_fallback: "bg-orange-100 text-orange-700",
    manual: "bg-blue-100 text-blue-700",
  }
  return colors[source] || "bg-gray-100 text-gray-700"
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
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/${id}`)
      if (res.ok) {
        const data = await res.json()
        setContent(data)
        return data
      } else if (res.status === 404) {
        router.push("/content")
      }
    } catch (error) {
      console.error("Failed to fetch content:", error)
      toast.error("Failed to load content")
    } finally {
      setIsLoading(false)
    }
    return null
  }, [id, router])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  // Poll for analysis updates when analyzing
  useEffect(() => {
    if (!isAnalyzing) return

    const pollInterval = setInterval(async () => {
      setPollCount((prev) => prev + 1)

      // Update progress simulation while waiting
      setAnalysisProgress((prev) => Math.min(prev + 3, 90))

      const data = await fetchContent()

      if (data?.analyses?.length > 0 && data.status === "ANALYZED") {
        // Analysis complete!
        setAnalysisSteps((prev) =>
          prev.map((step) => ({ ...step, status: "complete" as const }))
        )
        setAnalysisProgress(100)
        setIsAnalyzing(false)
        toast.success("Analysis complete!")
        clearInterval(pollInterval)
      } else if (pollCount > 90) {
        // Timeout after ~3 minutes (90 * 2 seconds)
        setAnalysisError("Analysis is taking longer than expected. Check logs for details.")
        setIsAnalyzing(false)
        clearInterval(pollInterval)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [isAnalyzing, fetchContent, pollCount])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    setPollCount(0)
    setAnalysisProgress(10)

    // Initialize steps
    setAnalysisSteps([
      { name: "Preparing content", status: "running" },
      { name: "Running AI analysis", status: "pending" },
      { name: "Saving results", status: "pending" },
    ])

    try {
      const res = await fetch(`/api/content/${id}/analyze`, {
        method: "POST",
      })
      const data = await res.json()

      if (res.ok) {
        toast.info("Analysis started - this may take up to 90 seconds...")
        setAnalysisSteps((prev) =>
          prev.map((step, i) =>
            i === 0 ? { ...step, status: "complete" as const } :
            i === 1 ? { ...step, status: "running" as const } : step
          )
        )
        setAnalysisProgress(30)
        // Polling will handle the rest
      } else {
        setAnalysisError(data.error || "Failed to trigger analysis")
        toast.error(data.error || "Failed to trigger analysis")
        setIsAnalyzing(false)
        setAnalysisSteps([])
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Network error"
      setAnalysisError(errMsg)
      toast.error(errMsg)
      setIsAnalyzing(false)
      setAnalysisSteps([])
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
        if (data.analysisTriggered) {
          toast.info("Analysis started automatically - this may take up to 90 seconds...")
          setIsAnalyzing(true)
          setAnalysisProgress(10)
          setAnalysisSteps([
            { name: "Preparing content", status: "complete" },
            { name: "Running AI analysis", status: "running" },
            { name: "Saving results", status: "pending" },
          ])
        }
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
      <div className="space-y-4 p-4">
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
    PENDING: "bg-yellow-500/80",
    PROCESSING: "bg-blue-500/80",
    ANALYZED: "bg-green-500/80",
    FAILED: "bg-red-500/80",
    ARCHIVED: "bg-gray-500/80",
  }

  return (
    <div className="min-h-screen">
      {/* Compact Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href="/content" className="flex items-center gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Content</span>
                </Link>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold truncate leading-tight">{content.title}</h1>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {(content.contentType === "PODCAST_EPISODE" || content.source.type === "PODCAST") ? (
                    <span title="Podcast Episode" className="flex items-center gap-1">
                      <Mic className="h-3 w-3 text-purple-500" />
                    </span>
                  ) : (
                    <span title="Video" className="flex items-center gap-1">
                      <Video className="h-3 w-3 text-red-500" />
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs px-1.5 py-0">{content.source.name}</Badge>
                  <Badge className={`${statusColors[content.status]} text-xs px-1.5 py-0`}>
                      {content.status}
                    </Badge>
                    {content.status === "FAILED" && (
                      <span className="text-red-400 text-xs">(See details below)</span>
                    )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(content.publishedAt), "MMM d, yyyy")}
                  </span>
                  {content.transcript && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {content.transcript.wordCount.toLocaleString()} words
                      {content.transcript.source && (
                        <span className={`ml-1 text-xs px-1.5 py-0.5 rounded ${getTranscriptSourceColor(content.transcript.source)}`}>
                          {getTranscriptSourceLabel(content.transcript.source)}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild>
                <a href={content.originalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Original</span>
                </a>
              </Button>
              <Button
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !content.transcript}
                className="min-w-[100px]"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span className="hidden sm:inline">Analyzing</span>
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Analyze</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Tags row */}
          {content.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {content.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs px-1.5 py-0">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Failure Explanation Banner */}
      {content.status === "FAILED" && (
        <div className="mx-4 mt-4 p-4 bg-red-950/30 border border-red-800/50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h3 className="font-medium text-red-300">Content Processing Failed</h3>
              <p className="text-sm text-red-300/80">
                This content could not be processed. Common reasons include:
              </p>
              <ul className="text-sm text-red-300/70 list-disc list-inside space-y-1">
                <li>Transcript not available or could not be fetched</li>
                <li>Source URL is invalid or has changed</li>
                <li>Content is private, age-restricted, or region-locked</li>
                <li>Rate limiting from the source platform</li>
                <li>Network or API timeout during processing</li>
              </ul>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-700 text-red-300 hover:bg-red-900/50"
                  onClick={handleFetchTranscript}
                  disabled={isFetchingTranscript}
                >
                  {isFetchingTranscript ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Retry Transcript Fetch
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-300 hover:bg-red-900/50"
                  asChild
                >
                  <Link href="/settings/logs">View System Logs</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - 1/3 + 2/3 Layout */}
      <div className="flex flex-col lg:flex-row gap-4 p-4">
        {/* Left: Transcript (1/3 width) */}
        <div className="lg:w-1/3 shrink-0">
          <Card className="h-[calc(100vh-180px)] flex flex-col">
            <CardHeader className="py-2 px-3 border-b shrink-0">
              <CardTitle className="text-sm font-medium">Transcript</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {content.transcript ? (
                <TranscriptViewer
                  segments={content.transcript.segments}
                  fullText={content.transcript.fullText}
                  videoId={content.externalId}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">No transcript available</p>
                  <Button size="sm" onClick={handleFetchTranscript} disabled={isFetchingTranscript}>
                    {isFetchingTranscript ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                        Fetching...
                      </>
                    ) : (
                      "Fetch Transcript"
                    )}
                  </Button>

                  {transcriptError && (
                    <div className="w-full max-w-sm p-3 bg-red-950/50 border border-red-800/50 rounded-lg text-left">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-red-400">Error</p>
                          <p className="text-xs text-red-300">{transcriptError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {transcriptDebug && (
                    <div className="w-full max-w-sm p-3 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-left">
                      <p className="text-xs font-medium text-zinc-400 mb-1">Debug</p>
                      <div className="space-y-0.5 text-xs font-mono text-zinc-500">
                        <p>Video: {transcriptDebug.videoId}</p>
                        <p>Items: {transcriptDebug.itemCount ?? "N/A"}</p>
                        {transcriptDebug.errorType && (
                          <p className="text-red-400">Type: {transcriptDebug.errorType}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-zinc-600">ID: {content.externalId}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Analysis (2/3 width) */}
        <div className="flex-1 space-y-4">
          {/* Analysis Status Panel - shown when analyzing */}
          {(isAnalyzing || analysisError) && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Analysis in Progress
                    </>
                  ) : analysisError ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Analysis Error
                    </>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3 space-y-3">
                {isAnalyzing && (
                  <>
                    <Progress value={analysisProgress} className="h-1.5" />
                    <div className="flex items-center gap-4 text-xs">
                      {analysisSteps.map((step, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          {step.status === "complete" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          ) : step.status === "running" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          ) : step.status === "error" ? (
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-muted" />
                          )}
                          <span className={step.status === "running" ? "text-primary font-medium" : "text-muted-foreground"}>
                            {step.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Analysis typically takes 30-90 seconds. Using Claude or OpenAI as backup.
                    </p>
                  </>
                )}
                {analysisError && (
                  <div className="flex items-center justify-between p-2 bg-red-950/30 border border-red-800/30 rounded">
                    <p className="text-xs text-red-400">{analysisError}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        setAnalysisError(null)
                        setAnalysisSteps([])
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          <div className="h-[calc(100vh-180px-${(isAnalyzing || analysisError) ? '140px' : '0px'})]">
            <AnalysisDisplay
              analyses={content.analyses}
              onReanalyze={handleAnalyze}
            />
          </div>

          {/* Usage History */}
          {content.usageHistory.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm font-medium">Usage History</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3">
                <div className="space-y-1.5">
                  {content.usageHistory.map((usage) => (
                    <div
                      key={usage.id}
                      className="flex items-center justify-between p-2 rounded border text-sm"
                    >
                      <div>
                        <p className="font-medium text-sm">{usage.destination}</p>
                        {usage.notes && (
                          <p className="text-xs text-muted-foreground">{usage.notes}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
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
