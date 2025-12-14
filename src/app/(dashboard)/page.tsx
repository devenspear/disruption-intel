"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Radio, FileText, Brain, AlertCircle, ArrowRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface DashboardStats {
  totalSources: number
  activeSources: number
  totalContent: number
  pendingAnalysis: number
  recentContent: Array<{
    id: string
    title: string
    sourceName: string
    publishedAt: string
    status: string
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard/stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: "Active Sources",
      value: stats?.activeSources ?? 0,
      total: stats?.totalSources ?? 0,
      icon: Radio,
      href: "/sources",
    },
    {
      title: "Total Content",
      value: stats?.totalContent ?? 0,
      icon: FileText,
      href: "/content",
    },
    {
      title: "Pending Analysis",
      value: stats?.pendingAnalysis ?? 0,
      icon: Brain,
      href: "/content?status=PENDING",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Disruption Intelligence Engine
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {stat.value}
                    {stat.total !== undefined && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}/ {stat.total}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Content</CardTitle>
            <CardDescription>Latest ingested content from your sources</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/content">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : stats?.recentContent && stats.recentContent.length > 0 ? (
            <div className="space-y-4">
              {stats.recentContent.map((content) => (
                <Link
                  key={content.id}
                  href={`/content/${content.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium line-clamp-1">{content.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {content.sourceName} • {formatDistanceToNow(new Date(content.publishedAt))} ago
                    </p>
                  </div>
                  <Badge
                    variant={
                      content.status === "ANALYZED"
                        ? "default"
                        : content.status === "PENDING"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {content.status}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No content yet</p>
              <p className="text-sm text-muted-foreground">
                Add sources to start ingesting content
              </p>
              <Button className="mt-4" asChild>
                <Link href="/sources">Add Source</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
