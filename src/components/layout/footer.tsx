"use client"

import Link from "next/link"
import { Github } from "lucide-react"

// Import version from package.json
const APP_VERSION = "0.1.0"
const GITHUB_URL = "https://github.com/devenspear/disruption-intel"

export function Footer() {
  return (
    <footer className="border-t bg-card/50 py-4">
      <div className="container flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>&copy; {new Date().getFullYear()} Deven Spear</span>
          <span className="text-muted-foreground/50">|</span>
          <span>Disruption Intel</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
            <span>v{APP_VERSION}</span>
          </Link>
        </div>
      </div>
    </footer>
  )
}
