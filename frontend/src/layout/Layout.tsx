import React from 'react'
import SidebarLeft from '../components/SidebarLeft'
import SidebarRight from '../components/SidebarRight'
import MainCanvas from '../components/MainCanvas'
import AIFloatingPanel from '../components/AIFloatingPanel'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <aside className="left"><SidebarLeft /></aside>
      <main className="main"><MainCanvas>{children}</MainCanvas></main>
      <aside className="right"><SidebarRight /></aside>
      <AIFloatingPanel />
      <div className="statusbar">状态栏：未连接</div>
    </div>
  )
}
