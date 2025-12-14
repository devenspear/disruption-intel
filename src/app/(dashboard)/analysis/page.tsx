"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Brain,
  TrendingUp,
  Building2,
  Cpu,
  Lightbulb,
  AlertTriangle,
  Loader2,
  Calendar,
  BarChart3,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

interface ExecutiveBriefing {
  executiveSummary: string
  macroTrends: Array<{ trend: string; evidence: string; implication: string }>
  keyDevelopments: Array<{ development: string; significance: string }>
  companiesInFocus: Array<{ name: string; context: string }>
  technologiesInFocus: Array<{ name: string; context: string }>
  strategicInsights: string[]
  emergingPatterns: string[]
}

interface SummaryResponse {
  success: boolean
  period: { days: number; startDate: string; endDate: string }
  analysisCount: number
  executiveBriefing: ExecutiveBriefing
  usage: { inputTokens: number; outputTokens: number }
  error?: string
}

export default function AnalysisPage() {
  const [days, setDays] = useState("7")
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<SummaryResponse | null>(null)

  const generateSummary = async () => {
    setIsLoading(true)
    setSummary(null)

    try {
      const res = await fetch("/api/analysis/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: parseInt(days) }),
      })

      const data = await res.json()

      if (data.success) {
        setSummary(data)
        toast.success("Executive briefing generated")
      } else {
        toast.error(data.error || "Failed to generate summary")
      }
    } catch (error) {
      console.error("Failed to generate summary:", error)
      toast.error("Failed to generate summary")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analysis Summary</h1>
          <p className="text-muted-foreground">
            Generate executive briefings from your analyzed content
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Generate Executive Briefing
          </CardTitle>
          <CardDescription>
            Synthesize all analyses from a time period into macro trends and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Time period:</span>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateSummary} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Briefing
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-60" />
            <Skeleton className="h-60" />
          </div>
        </div>
      )}

      {/* Results */}
      {summary?.success && summary.executiveBriefing && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <BarChart3 className="h-3 w-3" />
              {summary.analysisCount} analyses
            </Badge>
            <span>
              Period: {new Date(summary.period.startDate).toLocaleDateString()} - {new Date(summary.period.endDate).toLocaleDateString()}
            </span>
            <span className="ml-auto">
              Tokens: {summary.usage.inputTokens.toLocaleString()} in / {summary.usage.outputTokens.toLocaleString()} out
            </span>
          </div>

          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {summary.executiveBriefing.executiveSummary?.split('\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Macro Trends */}
          {summary.executiveBriefing.macroTrends?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Macro Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.executiveBriefing.macroTrends.map((trend, i) => (
                    <div key={i} className="p-4 rounded-lg border bg-card">
                      <h4 className="font-semibold text-primary mb-2">{trend.trend}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">Evidence:</span> {trend.evidence}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Implication:</span> {trend.implication}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Developments */}
          {summary.executiveBriefing.keyDevelopments?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Key Developments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.executiveBriefing.keyDevelopments.map((dev, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium">{dev.development}</p>
                        <p className="text-sm text-muted-foreground mt-1">{dev.significance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Companies & Technologies */}
          <div className="grid gap-6 md:grid-cols-2">
            {summary.executiveBriefing.companiesInFocus?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    Companies in Focus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.executiveBriefing.companiesInFocus.map((company, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Badge variant="secondary">{company.name}</Badge>
                        <span className="text-sm text-muted-foreground">{company.context}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {summary.executiveBriefing.technologiesInFocus?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-purple-500" />
                    Technologies in Focus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.executiveBriefing.technologiesInFocus.map((tech, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Badge variant="outline">{tech.name}</Badge>
                        <span className="text-sm text-muted-foreground">{tech.context}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Strategic Insights & Emerging Patterns */}
          <div className="grid gap-6 md:grid-cols-2">
            {summary.executiveBriefing.strategicInsights?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Strategic Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summary.executiveBriefing.strategicInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {summary.executiveBriefing.emergingPatterns?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Emerging Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summary.executiveBriefing.emergingPatterns.map((pattern, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-500 mt-1">•</span>
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Regenerate Button */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={generateSummary} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate Briefing
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
