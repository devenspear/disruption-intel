"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from "lucide-react"

interface AddSourceDialogProps {
  onAdd: (source: {
    name: string
    type: string
    url: string
    checkFrequency: string
  }) => Promise<void>
}

export function AddSourceDialog({ onAdd }: AddSourceDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState("YOUTUBE_CHANNEL")
  const [url, setUrl] = useState("")
  const [checkFrequency, setCheckFrequency] = useState("daily")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await onAdd({ name, type, url, checkFrequency })
      // Only close and reset on success
      setOpen(false)
      setName("")
      setUrl("")
      setType("YOUTUBE_CHANNEL")
      setCheckFrequency("daily")
      setError(null)
    } catch (err) {
      // Keep dialog open and show error
      setError(err instanceof Error ? err.message : "Failed to add source")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Source
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Source</DialogTitle>
          <DialogDescription>
            Add a new content source to monitor for disruptive technology insights.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Peter Diamandis"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Source Type</Label>
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
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type={type === "TWITTER" ? "text" : "url"}
                placeholder={
                  type === "YOUTUBE_CHANNEL" ? "https://youtube.com/@channel" :
                  type === "PODCAST" ? "https://feeds.example.com/podcast.xml" :
                  type === "RSS" ? "https://blog.example.com/feed" :
                  type === "SUBSTACK" ? "https://newsletter.substack.com/feed" :
                  type === "TWITTER" ? "https://x.com/username or search:AI startup" :
                  "https://..."
                }
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
              <Label htmlFor="frequency">Check Frequency</Label>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
