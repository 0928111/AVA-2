// 测试Coze API集成的简单接口
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, graph_data } = body;

    console.log("[Test API] 收到测试请求:");
    console.log("[Test API] 消息:", message);
    console.log("[Test API] 图数据:", graph_data);

    // 模拟Coze API响应
    const mockResponse = {
      content: `这是模拟的PageRank算法解释。让我逐步解释：

首先，我们有以下网页结构：
- 页面A: 初始排名 0.33
- 页面B: 初始排名 0.33  
- 页面C: 初始排名 0.33

在第一次迭代后，排名更新为：
- 页面A: 0.15
- 页面B: 0.25
- 页面C: 0.30

这个过程会继续直到收敛。

<!-- {
  "nodes": [
    {"id": "A", "rank": 0.15, "label": "A"},
    {"id": "B", "rank": 0.25, "label": "B"},
    {"id": "C", "rank": 0.30, "label": "C"}
  ],
  "links": [
    {"source": "A", "target": "B", "weight": 1},
    {"source": "B", "target": "C", "weight": 1}
  ],
  "currentIteration": 1,
  "maxIterations": 10,
  "dampingFactor": 0.85,
  "threshold": 0.0001
} -->`,
      is_completed: true,
    };

    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[Test API] 错误:", error);
    return new Response(
      JSON.stringify({
        error: true,
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
