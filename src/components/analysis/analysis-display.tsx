"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Copy, Check, ChevronDown, ChevronUp, Sparkles, Lightbulb, Quote, Zap, Brain, ShieldCheck, AlertTriangle, Info } from "lucide-react"
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

// Types for verified analysis format
interface VerifiedInsight {
  insight: string
  sourceText?: string
  confidence?: number
}

interface VerifiedQuote {
  quote: string
  sourcePosition?: number
  context?: string
  speaker?: string
  confidence?: number
}

interface VerifiedSignal {
  signal: string
  sector: string
  timeframe: string
  sourceText?: string
  confidence?: number | string
}

interface VerificationSummary {
  totalClaims: number
  verifiedClaims: number
  averageConfidence: number
}

// Helper to get confidence color
function getConfidenceColor(confidence: number): string {
  if (confidence >= 95) return "text-emerald-500"
  if (confidence >= 85) return "text-green-500"
  if (confidence >= 80) return "text-yellow-500"
  return "text-orange-500"
}

function getConfidenceBadgeVariant(confidence: number): "default" | "secondary" | "outline" {
  if (confidence >= 95) return "default"
  if (confidence >= 85) return "secondary"
  return "outline"
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
    ? (result.disruptionSignals as VerifiedSignal[])
    : null

  const categories = Array.isArray(result.categories)
    ? (result.categories as string[])
    : null

  // Extract verification summary if present
  const verificationSummary = result.verificationSummary as VerificationSummary | undefined

  // Check if this is a verified analysis (has confidence scores)
  const isVerifiedAnalysis = verificationSummary ||
    (Array.isArray(result.keyInsights) && result.keyInsights.length > 0 &&
      typeof result.keyInsights[0] === 'object' && 'confidence' in (result.keyInsights[0] as object))

  // Parse key insights - handle both old (string[]) and new (VerifiedInsight[]) formats
  const keyInsights: VerifiedInsight[] = Array.isArray(result.keyInsights)
    ? result.keyInsights.map((item: unknown) => {
        if (typeof item === 'string') {
          return { insight: item }
        }
        return item as VerifiedInsight
      })
    : latestAnalysis.keyInsights.map(insight => ({ insight }))

  // Parse quotable lines - handle both old (string[]) and new (VerifiedQuote[]) formats
  const quotableLines: VerifiedQuote[] = Array.isArray(result.quotableLines)
    ? result.quotableLines.map((item: unknown) => {
        if (typeof item === 'string') {
          return { quote: item }
        }
        if (typeof item === 'object' && item !== null && 'quote' in item) {
          return item as VerifiedQuote
        }
        return { quote: String(item) }
      })
    : latestAnalysis.quotableLines.map(quote => ({ quote }))

  const modelDisplay = latestAnalysis.model.includes("gpt") ? "GPT-4o" :
    latestAnalysis.model.includes("claude") ? "Claude Sonnet" : latestAnalysis.model

  return (
    <TooltipProvider>
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
            {isVerifiedAnalysis && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs gap-1 text-emerald-500 border-emerald-500/50">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Citation-based analysis with confidence scores</p>
                  {verificationSummary && (
                    <p className="text-xs text-muted-foreground">
                      {verificationSummary.verifiedClaims}/{verificationSummary.totalClaims} claims verified
                      ({verificationSummary.averageConfidence}% avg confidence)
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
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
            {keyInsights.length > 0 && (
              <section>
                <button
                  className="flex items-center justify-between w-full text-left mb-2"
                  onClick={() => toggleSection("insights")}
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <h3 className="font-semibold text-sm">Key Insights ({keyInsights.length})</h3>
                  </div>
                  {expandedSections.insights ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.insights && (
                  <div className="pl-6 space-y-3">
                    {keyInsights.map((item, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex gap-3 items-start">
                          <span className="text-primary font-semibold shrink-0">{index + 1}.</span>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-foreground/90 leading-relaxed">{item.insight}</span>
                              {item.confidence && (
                                <Badge
                                  variant={getConfidenceBadgeVariant(item.confidence)}
                                  className={`text-xs shrink-0 ${getConfidenceColor(item.confidence)}`}
                                >
                                  {item.confidence}%
                                </Badge>
                              )}
                            </div>
                            {item.sourceText && (
                              <div className="mt-1.5 p-2 rounded bg-accent/30 border-l-2 border-primary/30">
                                <p className="text-xs text-muted-foreground italic">"{item.sourceText}"</p>
                              </div>
                            )}
                          </div>
                        </div>
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
                            {typeof signal.confidence === 'number' ? (
                              <Badge
                                className={`text-xs px-1.5 py-0 ${getConfidenceColor(signal.confidence)}`}
                                variant={getConfidenceBadgeVariant(signal.confidence)}
                              >
                                {signal.confidence}%
                              </Badge>
                            ) : (
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
                            )}
                          </div>
                        </div>
                        {signal.sourceText && (
                          <div className="mt-2 p-2 rounded bg-accent/30 border-l-2 border-orange-500/30">
                            <p className="text-xs text-muted-foreground italic">"{signal.sourceText}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Quotable Lines Section */}
            {quotableLines.length > 0 && (
              <section>
                <button
                  className="flex items-center justify-between w-full text-left mb-2"
                  onClick={() => toggleSection("quotes")}
                >
                  <div className="flex items-center gap-2">
                    <Quote className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold text-sm">Quotable Lines ({quotableLines.length})</h3>
                  </div>
                  {expandedSections.quotes ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.quotes && (
                  <div className="pl-6 space-y-2">
                    {quotableLines.map((item, index) => (
                      <VerifiedQuoteLine key={index} item={item} />
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
    </TooltipProvider>
  )
}

function VerifiedQuoteLine({ item }: { item: VerifiedQuote }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.quote)
    setCopied(true)
    toast.success("Quote copied")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-2.5 rounded-lg border bg-accent/20 group">
      <div className="flex items-start gap-2">
        <blockquote className="flex-1 text-sm italic text-foreground/90 leading-relaxed">"{item.quote}"</blockquote>
        <div className="flex items-center gap-1 shrink-0">
          {item.confidence && (
            <Badge
              variant={getConfidenceBadgeVariant(item.confidence)}
              className={`text-xs ${getConfidenceColor(item.confidence)}`}
            >
              {item.confidence}%
            </Badge>
          )}
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
      </div>
      {(item.speaker || item.context) && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          {item.speaker && (
            <span className="font-medium">— {item.speaker}</span>
          )}
          {item.context && (
            <span className="text-muted-foreground/70">| {item.context}</span>
          )}
        </div>
      )}
    </div>
  )
}
