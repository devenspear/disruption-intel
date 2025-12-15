"use client"

// Version is managed via package.json and bump-version script
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0"

export function Footer() {
  return (
    <footer className="w-full border-t bg-card/50 py-3 px-6">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} Disruption Radar by Deven Spear</span>
        <span className="text-muted-foreground/70">v{APP_VERSION}</span>
      </div>
    </footer>
  )
}
