'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export function Header() {
  const { isAuthenticated, profile, isLoading, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍕</span>
            <span className="font-bold text-xl text-gray-900">Pizza Content</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/gifs" className="text-gray-600 hover:text-orange-600 font-medium">
              GIFs
            </Link>
            <Link href="/memes" className="text-gray-600 hover:text-orange-600 font-medium">
              Memes
            </Link>
            <Link href="/videos" className="text-gray-600 hover:text-orange-600 font-medium">
              Videos
            </Link>
            <Link href="/requests" className="text-gray-600 hover:text-orange-600 font-medium">
              Requests
            </Link>
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                >
                  Submit
                </Link>
                <div className="relative group">
                  <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium">
                      {profile?.display_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link
                      href="/account"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Account
                    </Link>
                    <Link
                      href="/favorites"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Favorites
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={() => signOut()}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
