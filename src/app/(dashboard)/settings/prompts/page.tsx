"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreVertical, Star, Trash2, Edit, Copy } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface Prompt {
  id: string
  name: string
  description: string | null
  systemPrompt: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    analyses: number
  }
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    isDefault: false,
  })

  const fetchPrompts = async () => {
    try {
      const res = await fetch("/api/prompts")
      if (res.ok) {
        const data = await res.json()
        setPrompts(data)
      }
    } catch (error) {
      console.error("Failed to fetch prompts:", error)
      toast.error("Failed to load prompts")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPrompts()
  }, [])

  const handleOpenDialog = (prompt?: Prompt) => {
    if (prompt) {
      setEditingPrompt(prompt)
      setFormData({
        name: prompt.name,
        description: prompt.description || "",
        systemPrompt: prompt.systemPrompt,
        isDefault: prompt.isDefault,
      })
    } else {
      setEditingPrompt(null)
      setFormData({
        name: "",
        description: "",
        systemPrompt: defaultPromptTemplate,
        isDefault: false,
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = editingPrompt
      ? `/api/prompts/${editingPrompt.id}`
      : "/api/prompts"
    const method = editingPrompt ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    if (res.ok) {
      toast.success(editingPrompt ? "Prompt updated" : "Prompt created")
      setDialogOpen(false)
      fetchPrompts()
    } else {
      const data = await res.json()
      toast.error(data.error || "Failed to save prompt")
    }
  }

  const handleSetDefault = async (id: string) => {
    const res = await fetch(`/api/prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    })

    if (res.ok) {
      toast.success("Default prompt updated")
      fetchPrompts()
    } else {
      toast.error("Failed to update default prompt")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return

    const res = await fetch(`/api/prompts/${id}`, {
      method: "DELETE",
    })

    if (res.ok) {
      toast.success("Prompt deleted")
      fetchPrompts()
    } else {
      const data = await res.json()
      toast.error(data.error || "Failed to delete prompt")
    }
  }

  const handleDuplicate = (prompt: Prompt) => {
    setEditingPrompt(null)
    setFormData({
      name: `${prompt.name} (Copy)`,
      description: prompt.description || "",
      systemPrompt: prompt.systemPrompt,
      isDefault: false,
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analysis Prompts</h1>
          <p className="text-muted-foreground">
            Manage prompts for AI-powered content analysis
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          New Prompt
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : prompts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No prompts yet</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Prompt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{prompt.name}</CardTitle>
                      {prompt.isDefault && (
                        <Badge variant="secondary">
                          <Star className="mr-1 h-3 w-3" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {prompt.description || "No description"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(prompt)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(prompt)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      {!prompt.isDefault && (
                        <DropdownMenuItem onClick={() => handleSetDefault(prompt.id)}>
                          <Star className="mr-2 h-4 w-4" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(prompt.id)}
                        disabled={prompt._count.analyses > 0}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{prompt._count.analyses} analyses</span>
                  <span>
                    Updated {formatDistanceToNow(new Date(prompt.updatedAt))} ago
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "Edit Prompt" : "Create New Prompt"}
            </DialogTitle>
            <DialogDescription>
              Configure the system prompt for AI analysis
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Disruption Weekly Summary"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of this prompt's purpose"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, systemPrompt: e.target.value })
                  }
                  placeholder="Enter the system prompt..."
                  className="min-h-[300px] font-mono text-sm"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingPrompt ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const defaultPromptTemplate = `You are an expert analyst specializing in disruptive technologies, exponential trends, and future-forward thinking. Analyze the following transcript and provide a structured analysis.

CRITICAL VERIFICATION REQUIREMENTS:
1. Every quote MUST be VERBATIM from the transcript - absolutely NO paraphrasing
2. Include the approximate character position where the quote appears in the source
3. If you cannot find exact supporting text for a claim, DO NOT include it
4. Confidence scores: 100 = verbatim quote found, 80-99 = very close match, <80 = OMIT entirely
5. Only include insights that can be directly traced to specific statements in the transcript

OUTPUT FORMAT (JSON):
{
  "summary": "2-3 paragraph executive summary based only on verified content from transcript",
  "keyInsights": [
    {
      "insight": "The specific insight with detail",
      "sourceText": "The exact text from transcript supporting this insight",
      "confidence": 80-100
    }
  ],
  "disruptionSignals": [
    {
      "signal": "Name of the disruption",
      "sector": "Industry/sector affected",
      "timeframe": "Near-term/Mid-term/Long-term",
      "sourceText": "Supporting quote from transcript",
      "confidence": 80-100
    }
  ],
  "quotableLines": [
    {
      "quote": "EXACT verbatim quote from transcript - no changes allowed",
      "sourcePosition": 12345,
      "context": "Why this quote matters",
      "speaker": "Name if identifiable, or 'Speaker'",
      "confidence": 100
    }
  ],
  "relevanceScore": 0.0-1.0,
  "categories": ["AI", "Longevity", "Space", etc.],
  "actionItems": [
    {
      "item": "Potential follow-up or research item",
      "sourceText": "What in the transcript prompted this"
    }
  ],
  "relatedTopics": ["Topic for cross-referencing"],
  "verificationSummary": {
    "totalClaims": 10,
    "verifiedClaims": 10,
    "averageConfidence": 95
  }
}

VERIFICATION RULES:
- Search the transcript for the EXACT text before including any quote
- If a quote would require even minor rewording, find a different quote that IS verbatim
- For insights, always cite the specific text that supports the insight
- sourcePosition should be the approximate character index where the quote starts
- Set confidence to 100 ONLY for exact verbatim matches
- NEVER fabricate or embellish quotes - accuracy is paramount

Focus on:
- Specific predictions with timeframes (cite the exact words used)
- Named technologies, companies, or people (as mentioned in transcript)
- Contrarian or non-obvious insights (with source citations)
- Quantitative claims (numbers, percentages, dates - exactly as stated)
- Implications for business strategy (grounded in transcript content)`
