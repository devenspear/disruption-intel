"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Source {
  id: string
  name: string
  type: string
  url: string
  isActive: boolean
  checkFrequency: string
}

interface EditSourceDialogProps {
  source: Source | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, data: {
    name: string
    type: string
    url: string
    checkFrequency: string
  }) => Promise<void>
}

export function EditSourceDialog({ source, open, onOpenChange, onSave }: EditSourceDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState("YOUTUBE_CHANNEL")
  const [url, setUrl] = useState("")
  const [checkFrequency, setCheckFrequency] = useState("daily")
  const [error, setError] = useState<string | null>(null)

  // Update form when source changes
  useEffect(() => {
    if (source) {
      setName(source.name)
      setType(source.type)
      setUrl(source.url)
      setCheckFrequency(source.checkFrequency)
      setError(null)
    }
  }, [source])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!source) return

    setIsLoading(true)
    setError(null)

    try {
      await onSave(source.id, { name, type, url, checkFrequency })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Source</DialogTitle>
          <DialogDescription>
            Update the source configuration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="Source name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Source Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YOUTUBE_CHANNEL">YouTube Channel</SelectItem>
                  <SelectItem value="PODCAST">Podcast Feed</SelectItem>
                  <SelectItem value="RSS">RSS Feed</SelectItem>
                  <SelectItem value="SUBSTACK">Substack</SelectItem>
                  <SelectItem value="TWITTER">Twitter/X</SelectItem>
                  <SelectItem value="MANUAL">Manual Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              {type === "SUBSTACK" && (
                <p className="text-xs text-muted-foreground">
                  Use the RSS feed URL: https://newsletter.substack.com/feed or https://custom-domain.com/feed
                </p>
              )}
              {type === "TWITTER" && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Supported formats:
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                    <li><code className="bg-muted px-1 rounded">https://x.com/sama</code> - User profile URL</li>
                    <li><code className="bg-muted px-1 rounded">https://twitter.com/elonmusk</code> - Legacy Twitter URL</li>
                    <li><code className="bg-muted px-1 rounded">search:AI startup funding</code> - Search query</li>
                  </ul>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-frequency">Check Frequency</Label>
              <Select value={checkFrequency} onValueChange={setCheckFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
