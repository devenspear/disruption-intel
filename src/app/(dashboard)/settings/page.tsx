"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Bell, User, Key, ScrollText, Coins, TrendingUp, BarChart3 } from "lucide-react"

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

export default function SettingsPage() {
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences
        </p>
      </div>

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

              <p className="text-xs text-muted-foreground">
                * Costs are estimated based on published API pricing. Actual costs may vary.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load usage data</p>
          )}
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
  )
}
