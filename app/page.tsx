import { Analytics } from "@vercel/analytics/react";
import TreeVisualization from "./components/tree-visualization";

import { getServerSideConfig } from "./config/server";

const serverConfig = getServerSideConfig();

export default async function App() {
  return (
    <>
      <TreeVisualization />
      {serverConfig?.isVercel && <Analytics />}
    </>
  );
}
