import { Sidebar } from "@/components/layout/sidebar"
import { Footer } from "@/components/layout/footer"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-screen w-full overflow-x-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  )
}
