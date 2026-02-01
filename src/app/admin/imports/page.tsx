'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImportSourceCard, ImportSource } from '@/components/admin/ImportSourceCard'
import { ImportLogTable, ImportLog } from '@/components/admin/ImportLogTable'

interface ImportStats {
  totalSources: number
  activeSources: number
  totalImported: number
  recentImports: number
}

export default function AdminImportsPage() {
  const [sources, setSources] = useState<ImportSource[]>([])
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [stats, setStats] = useState<ImportStats>({
    totalSources: 0,
    activeSources: 0,
    totalImported: 0,
    recentImports: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch import sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('import_sources')
        .select('*')
        .order('platform', { ascending: true })

      if (sourcesError) throw sourcesError
      setSources(sourcesData || [])

      // Fetch recent import logs with source info
      const { data: logsData, error: logsError } = await supabase
        .from('import_logs')
        .select(`
          *,
          source:import_sources (
            platform,
            display_name,
            source_identifier
          )
        `)
        .order('started_at', { ascending: false })
        .limit(20)

      if (logsError) throw logsError
      setLogs(logsData || [])

      // Calculate stats
      const totalSources = sourcesData?.length || 0
      const activeSources = sourcesData?.filter(s => s.is_active).length || 0
      const totalImported = logsData?.reduce((sum, log) => sum + (log.items_imported || 0), 0) || 0

      // Count imports in the last 24 hours
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      const recentImports = logsData?.filter(
        log => new Date(log.started_at) > oneDayAgo
      ).length || 0

      setStats({
        totalSources,
        activeSources,
        totalImported,
        recentImports,
      })
    } catch (err) {
      console.error('Error fetching import data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load import data')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggleSource = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('import_sources')
        .update({ is_active: isActive })
        .eq('id', id)

      if (error) throw error

      // Update local state
      setSources(prev =>
        prev.map(s => (s.id === id ? { ...s, is_active: isActive } : s))
      )
    } catch (err) {
      console.error('Error toggling source:', err)
      alert('Failed to update source status')
    }
  }

  const handleImportNow = async (source: ImportSource) => {
    // Note: This would typically call an API endpoint or Edge Function
    // For now, we'll show instructions
    alert(
      `To import from ${source.platform}/${source.source_identifier}, run:\n\n` +
      `SUPABASE_SERVICE_KEY=xxx node scripts/import-${source.platform}.mjs`
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Import Data</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-red-500">
            Make sure the import_sources and import_logs tables exist.
            Run the migration: <code className="bg-red-100 px-2 py-1 rounded">004_import_sources.sql</code>
          </p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Import Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Manage content imports from external platforms
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500">Total Sources</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalSources}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500">Active Sources</p>
          <p className="text-2xl font-bold text-green-600">{stats.activeSources}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500">Total Imported</p>
          <p className="text-2xl font-bold text-orange-600">{stats.totalImported}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500">Last 24h</p>
          <p className="text-2xl font-bold text-blue-600">{stats.recentImports}</p>
        </div>
      </div>

      {/* Import Sources */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Import Sources</h2>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {isLoading && sources.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
            Loading import sources...
          </div>
        ) : sources.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-500 mb-4">No import sources configured yet.</p>
            <p className="text-sm text-gray-400">
              Run an import script to automatically create a source record.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sources.map((source) => (
              <ImportSourceCard
                key={source.id}
                source={source}
                onToggle={handleToggleSource}
                onImportNow={handleImportNow}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Import Logs */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Import Logs</h2>
        <ImportLogTable logs={logs} isLoading={isLoading && logs.length === 0} />
      </section>

      {/* CLI Instructions */}
      <section className="mt-8 bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Running Imports via CLI</h3>
        <p className="text-sm text-gray-600 mb-3">
          Import scripts can be run manually from the command line:
        </p>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-green-400">
{`# Set your Supabase service key
export SUPABASE_SERVICE_KEY="your-service-key"

# Run an import
node scripts/import-reddit.mjs
node scripts/import-giphy.mjs   # Requires GIPHY_API_KEY
node scripts/import-tenor.mjs   # Requires TENOR_API_KEY
node scripts/import-youtube.mjs # Requires YOUTUBE_API_KEY
node scripts/import-imgur.mjs   # Requires IMGUR_CLIENT_ID
node scripts/import-unsplash.mjs # Requires UNSPLASH_ACCESS_KEY
node scripts/import-pexels.mjs  # Requires PEXELS_API_KEY
node scripts/import-pixabay.mjs # Requires PIXABAY_API_KEY

# Use --help for options
node scripts/import-reddit.mjs --help`}
          </pre>
        </div>
      </section>
    </div>
  )
}
