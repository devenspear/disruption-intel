"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface Source {
  id: string
  name: string
}

interface ContentFiltersProps {
  sources: Source[]
  filters: {
    search: string
    status: string
    sourceId: string
    sortBy: string
    sortOrder: string
  }
  onFilterChange: (key: string, value: string) => void
  onReset: () => void
}

export function ContentFilters({
  sources,
  filters,
  onFilterChange,
  onReset,
}: ContentFiltersProps) {
  const hasFilters =
    filters.search || filters.status !== "all" || filters.sourceId !== "all"

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search content..."
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(value) => onFilterChange("status", value)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="PROCESSING">Processing</SelectItem>
          <SelectItem value="ANALYZED">Analyzed</SelectItem>
          <SelectItem value="FAILED">Failed</SelectItem>
          <SelectItem value="ARCHIVED">Archived</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.sourceId}
        onValueChange={(value) => onFilterChange("sourceId", value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Source" />
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

      <Select
        value={`${filters.sortBy}-${filters.sortOrder}`}
        onValueChange={(value) => {
          const [sortBy, sortOrder] = value.split("-")
          onFilterChange("sortBy", sortBy)
          onFilterChange("sortOrder", sortOrder)
        }}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="publishedAt-desc">Newest First</SelectItem>
          <SelectItem value="publishedAt-asc">Oldest First</SelectItem>
          <SelectItem value="title-asc">Title A-Z</SelectItem>
          <SelectItem value="title-desc">Title Z-A</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  )
}
