'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { PizzeriaBadge } from '@/components/ui/PizzeriaBadge'

export function Header() {
  const { isAuthenticated, profile, isLoading, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1">
            <Image
              src="/logo.png"
              alt="Pizza Sauce"
              width={80}
              height={80}
            />
            <span className="font-bold text-2xl text-gray-900">Pizza Sauce</span>
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
            <Link href="/photos" className="text-gray-600 hover:text-blue-600 font-medium">
              Photos
            </Link>
            <Link href="/art" className="text-gray-600 hover:text-pink-600 font-medium">
              Art
            </Link>
            <Link href="/games" className="text-gray-600 hover:text-indigo-600 font-medium">
              Games
            </Link>
            <Link href="/all-stars" className="text-gray-600 hover:text-yellow-600 font-medium">
              All Stars
            </Link>
            <Link href="/recipes" className="text-gray-600 hover:text-amber-600 font-medium">
              Recipes
            </Link>
            <Link href="/music" className="text-gray-600 hover:text-green-600 font-medium">
              Music
            </Link>
            <Link href="/radio" className="text-gray-600 hover:text-green-600 font-medium flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Radio
            </Link>
            <Link href="/live" className="text-gray-600 hover:text-orange-600 font-medium">
              Live Stream
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
                    {profile?.is_pizzeria && (
                      <PizzeriaBadge isVerified={profile.is_verified ?? false} size="sm" showLabel={false} />
                    )}
                  </button>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    {/* User Info */}
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="font-medium text-gray-900 truncate">
                        {profile?.display_name || 'User'}
                      </p>
                      {profile?.username && (
                        <p className="text-sm text-gray-500 truncate">@{profile.username}</p>
                      )}
                      {profile?.is_pizzeria && (
                        <div className="mt-1">
                          <PizzeriaBadge isVerified={profile.is_verified ?? false} size="sm" />
                        </div>
                      )}
                    </div>

                    {/* Dashboard Links */}
                    <div className="py-1">
                      <Link
                        href="/account"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Dashboard
                      </Link>
                      <Link
                        href="/account/content"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        My Content
                      </Link>
                      <Link
                        href="/account/favorites"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Favorites
                      </Link>
                      <Link
                        href="/account/history"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        History
                      </Link>
                      <Link
                        href="/admin/imports"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import Admin
                      </Link>
                    </div>

                    <hr className="my-1" />

                    {/* Settings & Sign Out */}
                    <div className="py-1">
                      <Link
                        href="/account/settings"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="flex items-center gap-3 w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
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
