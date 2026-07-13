// All app data (no DB): metadata in localStorage, file blobs in IndexedDB.
const K = {
  admin: 'antinfu_admin',
  masters: 'antinfu_masters',
  users: 'antinfu_users',
  session: 'antinfu_session',
}

// Default admin credentials (change after first login in a real deployment).
const DEFAULT_ADMIN = { username: 'admin', password: 'admin123' }

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

// ---- Admin ----
export function getAdmin() {
  const a = read(K.admin, null)
  if (!a) {
    write(K.admin, DEFAULT_ADMIN)
    return DEFAULT_ADMIN
  }
  return a
}
export function setAdmin(admin) { write(K.admin, admin) }

// ---- Masters ----  (a "master" = a named file category/type holding files)
export function getMasters() { return read(K.masters, []) }
export function setMasters(list) { write(K.masters, list) }

// ---- Users ----
export function getUsers() { return read(K.users, []) }
export function setUsers(list) { write(K.users, list) }

// ---- Session ----
export function getSession() { return read(K.session, null) }
export function setSession(s) {
  if (s) write(K.session, s)
  else localStorage.removeItem(K.session)
}

// ---- Credential generator ----
export function genCredentials(prefix = 'user') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rand = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const abc = 'abcdefghijkmnpqrstuvwxyz'
  const num = '23456789'
  const sym = '@#$%'
  const pick = (s) => s[Math.floor(Math.random() * s.length)]
  const username = prefix + '-' + rand(4).toLowerCase()
  const password =
    pick(abc).toUpperCase() +
    Array.from({ length: 4 }, () => pick(abc)).join('') +
    Array.from({ length: 3 }, () => pick(num)).join('') +
    pick(sym)
  return { username, password }
}
