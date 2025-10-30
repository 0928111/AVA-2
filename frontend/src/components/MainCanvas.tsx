import React from 'react'

export default function MainCanvas({ children }: { children?: React.ReactNode }) {
  return (
    <div className="main-canvas">
      <div className="canvas-area">可视化画布占位</div>
      {children}
    </div>
  )
}
