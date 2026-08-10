import Sidebar from './Sidebar.jsx'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex bg-canvas">
      <Sidebar />
      <main className="flex-1 px-8 py-7 max-w-4xl">{children}</main>
    </div>
  )
}
