import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './layout/Layout'
import PageRankPage from './pages/PageRankPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<PageRankPage />} />
      </Routes>
    </Layout>
  )
}
