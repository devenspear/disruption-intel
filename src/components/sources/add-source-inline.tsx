"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Youtube,
  Podcast,
  Rss,
  Twitter,
  FileText,
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AddSourceInlineProps {
  onAdd: (source: {
    name: string
    type: string
    url: string
    checkFrequency: string
  }) => Promise<void>
}

const SOURCE_TYPES = [
  { value: "YOUTUBE_CHANNEL", label: "YouTube", icon: Youtube, color: "text-red-500" },
  { value: "PODCAST", label: "Podcast", icon: Podcast, color: "text-purple-500" },
  { value: "RSS", label: "RSS", icon: Rss, color: "text-orange-500" },
  { value: "SUBSTACK", label: "Substack", icon: FileText, color: "text-orange-400" },
  { value: "TWITTER", label: "Twitter/X", icon: Twitter, color: "text-blue-400" },
  { value: "MANUAL", label: "Manual", icon: Upload, color: "text-gray-400" },
]

const URL_PLACEHOLDERS: Record<string, string> = {
  YOUTUBE_CHANNEL: "https://youtube.com/@channel",
  PODCAST: "https://feeds.example.com/podcast.xml",
  RSS: "https://blog.example.com/feed",
  SUBSTACK: "https://newsletter.substack.com/feed",
  TWITTER: "https://x.com/username",
  MANUAL: "https://...",
}

export function AddSourceInline({ onAdd }: AddSourceInlineProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState("YOUTUBE_CHANNEL")
  const [url, setUrl] = useState("")
  const [checkFrequency, setCheckFrequency] = useState("daily")
  const [error, setError] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // Focus name input when expanded
  useEffect(() => {
    if (isExpanded && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100)
    }
  }, [isExpanded])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      await onAdd({ name, type, url, checkFrequency })

      // Show success state
      setShowSuccess(true)

      // Reset form after brief delay
      setTimeout(() => {
        setName("")
        setUrl("")
        setType("YOUTUBE_CHANNEL")
        setCheckFrequency("daily")
        setShowSuccess(false)
        setIsExpanded(false)
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add source")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setIsExpanded(false)
    setError(null)
    // Reset form after animation
    setTimeout(() => {
      setName("")
      setUrl("")
      setType("YOUTUBE_CHANNEL")
      setCheckFrequency("daily")
    }, 300)
  }

  const selectedType = SOURCE_TYPES.find(t => t.value === type)
  const TypeIcon = selectedType?.icon || FileText

  return (
    <div className="w-full">
      {/* Trigger Button */}
      <Button
        variant={isExpanded ? "secondary" : "default"}
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "transition-all duration-200",
          isExpanded && "bg-primary/10 text-primary hover:bg-primary/20"
        )}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="mr-2 h-4 w-4" />
            Close
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </>
        )}
      </Button>

      {/* Expandable Form */}
      <div
        ref={formRef}
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"
        )}
      >
        <form onSubmit={handleSubmit}>
          <div className={cn(
            "rounded-lg border bg-card p-4 shadow-sm transition-all duration-300",
            showSuccess && "border-emerald-500/50 bg-emerald-500/5",
            error && "border-destructive/50 bg-destructive/5"
          )}>
            {/* Success State */}
            {showSuccess ? (
              <div className="flex items-center justify-center gap-3 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-medium text-emerald-500">Source Added!</p>
                  <p className="text-sm text-muted-foreground">
                    {name} has been added to your sources
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Form Header */}
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Plus className="h-4 w-4" />
                  <span>Add a new content source to monitor</span>
                </div>

                {/* Main Form Row */}
                <div className="flex flex-wrap items-end gap-3">
                  {/* Source Type - Quick Select Pills */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Type</span>
                    <div className="flex gap-1">
                      {SOURCE_TYPES.slice(0, 5).map((sourceType) => {
                        const Icon = sourceType.icon
                        const isSelected = type === sourceType.value
                        return (
                          <button
                            key={sourceType.value}
                            type="button"
                            onClick={() => setType(sourceType.value)}
                            className={cn(
                              "flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all",
                              isSelected
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Icon className={cn("h-3.5 w-3.5", !isSelected && sourceType.color)} />
                            <span className="hidden sm:inline">{sourceType.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Name Input */}
                  <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Name</span>
                    <Input
                      ref={nameInputRef}
                      placeholder="Source name..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9"
                      required
                    />
                  </div>

                  {/* URL Input */}
                  <div className="flex min-w-[250px] flex-[2] flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">URL</span>
                    <div className="relative">
                      <TypeIcon className={cn(
                        "absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2",
                        selectedType?.color
                      )} />
                      <Input
                        type={type === "TWITTER" ? "text" : "url"}
                        placeholder={URL_PLACEHOLDERS[type]}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="h-9 pl-9"
                        required
                      />
                    </div>
                  </div>

                  {/* Frequency Select */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Frequency</span>
                    <Select value={checkFrequency} onValueChange={setCheckFrequency}>
                      <SelectTrigger className="h-9 w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      className="h-9"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isLoading || !name.trim() || !url.trim()}
                      className="h-9 min-w-[100px]"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Source
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Type-specific hints */}
                {type === "TWITTER" && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Supports: <code className="rounded bg-muted px-1">https://x.com/username</code> or <code className="rounded bg-muted px-1">search:AI startup</code>
                  </p>
                )}
                {type === "SUBSTACK" && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Use the RSS feed URL: <code className="rounded bg-muted px-1">https://newsletter.substack.com/feed</code>
                  </p>
                )}
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
