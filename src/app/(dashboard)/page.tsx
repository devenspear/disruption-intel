"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Radio,
  FileText,
  Brain,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  Activity,
  BarChart3,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface DashboardStats {
  totalSources: number
  activeSources: number
  totalContent: number
  analyzedContent: number
  processingContent: number
  pendingContent: number
  failedContent: number
  totalAnalyses: number
  avgRelevanceScore: number
  recentContent: Array<{
    id: string
    title: string
    sourceName: string
    publishedAt: string
    status: string
  }>
  recentAnalyses: Array<{
    id: string
    contentId: string
    contentTitle: string
    model: string
    relevanceScore: number | null
    tokensUsed: number
    processingTime: number
    createdAt: string
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard/stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        } else {
          setError("Failed to load dashboard data")
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err)
        setError("Failed to connect to server")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-500/80",
    PROCESSING: "bg-blue-500/80",
    ANALYZED: "bg-green-500/80",
    FAILED: "bg-red-500/80",
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-medium">{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  const contentProgress = stats?.totalContent
    ? Math.round((stats.analyzedContent / stats.totalContent) * 100)
    : 0

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 -mx-8 px-8 border-b">
        <div className="py-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Disruption Intelligence Engine Overview
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 space-y-6 pt-4">
        {/* Primary Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Content
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalContent || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Analyzed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-500">
                  {stats?.analyzedContent || 0}
                </div>
                <Progress value={contentProgress} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {contentProgress}% complete
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processing
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-blue-500">
                {stats?.processingContent || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Relevance
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.avgRelevanceScore
                  ? `${(stats.avgRelevanceScore * 100).toFixed(0)}%`
                  : "N/A"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/sources">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Sources
              </CardTitle>
              <Radio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{stats?.activeSources || 0}</span>
                  <span className="text-sm text-muted-foreground">/ {stats?.totalSources || 0}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/content?status=PENDING">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Analysis
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-yellow-500">
                  {stats?.pendingContent || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Analyses
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalAnalyses || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content Panels */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Content */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Content</CardTitle>
              <CardDescription className="text-xs">Latest from your sources</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/content" className="text-xs">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : stats?.recentContent && stats.recentContent.length > 0 ? (
              <div className="space-y-2">
                {stats.recentContent.map((content) => (
                  <Link
                    key={content.id}
                    href={`/content/${content.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1 mr-3">
                      <p className="text-sm font-medium truncate">{content.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {content.sourceName} • {formatDistanceToNow(new Date(content.publishedAt))} ago
                      </p>
                    </div>
                    <Badge className={`${statusColors[content.status]} text-xs shrink-0`}>
                      {content.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No content yet</p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/sources">Add Source</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Analyses */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Analyses</CardTitle>
              <CardDescription className="text-xs">Latest AI analysis results</CardDescription>
            </div>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : stats?.recentAnalyses && stats.recentAnalyses.length > 0 ? (
              <div className="space-y-2">
                {stats.recentAnalyses.map((analysis) => (
                  <Link
                    key={analysis.id}
                    href={`/content/${analysis.contentId}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1 mr-3">
                      <p className="text-sm font-medium truncate">{analysis.contentTitle}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {analysis.model.includes("gpt") ? "GPT-4o" :
                           analysis.model.includes("claude") ? "Claude" : analysis.model}
                        </Badge>
                        <span>{formatDistanceToNow(new Date(analysis.createdAt))} ago</span>
                      </div>
                    </div>
                    {analysis.relevanceScore && (
                      <Badge
                        variant={analysis.relevanceScore > 0.7 ? "default" : "secondary"}
                        className="text-xs shrink-0"
                      >
                        {(analysis.relevanceScore * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Brain className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No analyses yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fetch transcripts and run analysis to see results
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/sources">
                <Radio className="h-4 w-4 mr-1.5" />
                Add Source
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/content">
                <FileText className="h-4 w-4 mr-1.5" />
                View Content
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/search">
                <Zap className="h-4 w-4 mr-1.5" />
                Search
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/logs">
                <Activity className="h-4 w-4 mr-1.5" />
                View Logs
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
