// 定义类型
interface TreeNode {
  id: string;
  label: string;
  href: string;
}

interface TreeLink {
  source: string;
  target: string;
  weight: number;
}

interface ParseResult {
  nodes: TreeNode[];
  links: TreeLink[];
  parsedCount: number;
}

/**
 * 从HTML代码中解析链接并生成树形结构数据
 * @param code HTML代码字符串
 * @returns 解析结果，包含节点、链接和解析数量
 */
export function parseLinks(code: string): ParseResult {
  const nodes: TreeNode[] = [];
  const links: TreeLink[] = [];
  let parsedCount = 0;

  try {
    // 使用DOMParser API解析HTML，更健壮地处理各种HTML格式
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, "text/html");

    // 获取所有<a>标签
    const linkElements = doc.querySelectorAll("a");

    // 解析链接
    linkElements.forEach((link) => {
      const href = link.getAttribute("href");
      const label = link.textContent?.trim() || "";

      // 跳过没有href属性或空标签的链接
      if (!href || !label) return;

      parsedCount++;

      // 生成节点ID：处理Windows路径，替换\为/，去除扩展名和特殊字符
      let processedHref = href
        .replace(/\\/g, "/") // 将Windows路径分隔符转为Web路径分隔符
        .replace(/^[a-zA-Z]:\//, "") // 去除Windows盘符前缀
        .replace(/^\/+/, ""); // 去除开头的斜杠

      // 处理路径，生成节点ID和父路径
      let pathParts = processedHref.split("/");
      let filename = pathParts[pathParts.length - 1];
      let parentPath = pathParts.slice(0, -1).join("/");

      // 生成节点ID
      let nodeId = filename
        .replace(/\.[^/.]+$/, "") // 去除扩展名
        .replace(/[^a-zA-Z0-9]/g, "-") // 替换特殊字符为连字符
        .replace(/-+/g, "-") // 合并连续连字符
        .toLowerCase(); // 转为小写

      // 如果是多级路径，生成完整的节点ID
      if (parentPath) {
        let parentId = parentPath
          .replace(/\/+/g, "-") // 将路径分隔符转为连字符
          .replace(/[^a-zA-Z0-9-]/g, "-") // 替换特殊字符为连字符
          .replace(/-+/g, "-") // 合并连续连字符
          .toLowerCase(); // 转为小写
        nodeId = `${parentId}-${nodeId}`;
      }

      // 处理首页特殊情况
      if (nodeId === "index" || nodeId === "") {
        nodeId = "home";
      }

      // 检查节点是否已存在
      const existingNodeIndex = nodes.findIndex((n) => n.id === nodeId);
      if (existingNodeIndex !== -1) {
        // 更新现有节点的标签
        nodes[existingNodeIndex].label = label;
      } else {
        // 添加新节点
        nodes.push({
          id: nodeId,
          label: label,
          href: href,
        });
      }
    });
  } catch (error) {
    console.error("HTML解析错误:", error);
    // 如果DOMParser解析失败，回退到正则表达式解析
    const linkRegex =
      /<a\s+[^>]*href\s*=\s*["']([^"'\s]+)["'][^>]*>([^<]+)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(code)) !== null) {
      const href = match[1];
      const label = match[2].trim();
      if (!href || !label) continue;

      parsedCount++;

      let processedHref = href
        .replace(/\\/g, "/")
        .replace(/^[a-zA-Z]:\//, "")
        .replace(/^\/+/, "");

      let nodeId = processedHref
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();

      if (nodeId === "index" || nodeId === "") {
        nodeId = "home";
      }

      const existingNodeIndex = nodes.findIndex((n) => n.id === nodeId);
      if (existingNodeIndex !== -1) {
        nodes[existingNodeIndex].label = label;
      } else {
        nodes.push({
          id: nodeId,
          label: label,
          href: href,
        });
      }
    }
  }

  // 确保首页节点存在
  if (!nodes.find((n) => n.id === "home")) {
    nodes.push({
      id: "home",
      label: "首页",
      href: "index.html",
    });
  }

  // 生成链接：基于节点ID的路径结构
  // 1. 提取所有节点的ID
  const nodeNames = new Set(nodes.map((n) => n.id));

  // 2. 构建链接：根据节点ID的路径结构
  nodes.forEach((node) => {
    if (node.id === "home") return; // 跳过首页

    // 查找父节点：尝试去掉最后一个连字符后的部分作为父节点ID
    let parentId = node.id;
    let foundParent = false;

    // 尝试不同层级的父节点
    let lastHyphenIndex = parentId.lastIndexOf("-");
    while (lastHyphenIndex !== -1) {
      parentId = parentId.substring(0, lastHyphenIndex);
      if (nodeNames.has(parentId)) {
        // 检查是否已经存在相同的链接
        const linkExists = links.some(
          (link) => link.source === parentId && link.target === node.id,
        );
        if (!linkExists) {
          links.push({
            source: parentId,
            target: node.id,
            weight: 1,
          });
        }
        foundParent = true;
        break;
      }
      lastHyphenIndex = parentId.lastIndexOf("-");
    }

    // 如果没有找到父节点，将其作为首页的直接子节点
    if (!foundParent) {
      // 检查是否已经存在相同的链接
      const linkExists = links.some(
        (link) => link.source === "home" && link.target === node.id,
      );
      if (!linkExists) {
        links.push({
          source: "home",
          target: node.id,
          weight: 1,
        });
      }
    }
  });

  // 3. 确保每个节点都有父节点
  nodes.forEach((node) => {
    if (node.id === "home") return; // 跳过首页

    // 检查节点是否已经有父节点
    const hasParent = links.some((link) => link.target === node.id);
    if (!hasParent) {
      // 如果没有父节点，将其作为首页的直接子节点
      links.push({
        source: "home",
        target: node.id,
        weight: 1,
      });
    }
  });

  return {
    nodes,
    links,
    parsedCount,
  };
}

/**
 * 生成BFS遍历序列
 * @param nodes 节点列表
 * @param links 链接列表
 * @param startNode 起始节点ID
 * @returns BFS遍历序列
 */
export function generateBFSOrder(
  nodes: TreeNode[],
  links: TreeLink[],
  startNode: string = "home",
): string[] {
  const visited = new Set<string>();
  const queue: string[] = [startNode];
  const order: string[] = [];

  // 构建邻接表
  const adjacencyList: Record<string, string[]> = {};
  nodes.forEach((node) => {
    adjacencyList[node.id] = [];
  });
  links.forEach((link) => {
    if (adjacencyList[link.source]) {
      adjacencyList[link.source].push(link.target);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!visited.has(current)) {
      visited.add(current);
      order.push(current);

      // 将邻居节点加入队列
      const neighbors = adjacencyList[current] || [];
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      });
    }
  }

  return order;
}

/**
 * 生成DFS遍历序列
 * @param nodes 节点列表
 * @param links 链接列表
 * @param startNode 起始节点ID
 * @returns DFS遍历序列
 */
export function generateDFSOrder(
  nodes: TreeNode[],
  links: TreeLink[],
  startNode: string = "home",
): string[] {
  const visited = new Set<string>();
  const order: string[] = [];

  // 构建邻接表
  const adjacencyList: Record<string, string[]> = {};
  nodes.forEach((node) => {
    adjacencyList[node.id] = [];
  });
  links.forEach((link) => {
    if (adjacencyList[link.source]) {
      adjacencyList[link.source].push(link.target);
    }
  });

  // DFS递归函数
  function dfs(nodeId: string) {
    if (!visited.has(nodeId)) {
      visited.add(nodeId);
      order.push(nodeId);

      const neighbors = adjacencyList[nodeId] || [];
      neighbors.forEach((neighbor) => {
        dfs(neighbor);
      });
    }
  }

  dfs(startNode);
  return order;
}

/**
 * 验证树结构是否无环
 * @param nodes 节点列表
 * @param links 链接列表
 * @returns 是否无环
 */
export function isTreeAcyclic(nodes: TreeNode[], links: TreeLink[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  // 构建邻接表
  const adjacencyList: Record<string, string[]> = {};
  nodes.forEach((node) => {
    adjacencyList[node.id] = [];
  });
  links.forEach((link) => {
    if (adjacencyList[link.source]) {
      adjacencyList[link.source].push(link.target);
    }
  });

  // DFS检测环
  function hasCycle(nodeId: string): boolean {
    if (!visited.has(nodeId)) {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacencyList[nodeId] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && hasCycle(neighbor)) {
          return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }
    }
    recursionStack.delete(nodeId);
    return false;
  }

  // 检查所有节点
  for (const node of nodes) {
    if (hasCycle(node.id)) {
      return false;
    }
  }

  return true;
}
