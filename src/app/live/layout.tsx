import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pizza Live Stream - Fullscreen Pizza Content",
  description: "A fullscreen visual display cycling through pizza GIFs, memes, and videos. Perfect for pizzerias or live streams.",
}

export default function LiveStreamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Minimal layout without header for fullscreen experience
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {children}
    </div>
  )
}
