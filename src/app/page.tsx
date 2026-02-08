import Link from 'next/link'
import Image from 'next/image'

const categories = [
  {
    title: 'GIFs',
    description: 'Animated pizza goodness',
    href: '/gifs',
    emoji: '🎬',
    color: 'from-orange-400 to-red-500',
    thumbnail: 'https://media0.giphy.com/media/v1.Y2lkPWM3NTZiMmU5ZnZmbnpwemFjemM2MmFvNmRobDR1cTlzank3bm1za3M1OXl4N3B4MSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VF5DpP0WJAb4HVH2Jp/200w_s.gif',
  },
  {
    title: 'Memes',
    description: 'Pizza humor at its finest',
    href: '/memes',
    emoji: '😂',
    color: 'from-yellow-400 to-orange-500',
    thumbnail: 'https://i.redd.it/q1jxnc20okjf1.png',
  },
  {
    title: 'Viral Videos',
    description: 'Trending pizza content',
    href: '/videos',
    emoji: '📱',
    color: 'from-red-400 to-pink-500',
    thumbnail: 'https://img.youtube.com/vi/LmC6IDiQJnc/hqdefault.jpg',
  },
  {
    title: 'Music',
    description: 'Pizza vibes and tunes',
    href: '/music',
    emoji: '🎵',
    color: 'from-green-400 to-green-600',
    thumbnail: null,
  },
  {
    title: 'Art',
    description: 'Creative pizza masterpieces',
    href: '/art',
    emoji: '🎨',
    color: 'from-pink-400 to-purple-600',
    thumbnail: 'https://64.media.tumblr.com/358f1f7e3840a927ccf9fda4e1b6b348/b95d33c23bcf047c-47/s500x750/907cedd3f898478418aaa842eb809e75a7c550aa.png',
  },
  {
    title: 'Games',
    description: 'Pizza-themed games and gaming content',
    href: '/games',
    emoji: '🎮',
    color: 'from-indigo-400 to-purple-600',
    thumbnail: 'https://media.rawg.io/media/screenshots/bd0/bd09882de5874cd675d723f646b033b8.jpg',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 to-red-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Image
              src="/logo.png"
              alt="Pizza Sauce"
              width={180}
              height={180}
              priority
            />
            <h1 className="text-5xl md:text-6xl font-bold">
              Pizza Sauce
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-orange-100 mb-8 max-w-2xl mx-auto">
            The ultimate repository for pizza GIFs, memes, and viral videos.
            Find the perfect slice of content.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/browse"
              className="px-8 py-3 bg-white text-orange-600 font-bold rounded-lg hover:bg-orange-50 transition-colors"
            >
              Browse Content
            </Link>
            <Link
              href="/submit"
              className="px-8 py-3 bg-orange-700 text-white font-bold rounded-lg hover:bg-orange-800 transition-colors"
            >
              Submit Content
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Explore by Category
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="relative h-64 flex flex-col justify-end">
                  {category.thumbnail ? (
                    <img
                      src={category.thumbnail}
                      alt={category.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${category.color}`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="relative p-8">
                    <span className="text-6xl mb-4 group-hover:scale-110 transition-transform inline-block">
                      {category.emoji}
                    </span>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {category.title}
                    </h3>
                    <p className="text-white/80">
                      {category.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📤</div>
              <h3 className="font-bold text-gray-900 mb-2">Submit Content</h3>
              <p className="text-gray-600">Share your favorite pizza content with the community</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">❤️</div>
              <h3 className="font-bold text-gray-900 mb-2">Save Favorites</h3>
              <p className="text-gray-600">Build your personal collection of pizza content</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="font-bold text-gray-900 mb-2">Request Content</h3>
              <p className="text-gray-600">Can&apos;t find what you need? Request it!</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔥</div>
              <h3 className="font-bold text-gray-900 mb-2">Viral Content</h3>
              <p className="text-gray-600">Discover trending pizza content from across the web</p>
            </div>
            <Link href="/live" className="text-center group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📺</div>
              <h3 className="font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">Live Stream</h3>
              <p className="text-gray-600">Fullscreen display for pizzerias and broadcasts</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to dive in?
          </h2>
          <p className="text-gray-600 mb-8">
            Join our community of pizza content enthusiasts and start exploring today.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  )
}
