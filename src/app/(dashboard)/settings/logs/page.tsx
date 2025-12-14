"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface LogEntry {
  id: string
  level: "DEBUG" | "INFO" | "WARN" | "ERROR"
  category: string
  action: string
  message: string
  contentId: string | null
  metadata: Record<string, unknown> | null
  duration: number | null
  createdAt: string
}

interface LogsResponse {
  logs: LogEntry[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

const levelColors = {
  DEBUG: "bg-gray-500",
  INFO: "bg-blue-500",
  WARN: "bg-yellow-500",
  ERROR: "bg-red-500",
}

const categoryColors: Record<string, string> = {
  analysis: "bg-purple-500",
  transcript: "bg-green-500",
  inngest: "bg-orange-500",
  api: "bg-cyan-500",
  claude: "bg-pink-500",
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>("all")
  const [level, setLevel] = useState<string>("all")
  const [contentId, setContentId] = useState<string>("")
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (category !== "all") params.set("category", category)
      if (level !== "all") params.set("level", level)
      if (contentId) params.set("contentId", contentId)
      params.set("limit", "200")

      const res = await fetch(`/api/logs?${params}`)
      const data: LogsResponse = await res.json()

      if (data.logs) {
        setLogs(data.logs)
        setTotal(data.total)
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setLoading(false)
    }
  }, [category, level, contentId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchLogs])

  const handleClearOldLogs = async () => {
    if (!confirm("Delete logs older than 7 days?")) return

    try {
      const res = await fetch("/api/logs?olderThanDays=7", { method: "DELETE" })
      const data = await res.json()
      toast.success(data.message)
      fetchLogs()
    } catch (error) {
      toast.error("Failed to clear logs")
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const uniqueCategories = [...new Set(logs.map((l) => l.category))]

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">System Logs</h1>
          <p className="text-muted-foreground">
            View analysis and system activity logs ({total} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearOldLogs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Old
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shrink-0 mb-4">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Level:</span>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="DEBUG">Debug</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARN">Warn</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Category:</span>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {uniqueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Content ID:</span>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 w-[200px]"
                  placeholder="Filter by content..."
                  value={contentId}
                  onChange={(e) => setContentId(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-3 shrink-0">
          <CardTitle className="text-sm font-medium">
            Recent Logs ({logs.length} shown)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No logs found</div>
            ) : (
              <div className="divide-y">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 hover:bg-accent/30 cursor-pointer ${
                      log.level === "ERROR" ? "bg-red-500/5" : ""
                    }`}
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Badge
                        className={`${levelColors[log.level]} text-white text-xs shrink-0`}
                      >
                        {log.level}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`${categoryColors[log.category] || "bg-gray-500"} text-white text-xs shrink-0`}
                      >
                        {log.category}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-primary">
                            {log.action}
                          </span>
                          {log.duration && (
                            <span className="text-xs text-muted-foreground">
                              ({log.duration}ms)
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {log.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt))} ago
                        </span>
                        {expandedLogs.has(log.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {expandedLogs.has(log.id) && (
                      <div className="mt-3 p-3 bg-accent/50 rounded-lg space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">ID:</span>{" "}
                            <span className="font-mono text-xs">{log.id}</span>
                          </div>
                          {log.contentId && (
                            <div>
                              <span className="text-muted-foreground">Content ID:</span>{" "}
                              <span className="font-mono text-xs">{log.contentId}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Time:</span>{" "}
                            <span>{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-sm">Message:</span>
                          <p className="text-sm mt-1">{log.message}</p>
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div>
                            <span className="text-muted-foreground text-sm">Metadata:</span>
                            <pre className="text-xs mt-1 p-2 bg-background rounded overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
