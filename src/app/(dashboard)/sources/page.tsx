"use client"

import { useEffect, useState } from "react"
import { SourceCard } from "@/components/sources/source-card"
import { AddSourceDialog } from "@/components/sources/add-source-dialog"
import { EditSourceDialog } from "@/components/sources/edit-source-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
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
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [sortByType, setSortByType] = useState(false)

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
      const errorMessage = data.error || "Failed to add source"
      toast.error(errorMessage)
      throw new Error(errorMessage)
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

  const handleProcess = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/sources/${id}/process`, {
        method: "POST",
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || "Processing complete")
        fetchSources()
      } else {
        toast.error(data.error || "Failed to process source")
      }
    } catch (error) {
      toast.error("Failed to process source")
    } finally {
      setProcessingId(null)
    }
  }

  const handleEdit = (source: Source) => {
    setEditingSource(source)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async (id: string, data: {
    name: string
    type: string
    url: string
    checkFrequency: string
  }) => {
    const res = await fetch(`/api/sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      toast.success("Source updated successfully")
      fetchSources()
    } else {
      const errorData = await res.json()
      const errorMessage = errorData.error || "Failed to update source"
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Sort sources by type if enabled, then by name
  const sortedSources = sortByType
    ? [...sources].sort((a, b) => {
        const typeCompare = a.type.localeCompare(b.type)
        if (typeCompare !== 0) return typeCompare
        return a.name.localeCompare(b.name)
      })
    : sources

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 -mx-8 px-8 border-b">
        <div className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-3xl font-bold">Sources</h1>
            <p className="text-muted-foreground">
              Manage your content sources for monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={sortByType ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSortByType(!sortByType)}
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {sortByType ? "Sorted by Type" : "Sort by Type"}
            </Button>
            <AddSourceDialog onAdd={handleAddSource} />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 space-y-6 pt-4">
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
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,280px))]">
          {sortedSources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              onCheck={handleCheck}
              onProcess={handleProcess}
              onEdit={handleEdit}
              isProcessing={processingId === source.id}
            />
          ))}
        </div>
      )}

        <EditSourceDialog
          source={editingSource}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleSaveEdit}
        />
      </div>
    </div>
  )
}
