"use client"

import { Suspense, useEffect, useState, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ContentTable } from "@/components/content/content-table"
import { ContentFilters } from "@/components/content/content-filters"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface Content {
  id: string
  title: string
  publishedAt: string
  status: string
  contentType?: string
  thumbnailUrl: string | null
  originalUrl: string
  source: {
    id: string
    name: string
    type: string
  }
  transcript: {
    wordCount: number
    source?: string
  } | null
  analyses: Array<{
    relevanceScore: number | null
  }>
  _count: {
    tags: number
    usageHistory: number
  }
}

interface Source {
  id: string
  name: string
}

function ContentPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [contents, setContents] = useState<Content[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "all",
    sourceId: searchParams.get("sourceId") || "all",
    sortBy: searchParams.get("sortBy") || "publishedAt",
    sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
  })

  const fetchContent = useCallback(async (pageNum: number, append: boolean = false) => {
    if (pageNum === 1) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const params = new URLSearchParams()
      if (filters.search) params.set("search", filters.search)
      if (filters.status !== "all") params.set("status", filters.status)
      if (filters.sourceId !== "all") params.set("sourceId", filters.sourceId)
      params.set("sortBy", filters.sortBy)
      params.set("sortOrder", filters.sortOrder)
      params.set("page", pageNum.toString())
      params.set("limit", "30")

      const res = await fetch(`/api/content?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (append) {
          setContents(prev => [...prev, ...data.contents])
        } else {
          setContents(data.contents)
        }
        setTotal(data.pagination.total)
        setHasMore(pageNum < data.pagination.totalPages)
      }
    } catch (error) {
      console.error("Failed to fetch content:", error)
      toast.error("Failed to load content")
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [filters])

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

  // Setup infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isLoadingMore, isLoading])

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      fetchContent(page, true)
    }
  }, [page, fetchContent])

  useEffect(() => {
    fetchSources()
  }, [])

  // Reset and fetch when filters change
  useEffect(() => {
    setPage(1)
    setContents([])
    fetchContent(1, false)
  }, [filters, fetchContent])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))

    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/content?${params.toString()}`)
  }

  const handleSort = (column: string) => {
    const newOrder = filters.sortBy === column && filters.sortOrder === "asc" ? "desc" : "asc"
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: newOrder
    }))

    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    params.set("sortBy", column)
    params.set("sortOrder", newOrder)
    router.push(`/content?${params.toString()}`)
  }

  const handleReset = () => {
    setFilters({
      search: "",
      status: "all",
      sourceId: "all",
      sortBy: "publishedAt",
      sortOrder: "desc",
    })
    router.push("/content")
  }

  const handleAnalyze = async (id: string) => {
    const res = await fetch(`/api/content/${id}/analyze`, {
      method: "POST",
    })
    if (res.ok) {
      toast.success("Analysis triggered")
      // Refresh the list
      setPage(1)
      fetchContent(1, false)
    } else {
      toast.error("Failed to trigger analysis")
    }
  }

  const handleArchive = async (id: string) => {
    const res = await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    })
    if (res.ok) {
      toast.success("Content archived")
      setContents(prev => prev.filter(c => c.id !== id))
    } else {
      toast.error("Failed to archive content")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return

    const res = await fetch(`/api/content/${id}`, {
      method: "DELETE",
    })
    if (res.ok) {
      toast.success("Content deleted")
      setContents(prev => prev.filter(c => c.id !== id))
    } else {
      toast.error("Failed to delete content")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Library</h1>
          <p className="text-muted-foreground">
            {total > 0 ? `${total.toLocaleString()} items` : "Browse and manage all ingested content"}
          </p>
        </div>
      </div>

      <ContentFilters
        sources={sources}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : contents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No content found</p>
          <p className="text-sm text-muted-foreground">
            {filters.search || filters.status !== "all" || filters.sourceId !== "all"
              ? "Try adjusting your filters"
              : "Add sources to start ingesting content"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-hidden">
            <ContentTable
              contents={contents}
              onAnalyze={handleAnalyze}
              onArchive={handleArchive}
              onDelete={handleDelete}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSort={handleSort}
            />
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            )}
            {!hasMore && contents.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing all {total.toLocaleString()} items
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function ContentPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    }>
      <ContentPageContent />
    </Suspense>
  )
}
