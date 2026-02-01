'use client'

export interface ImportLog {
  id: string
  source_id: string
  status: 'running' | 'completed' | 'failed'
  items_found: number
  items_imported: number
  items_skipped: number
  error_message: string | null
  started_at: string
  completed_at: string | null
  // Joined from import_sources
  source?: {
    platform: string
    display_name: string | null
    source_identifier: string
  }
}

interface ImportLogTableProps {
  logs: ImportLog[]
  isLoading?: boolean
}

const statusConfig = {
  running: { color: 'bg-blue-100 text-blue-700', label: 'Running' },
  completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
  failed: { color: 'bg-red-100 text-red-700', label: 'Failed' },
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString()
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'In progress...'

  const start = new Date(startedAt)
  const end = new Date(completedAt)
  const diffMs = end.getTime() - start.getTime()
  const diffSecs = Math.floor(diffMs / 1000)

  if (diffSecs < 60) return `${diffSecs}s`
  const diffMins = Math.floor(diffSecs / 60)
  const remainingSecs = diffSecs % 60
  return `${diffMins}m ${remainingSecs}s`
}

export function ImportLogTable({ logs, isLoading }: ImportLogTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8 text-center text-gray-500">
          Loading import logs...
        </div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8 text-center text-gray-500">
          No import logs yet. Run an import to see results here.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Found
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Imported
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Skipped
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Started
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Duration
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map((log) => {
              const status = statusConfig[log.status] || statusConfig.running

              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 capitalize">
                        {log.source?.platform || 'Unknown'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {log.source?.display_name || log.source?.source_identifier || ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                    {log.error_message && (
                      <p className="mt-1 text-xs text-red-600 truncate max-w-xs" title={log.error_message}>
                        {log.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {log.items_found}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-green-600">
                      {log.items_imported}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-gray-500">
                      {log.items_skipped}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {formatDateTime(log.started_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {formatDuration(log.started_at, log.completed_at)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
