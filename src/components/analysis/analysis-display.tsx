"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Check, ChevronDown, ChevronUp, Sparkles, Lightbulb, Quote, Zap, Brain } from "lucide-react"
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
    quotes: true,
    signals: true,
  })

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  if (analyses.length === 0) {
    return (
      <Card className="h-full flex flex-col items-center justify-center">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Brain className="h-12 w-12 text-muted-foreground/50 mb-4" />
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

  const modelDisplay = latestAnalysis.model.includes("gpt") ? "GPT-4o" :
    latestAnalysis.model.includes("claude") ? "Claude Sonnet" : latestAnalysis.model

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 px-4 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold">AI Analysis</CardTitle>
            {latestAnalysis.relevanceScore && (
              <Badge
                variant={latestAnalysis.relevanceScore > 0.7 ? "default" : "secondary"}
                className="text-xs"
              >
                {(latestAnalysis.relevanceScore * 100).toFixed(0)}% Relevance
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">{modelDisplay}</Badge>
            <span>{formatDistanceToNow(new Date(latestAnalysis.createdAt))} ago</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Summary Section */}
            <section>
              <button
                className="flex items-center justify-between w-full text-left mb-2"
                onClick={() => toggleSection("summary")}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Executive Summary</h3>
                </div>
                {expandedSections.summary ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedSections.summary && (
                <div className="pl-6">
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                    {latestAnalysis.summary}
                  </p>
                </div>
              )}
            </section>

            {/* Key Insights Section */}
            {latestAnalysis.keyInsights.length > 0 && (
              <section>
                <button
                  className="flex items-center justify-between w-full text-left mb-2"
                  onClick={() => toggleSection("insights")}
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <h3 className="font-semibold text-sm">Key Insights ({latestAnalysis.keyInsights.length})</h3>
                  </div>
                  {expandedSections.insights ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.insights && (
                  <div className="pl-6 space-y-2">
                    {latestAnalysis.keyInsights.map((insight, index) => (
                      <div key={index} className="flex gap-3 text-sm">
                        <span className="text-primary font-semibold shrink-0">{index + 1}.</span>
                        <span className="text-foreground/90 leading-relaxed">{insight}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Disruption Signals */}
            {disruptionSignals && disruptionSignals.length > 0 && (
              <section>
                <button
                  className="flex items-center justify-between w-full text-left mb-2"
                  onClick={() => toggleSection("signals")}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    <h3 className="font-semibold text-sm">Disruption Signals ({disruptionSignals.length})</h3>
                  </div>
                  {expandedSections.signals ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.signals && (
                  <div className="pl-6 space-y-2">
                    {disruptionSignals.map((signal, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border bg-accent/20"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{signal.signal}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {signal.sector}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <Badge variant="outline" className="text-xs px-1.5 py-0">{signal.timeframe}</Badge>
                            <Badge
                              className="text-xs px-1.5 py-0"
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
                )}
              </section>
            )}

            {/* Quotable Lines Section */}
            {latestAnalysis.quotableLines.length > 0 && (
              <section>
                <button
                  className="flex items-center justify-between w-full text-left mb-2"
                  onClick={() => toggleSection("quotes")}
                >
                  <div className="flex items-center gap-2">
                    <Quote className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold text-sm">Quotable Lines ({latestAnalysis.quotableLines.length})</h3>
                  </div>
                  {expandedSections.quotes ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.quotes && (
                  <div className="pl-6 space-y-2">
                    {latestAnalysis.quotableLines.map((quote, index) => (
                      <QuoteLine key={index} quote={quote} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Categories */}
            {categories && categories.length > 0 && (
              <section className="pt-2 border-t">
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((category) => (
                    <Badge key={category} variant="secondary" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Analysis History Link */}
            {analyses.length > 1 && (
              <section className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  {analyses.length} previous analyses available
                </p>
              </section>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
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
    <div className="flex items-start gap-2 p-2.5 rounded-lg border bg-accent/20 group">
      <blockquote className="flex-1 text-sm italic text-foreground/90 leading-relaxed">"{quote}"</blockquote>
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0"
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
