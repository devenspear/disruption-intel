"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ContentTable } from "@/components/content/content-table"
import { ContentFilters } from "@/components/content/content-filters"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight } from "lucide-react"

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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "all",
    sourceId: searchParams.get("sourceId") || "all",
    sortBy: searchParams.get("sortBy") || "publishedAt",
    sortOrder: searchParams.get("sortOrder") || "desc",
  })

  const fetchContent = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.set("search", filters.search)
      if (filters.status !== "all") params.set("status", filters.status)
      if (filters.sourceId !== "all") params.set("sourceId", filters.sourceId)
      params.set("sortBy", filters.sortBy)
      params.set("sortOrder", filters.sortOrder)
      params.set("page", pagination.page.toString())
      params.set("limit", pagination.limit.toString())

      const res = await fetch(`/api/content?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setContents(data.contents)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Failed to fetch content:", error)
      toast.error("Failed to load content")
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.limit])

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
  }, [])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))

    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
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
      fetchContent()
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
      fetchContent()
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
      fetchContent()
    } else {
      toast.error("Failed to delete content")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Library</h1>
        <p className="text-muted-foreground">
          Browse and manage all ingested content
        </p>
      </div>

      <ContentFilters
        sources={sources}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
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
          <div className="rounded-md border overflow-x-auto">
            <ContentTable
              contents={contents}
              onAnalyze={handleAnalyze}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    }>
      <ContentPageContent />
    </Suspense>
  )
}
