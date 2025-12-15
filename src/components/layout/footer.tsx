"use client"

import Link from "next/link"
import { Github } from "lucide-react"

// Import version from package.json
const APP_VERSION = "0.1.0"
const GITHUB_URL = "https://github.com/devenspear/disruption-intel"

export function Footer() {
  return (
    <footer className="py-3 px-6 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} Deven Spear &middot; Disruption Intel</span>
        <Link
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Github className="h-3.5 w-3.5" />
          <span>v{APP_VERSION}</span>
        </Link>
      </div>
    </footer>
  )
}
