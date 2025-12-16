"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, X, Tag, ChevronDown } from "lucide-react"

interface Source {
  id: string
  name: string
}

interface TagItem {
  id: string
  name: string
  color: string | null
  _count: {
    contents: number
  }
}

interface ContentFiltersProps {
  sources: Source[]
  filters: {
    search: string
    status: string
    sourceId: string
    sourceType: string
    sortBy: string
    sortOrder: string
    tags: string // Comma-separated tag names
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
  const [availableTags, setAvailableTags] = useState<TagItem[]>([])
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)
  const [tagSearch, setTagSearch] = useState("")

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch("/api/tags")
        if (res.ok) {
          const data = await res.json()
          setAvailableTags(data)
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error)
      }
    }
    fetchTags()
  }, [])

  const selectedTags = filters.tags ? filters.tags.split(",").filter(Boolean) : []

  const toggleTag = (tagName: string) => {
    const current = new Set(selectedTags)
    if (current.has(tagName)) {
      current.delete(tagName)
    } else {
      current.add(tagName)
    }
    onFilterChange("tags", Array.from(current).join(","))
  }

  const clearTags = () => {
    onFilterChange("tags", "")
  }

  const filteredTags = tagSearch
    ? availableTags.filter(tag =>
        tag.name.toLowerCase().includes(tagSearch.toLowerCase())
      )
    : availableTags

  const hasFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.sourceId !== "all" ||
    filters.sourceType !== "all" ||
    filters.tags

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
        value={filters.sourceType}
        onValueChange={(value) => onFilterChange("sourceType", value)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="YOUTUBE_CHANNEL">YouTube</SelectItem>
          <SelectItem value="PODCAST">Podcast</SelectItem>
          <SelectItem value="RSS">RSS</SelectItem>
          <SelectItem value="SUBSTACK">Substack</SelectItem>
          <SelectItem value="TWITTER">Twitter/X</SelectItem>
          <SelectItem value="MANUAL">Manual</SelectItem>
        </SelectContent>
      </Select>

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

      {/* Tag Filter */}
      <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[180px] justify-between">
            <div className="flex items-center gap-2 truncate">
              <Tag className="h-4 w-4 flex-shrink-0" />
              {selectedTags.length > 0 ? (
                <span className="truncate">{selectedTags.length} tag{selectedTags.length > 1 ? "s" : ""}</span>
              ) : (
                <span>Filter by Tags</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Search tags..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-2 space-y-1">
              {filteredTags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {tagSearch ? "No matching tags" : "No tags available"}
                </p>
              ) : (
                filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                    onClick={() => toggleTag(tag.name)}
                  >
                    <Checkbox
                      checked={selectedTags.includes(tag.name)}
                      onCheckedChange={() => toggleTag(tag.name)}
                    />
                    <span className="flex-1 text-sm truncate">{tag.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {tag._count.contents}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          {selectedTags.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={clearTags}
              >
                Clear selection
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

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
