"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MessageSquare,
  Bell,
  User,
  Key,
  ScrollText,
  Coins,
  TrendingUp,
  BarChart3,
  Database,
  Radio,
  FileText,
  Brain,
  Tag,
  RefreshCw,
  Clock,
  Trash2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Info,
  CheckCircle2,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface UsageStats {
  thisMonth: {
    tokens: number
    cost: number
    count: number
    period: { start: string; end: string }
  }
  lastMonth: {
    tokens: number
    cost: number
    count: number
  }
  allTime: {
    tokens: number
    cost: number
    count: number
  }
  byModel: Record<string, { tokens: number; cost: number; count: number }>
}

interface DatabaseStats {
  counts: {
    sources: number
    content: number
    transcripts: number
    analyses: number
    tags: number
    prompts: number
    usageRecords: number
    jobs: number
  }
  contentByStatus: Record<string, number>
  sourcesByType: Record<string, number>
  recentAnalyses: Array<{
    id: string
    model: string
    tokensUsed: number
    processingTime: number
    createdAt: string
    content: { id: string; title: string }
  }>
  recentContent: Array<{
    id: string
    title: string
    status: string
    createdAt: string
    source: { name: string; type: string }
  }>
  recentTranscripts: Array<{
    id: string
    wordCount: number
    source: string
    language: string
    createdAt: string
    content: { id: string; title: string }
  }>
  tokenStats: {
    total: number
    average: number
    count: number
  }
  topTags: Array<{
    id: string
    name: string
    _count: { contents: number }
  }>
  generatedAt: string
}

const settingsLinks = [
  {
    title: "Analysis Prompts",
    description: "Manage AI prompts for content analysis",
    href: "/settings/prompts",
    icon: MessageSquare,
  },
  {
    title: "System Logs",
    description: "View analysis and system activity logs",
    href: "/settings/logs",
    icon: ScrollText,
  },
  {
    title: "Profile",
    description: "Manage your account settings",
    href: "/settings/profile",
    icon: User,
    disabled: true,
  },
  {
    title: "Notifications",
    description: "Configure notification preferences",
    href: "/settings/notifications",
    icon: Bell,
    disabled: true,
  },
  {
    title: "API Keys",
    description: "Manage API keys and integrations",
    href: "/settings/api-keys",
    icon: Key,
    disabled: true,
  },
]

interface PurgeStats {
  wouldPurge: { transcripts: number; logs: number }
  totals: { transcripts: number; logs: number }
  cutoffDate: string
  retentionDays: number
}

export default function SettingsPage() {
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDb, setIsLoadingDb] = useState(true)
  const [retentionDays, setRetentionDays] = useState("30")
  const [purgeStats, setPurgeStats] = useState<PurgeStats | null>(null)
  const [isLoadingPurge, setIsLoadingPurge] = useState(false)
  const [isPurging, setIsPurging] = useState(false)

  // Load settings and purge stats
  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        if (data.settings?.retentionDays) {
          setRetentionDays(data.settings.retentionDays)
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    }
  }

  const fetchPurgeStats = async (days: string) => {
    setIsLoadingPurge(true)
    try {
      const res = await fetch(`/api/purge?days=${days}`)
      if (res.ok) {
        const data = await res.json()
        setPurgeStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch purge stats:", error)
    } finally {
      setIsLoadingPurge(false)
    }
  }

  const handleRetentionChange = async (value: string) => {
    setRetentionDays(value)
    // Save setting
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "retentionDays", value }),
      })
      toast.success("Retention period updated")
    } catch (error) {
      console.error("Failed to save setting:", error)
      toast.error("Failed to save setting")
    }
    // Refresh purge stats
    fetchPurgeStats(value)
  }

  const handlePurgeNow = async () => {
    if (!confirm(`This will permanently delete transcripts and logs older than ${retentionDays} days. This action cannot be undone. Continue?`)) {
      return
    }

    setIsPurging(true)
    try {
      const res = await fetch("/api/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays: parseInt(retentionDays) }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(
          `Purged ${data.purged.transcripts} transcripts and ${data.purged.logs} logs`
        )
        fetchPurgeStats(retentionDays)
        fetchDbStats() // Refresh database stats
      } else {
        toast.error("Failed to purge data")
      }
    } catch (error) {
      console.error("Failed to purge:", error)
      toast.error("Failed to purge data")
    } finally {
      setIsPurging(false)
    }
  }

  useEffect(() => {
    fetchSettings()
    fetchPurgeStats("30")
  }, [])

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch("/api/stats/usage")
        if (res.ok) {
          const data = await res.json()
          setUsage(data)
        }
      } catch (error) {
        console.error("Failed to fetch usage:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUsage()
  }, [])

  const fetchDbStats = async () => {
    setIsLoadingDb(true)
    try {
      const res = await fetch("/api/stats/database")
      if (res.ok) {
        const data = await res.json()
        setDbStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch database stats:", error)
    } finally {
      setIsLoadingDb(false)
    }
  }

  useEffect(() => {
    fetchDbStats()
  }, [])

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(2)}M`
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`
    }
    return tokens.toString()
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(2)}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 -mx-8 px-8 border-b">
        <div className="py-4">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application preferences
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 space-y-6 pt-4">
        {/* API Usage Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            API Usage & Costs
          </CardTitle>
          <CardDescription>
            Token usage and estimated costs for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : usage ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm font-medium">This Month</span>
                  </div>
                  <p className="text-2xl font-bold">{formatTokens(usage.thisMonth.tokens)}</p>
                  <p className="text-sm text-muted-foreground">tokens used</p>
                  <p className="text-lg font-semibold text-primary mt-1">
                    {formatCost(usage.thisMonth.cost)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usage.thisMonth.count} analyses
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Last Month</span>
                  </div>
                  <p className="text-2xl font-bold">{formatTokens(usage.lastMonth.tokens)}</p>
                  <p className="text-sm text-muted-foreground">tokens used</p>
                  <p className="text-lg font-semibold text-muted-foreground mt-1">
                    {formatCost(usage.lastMonth.cost)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usage.lastMonth.count} analyses
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Coins className="h-4 w-4" />
                    <span className="text-sm font-medium">All Time</span>
                  </div>
                  <p className="text-2xl font-bold">{formatTokens(usage.allTime.tokens)}</p>
                  <p className="text-sm text-muted-foreground">tokens used</p>
                  <p className="text-lg font-semibold text-emerald-500 mt-1">
                    {formatCost(usage.allTime.cost)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usage.allTime.count} analyses
                  </p>
                </div>
              </div>

              {/* Usage by Model */}
              {Object.keys(usage.byModel).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">This Month by Model</h4>
                  <div className="space-y-2">
                    {Object.entries(usage.byModel).map(([model, stats]) => (
                      <div
                        key={model}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium text-sm">{model}</p>
                          <p className="text-xs text-muted-foreground">{stats.count} analyses</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatTokens(stats.tokens)}</p>
                          <p className="text-sm text-primary">{formatCost(stats.cost)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Source & Verification */}
              <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="font-medium text-blue-400">Data Source & Accuracy</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Token counts are <span className="text-foreground font-medium">actual values</span> returned
                        by the AI APIs and stored in your database. Costs are <span className="text-amber-400 font-medium">estimates</span> based
                        on published pricing ($3/1M tokens for Claude, $2.50/1M for GPT-4o).
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Verify actual billing:</p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href="https://console.anthropic.com/settings/usage"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-background border text-sm hover:bg-accent transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Anthropic Console
                        </a>
                        <a
                          href="https://platform.openai.com/usage"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-background border text-sm hover:bg-accent transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          OpenAI Dashboard
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Token counts from API responses (real data)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load usage data</p>
          )}
        </CardContent>
      </Card>

      {/* Database Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Database Overview
              </CardTitle>
              <CardDescription>
                Live view of your database records and recent activity
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDbStats}
              disabled={isLoadingDb}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingDb ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDb ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
              <Skeleton className="h-40" />
            </div>
          ) : dbStats ? (
            <div className="space-y-6">
              {/* Record Counts */}
              <div>
                <h4 className="text-sm font-medium mb-3">Record Counts</h4>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <Radio className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-2xl font-bold">{dbStats.counts.sources}</p>
                    <p className="text-xs text-muted-foreground">Sources</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <FileText className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                    <p className="text-2xl font-bold">{dbStats.counts.content}</p>
                    <p className="text-xs text-muted-foreground">Content</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <ScrollText className="h-4 w-4 mx-auto mb-1 text-green-500" />
                    <p className="text-2xl font-bold">{dbStats.counts.transcripts}</p>
                    <p className="text-xs text-muted-foreground">Transcripts</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <Brain className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                    <p className="text-2xl font-bold">{dbStats.counts.analyses}</p>
                    <p className="text-xs text-muted-foreground">Analyses</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <Tag className="h-4 w-4 mx-auto mb-1 text-pink-500" />
                    <p className="text-2xl font-bold">{dbStats.counts.tags}</p>
                    <p className="text-xs text-muted-foreground">Tags</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <MessageSquare className="h-4 w-4 mx-auto mb-1 text-cyan-500" />
                    <p className="text-2xl font-bold">{dbStats.counts.prompts}</p>
                    <p className="text-xs text-muted-foreground">Prompts</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                    <p className="text-2xl font-bold">{dbStats.counts.usageRecords}</p>
                    <p className="text-xs text-muted-foreground">Usage Logs</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <RefreshCw className="h-4 w-4 mx-auto mb-1 text-teal-500" />
                    <p className="text-2xl font-bold">{dbStats.counts.jobs}</p>
                    <p className="text-xs text-muted-foreground">Jobs</p>
                  </div>
                </div>
              </div>

              {/* Content Status Breakdown */}
              {Object.keys(dbStats.contentByStatus).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Content by Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dbStats.contentByStatus).map(([status, count]) => (
                      <Badge
                        key={status}
                        variant="secondary"
                        className={`
                          ${status === "ANALYZED" ? "bg-green-500/20 text-green-400" : ""}
                          ${status === "PENDING" ? "bg-yellow-500/20 text-yellow-400" : ""}
                          ${status === "PROCESSING" ? "bg-blue-500/20 text-blue-400" : ""}
                          ${status === "FAILED" ? "bg-red-500/20 text-red-400" : ""}
                          ${status === "ARCHIVED" ? "bg-gray-500/20 text-gray-400" : ""}
                        `}
                      >
                        {status}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources by Type */}
              {Object.keys(dbStats.sourcesByType).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Sources by Type</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dbStats.sourcesByType).map(([type, count]) => (
                      <Badge key={type} variant="outline">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Tags */}
              {dbStats.topTags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Top Tags (by usage)</h4>
                  <div className="flex flex-wrap gap-2">
                    {dbStats.topTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/20"
                      >
                        {tag.name}
                        <span className="ml-1 text-muted-foreground">({tag._count.contents})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Recent Analyses */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Analyses</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {dbStats.recentAnalyses.length > 0 ? (
                      dbStats.recentAnalyses.map((analysis) => (
                        <Link
                          key={analysis.id}
                          href={`/content/${analysis.content.id}`}
                          className="block p-2 rounded border hover:bg-accent/50 transition-colors"
                        >
                          <p className="text-sm font-medium truncate">{analysis.content.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{analysis.model}</span>
                            <span>&middot;</span>
                            <span>{formatTokens(analysis.tokensUsed)} tokens</span>
                            <span>&middot;</span>
                            <span>{formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}</span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No analyses yet</p>
                    )}
                  </div>
                </div>

                {/* Recent Content */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Content</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {dbStats.recentContent.length > 0 ? (
                      dbStats.recentContent.map((content) => (
                        <Link
                          key={content.id}
                          href={`/content/${content.id}`}
                          className="block p-2 rounded border hover:bg-accent/50 transition-colors"
                        >
                          <p className="text-sm font-medium truncate">{content.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {content.source.name}
                            </Badge>
                            <span>{content.status}</span>
                            <span>&middot;</span>
                            <span>{formatDistanceToNow(new Date(content.createdAt), { addSuffix: true })}</span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No content yet</p>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(dbStats.generatedAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load database statistics</p>
          )}
        </CardContent>
      </Card>

      {/* Data Management / Purge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Data Management
          </CardTitle>
          <CardDescription>
            Configure data retention and purge old transcripts to save storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Retention Period Setting */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Retention Period</p>
                <p className="text-sm text-muted-foreground">
                  Transcripts and logs older than this will be eligible for purging
                </p>
              </div>
              <Select value={retentionDays} onValueChange={handleRetentionChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Purge Preview */}
            <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-500">Data Purge Preview</p>
                  {isLoadingPurge ? (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Calculating...
                    </div>
                  ) : purgeStats ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Items older than {formatDistanceToNow(new Date(purgeStats.cutoffDate))} ago:
                      </p>
                      <div className="flex gap-4">
                        <div className="text-sm">
                          <span className="font-medium text-foreground">{purgeStats.wouldPurge.transcripts}</span>
                          <span className="text-muted-foreground"> / {purgeStats.totals.transcripts} transcripts</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-foreground">{purgeStats.wouldPurge.logs}</span>
                          <span className="text-muted-foreground"> / {purgeStats.totals.logs} logs</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Note: Analyses are preserved permanently. Only raw transcripts and logs are purged.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">Unable to load purge statistics</p>
                  )}
                </div>
              </div>
            </div>

            {/* Purge Button */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-medium text-destructive">Purge Now</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete old transcripts and logs. This cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handlePurgeNow}
                disabled={isPurging || !purgeStats || (purgeStats.wouldPurge.transcripts === 0 && purgeStats.wouldPurge.logs === 0)}
              >
                {isPurging ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Purging...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Purge Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Links */}
      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((item) => (
          <Card
            key={item.href}
            className={item.disabled ? "opacity-50" : "hover:bg-accent/50 transition-colors"}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {item.disabled ? (
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href={item.href}>Manage</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
    </div>
  )
}
