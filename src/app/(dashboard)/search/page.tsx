"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ExternalLink, FileText } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useDebouncedCallback } from "use-debounce"

interface SearchResult {
  id: string
  title: string
  description: string | null
  publishedAt: string
  originalUrl: string
  source: {
    name: string
    type: string
  }
  wordCount: number | null
  relevanceScore: number | null
  snippet: string
}

interface Source {
  id: string
  name: string
}

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [sourceId, setSourceId] = useState(searchParams.get("sourceId") || "all")
  const [results, setResults] = useState<SearchResult[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const performSearch = useCallback(async (q: string, source: string) => {
    if (!q || q.length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams({ q })
      if (source && source !== "all") params.set("sourceId", source)

      const res = await fetch(`/api/search?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results)
      }
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const debouncedSearch = useDebouncedCallback((q: string, source: string) => {
    performSearch(q, source)

    // Update URL
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (source && source !== "all") params.set("sourceId", source)
    router.push(`/search?${params.toString()}`)
  }, 300)

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/sources")
      if (res.ok) {
        const data = await res.json()
        setSources(data)
      }
    } catch (error) {
      console.error("Failed to fetch sources:", error)
    }
  }

  useEffect(() => {
    fetchSources()
    // Perform initial search if query exists in URL
    const initialQuery = searchParams.get("q")
    const initialSource = searchParams.get("sourceId") || "all"
    if (initialQuery) {
      performSearch(initialQuery, initialSource)
    }
  }, [])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    debouncedSearch(value, sourceId)
  }

  const handleSourceChange = (value: string) => {
    setSourceId(value)
    if (query.length >= 2) {
      performSearch(query, value)
      const params = new URLSearchParams()
      if (query) params.set("q", query)
      if (value && value !== "all") params.set("sourceId", value)
      router.push(`/search?${params.toString()}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-muted-foreground">
          Search across all transcripts and content
        </p>
      </div>

      {/* Search Form */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search transcripts, titles, and descriptions..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
        <Select value={sourceId} onValueChange={handleSourceChange}>
          <SelectTrigger className="w-[200px] h-12">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source.id} value={source.id}>
                {source.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : hasSearched && results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No results found</p>
            <p className="text-muted-foreground">
              Try different keywords or adjust your filters
            </p>
          </CardContent>
        </Card>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          {results.map((result) => (
            <Card key={result.id} className="hover:bg-accent/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Link
                      href={`/content/${result.id}`}
                      className="text-lg font-medium hover:underline"
                    >
                      {result.title}
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{result.source.name}</Badge>
                      <span>
                        {formatDistanceToNow(new Date(result.publishedAt))} ago
                      </span>
                      {result.wordCount && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {result.wordCount.toLocaleString()} words
                        </span>
                      )}
                      {result.relevanceScore && (
                        <Badge variant="secondary">
                          {(result.relevanceScore * 100).toFixed(0)}% relevance
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={result.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              {result.snippet && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    <HighlightText text={result.snippet} highlight={query} />
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Start searching</p>
            <p className="text-muted-foreground">
              Enter at least 2 characters to search
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight) return <>{text}</>

  const parts = text.split(new RegExp(`(${highlight})`, "gi"))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-500/30 text-foreground font-medium">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 w-[200px]" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
