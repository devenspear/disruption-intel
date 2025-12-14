"use client"

import { useEffect, useState } from "react"
import { SourceCard } from "@/components/sources/source-card"
import { AddSourceDialog } from "@/components/sources/add-source-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface Source {
  id: string
  name: string
  type: string
  url: string
  isActive: boolean
  lastChecked: string | null
  checkFrequency: string
  _count: {
    contents: number
  }
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/sources")
      if (res.ok) {
        const data = await res.json()
        setSources(data)
      }
    } catch (error) {
      console.error("Failed to fetch sources:", error)
      toast.error("Failed to load sources")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSources()
  }, [])

  const handleAddSource = async (source: {
    name: string
    type: string
    url: string
    checkFrequency: string
  }) => {
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(source),
    })

    if (res.ok) {
      toast.success("Source added successfully")
      fetchSources()
    } else {
      const data = await res.json()
      toast.error(data.error || "Failed to add source")
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    })

    if (res.ok) {
      toast.success(isActive ? "Source resumed" : "Source paused")
      fetchSources()
    } else {
      toast.error("Failed to update source")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this source?")) return

    const res = await fetch(`/api/sources/${id}`, {
      method: "DELETE",
    })

    if (res.ok) {
      toast.success("Source deleted")
      fetchSources()
    } else {
      toast.error("Failed to delete source")
    }
  }

  const handleCheck = async (id: string) => {
    const res = await fetch(`/api/sources/${id}/check`, {
      method: "POST",
    })

    if (res.ok) {
      toast.success("Check triggered")
    } else {
      toast.error("Failed to trigger check")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sources</h1>
          <p className="text-muted-foreground">
            Manage your content sources for monitoring
          </p>
        </div>
        <AddSourceDialog onAdd={handleAddSource} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No sources added yet</p>
          <AddSourceDialog onAdd={handleAddSource} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              onCheck={handleCheck}
            />
          ))}
        </div>
      )}
    </div>
  )
}
