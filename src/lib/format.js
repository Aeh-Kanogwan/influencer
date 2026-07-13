export function formatSize(bytes) {
  if (bytes == null) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export function formatDate(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export function fileExt(name) {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop().toUpperCase().slice(0, 4) : 'FILE'
}
