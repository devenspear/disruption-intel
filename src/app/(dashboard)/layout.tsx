import { Sidebar } from "@/components/layout/sidebar"
import { Footer } from "@/components/layout/footer"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <div className="container py-8 h-full">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
