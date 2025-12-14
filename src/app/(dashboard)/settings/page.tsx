"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, Bell, User, Key } from "lucide-react"

const settingsLinks = [
  {
    title: "Analysis Prompts",
    description: "Manage AI prompts for content analysis",
    href: "/settings/prompts",
    icon: MessageSquare,
  },
  {
    title: "Profile",
    description: "Manage your account settings",
    href: "/settings/profile",
    icon: User,
    disabled: true,
  },
  {
    title: "Notifications",
    description: "Configure notification preferences",
    href: "/settings/notifications",
    icon: Bell,
    disabled: true,
  },
  {
    title: "API Keys",
    description: "Manage API keys and integrations",
    href: "/settings/api-keys",
    icon: Key,
    disabled: true,
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((item) => (
          <Card
            key={item.href}
            className={item.disabled ? "opacity-50" : "hover:bg-accent/50 transition-colors"}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {item.disabled ? (
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href={item.href}>Manage</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
