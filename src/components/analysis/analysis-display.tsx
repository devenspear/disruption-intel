"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface Analysis {
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
}

interface AnalysisDisplayProps {
  analyses: Analysis[]
  onReanalyze?: () => void
}

interface ExpandedSections {
  summary: boolean
  insights: boolean
  quotes: boolean
  signals: boolean
}

export function AnalysisDisplay({ analyses, onReanalyze }: AnalysisDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    summary: true,
    insights: true,
    quotes: false,
    signals: false,
  })

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No analysis available</p>
          {onReanalyze && (
            <Button onClick={onReanalyze}>Run Analysis</Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const latestAnalysis = analyses[0]
  const result = latestAnalysis.result as Record<string, unknown>

  // Extract typed values from result for safe JSX rendering
  const disruptionSignals = Array.isArray(result.disruptionSignals)
    ? (result.disruptionSignals as Array<{
        signal: string
        sector: string
        timeframe: string
        confidence: string
      }>)
    : null

  const categories = Array.isArray(result.categories)
    ? (result.categories as string[])
    : null

  return (
    <Tabs defaultValue="latest" className="space-y-4">
      <TabsList>
        <TabsTrigger value="latest">Latest Analysis</TabsTrigger>
        {analyses.length > 1 && (
          <TabsTrigger value="history">History ({analyses.length})</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="latest" className="space-y-4">
        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Badge variant="secondary">{latestAnalysis.prompt.name}</Badge>
          <span>{latestAnalysis.model}</span>
          <span>{formatDistanceToNow(new Date(latestAnalysis.createdAt))} ago</span>
          {latestAnalysis.relevanceScore && (
            <Badge
              variant={latestAnalysis.relevanceScore > 0.7 ? "default" : "secondary"}
            >
              {(latestAnalysis.relevanceScore * 100).toFixed(0)}% Relevance
            </Badge>
          )}
        </div>

        {/* Summary Section */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => toggleSection("summary")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Summary</CardTitle>
              {expandedSections.summary ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
          {expandedSections.summary && (
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {latestAnalysis.summary}
              </p>
            </CardContent>
          )}
        </Card>

        {/* Key Insights Section */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => toggleSection("insights")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Key Insights ({latestAnalysis.keyInsights.length})
              </CardTitle>
              {expandedSections.insights ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
          {expandedSections.insights && (
            <CardContent>
              <ul className="space-y-2">
                {latestAnalysis.keyInsights.map((insight, index) => (
                  <li key={index} className="flex gap-2 text-sm">
                    <span className="text-primary font-medium">{index + 1}.</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>

        {/* Quotable Lines Section */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => toggleSection("quotes")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Quotable Lines ({latestAnalysis.quotableLines.length})
              </CardTitle>
              {expandedSections.quotes ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
          {expandedSections.quotes && (
            <CardContent>
              <div className="space-y-3">
                {latestAnalysis.quotableLines.map((quote, index) => (
                  <QuoteLine key={index} quote={quote} />
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Disruption Signals */}
        {disruptionSignals && disruptionSignals.length > 0 && (
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("signals")}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Disruption Signals ({disruptionSignals.length})
                </CardTitle>
                {expandedSections.signals ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
            {expandedSections.signals && (
              <CardContent>
                <div className="space-y-4">
                  {disruptionSignals.map((signal, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border bg-accent/30"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{signal.signal}</p>
                          <p className="text-sm text-muted-foreground">
                            {signal.sector}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{signal.timeframe}</Badge>
                          <Badge
                            variant={
                              signal.confidence === "High"
                                ? "default"
                                : signal.confidence === "Medium"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {signal.confidence}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Categories */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="history">
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {analysis.prompt.name}
                    </CardTitle>
                    <CardDescription>
                      {formatDistanceToNow(new Date(analysis.createdAt))} ago
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm line-clamp-3">{analysis.summary}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{analysis.model}</Badge>
                    {analysis.relevanceScore && (
                      <Badge variant="secondary">
                        {(analysis.relevanceScore * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}

function QuoteLine({ quote }: { quote: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(quote)
    setCopied(true)
    toast.success("Quote copied")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-accent/30 group">
      <blockquote className="flex-1 text-sm italic">"{quote}"</blockquote>
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 h-6 w-6"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}
