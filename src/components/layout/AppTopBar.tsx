import { Link } from 'react-router-dom'

export function AppTopBar() {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 py-4 backdrop-blur-lg">
      <div>
        <Link to="/" className="text-lg font-semibold text-white">
          Locademy
        </Link>
        <p className="text-sm text-slate-400">Offline course video tracker</p>
      </div>
      <div className="text-xs text-slate-500">
        <span>IndexedDB + File System Access</span>
      </div>
    </header>
  )
}
