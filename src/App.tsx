import { Link, Route, Routes } from 'react-router-dom'
import { SideBySide } from './components/SideBySide'
import { HubShell } from './components/hub/HubShell'
import { PhoneApp } from './components/phone/PhoneApp'

export default function App() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <nav className="flex gap-4 border-b border-stone-200 bg-white px-6 py-3 text-sm font-semibold">
        <Link to="/">Side-by-side</Link>
        <Link to="/phone">Phone</Link>
        <Link to="/hub">Hub</Link>
      </nav>
      <Routes>
        <Route path="/" element={<SideBySide />} />
        <Route path="/phone" element={<PhoneApp />} />
        <Route path="/hub" element={<HubShell />} />
      </Routes>
    </div>
  )
}
