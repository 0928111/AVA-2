# 功能实现示例

## 1. 移除冗余"遍历模式"按钮后的代码示例

### 修改前的代码（冗余按钮）
```javascript
/* 步骤控制 */
<div className={styles.controls}>
  <span className={styles.chip}>遍历模式</span>
  <button 
    className={`${styles.btnSm} ${traversalMode === 'bfs' ? styles.active : ''}`} 
    data-mode="bfs"
    onClick={() => handleModeChange('bfs')}
  >
    BFS
  </button>
  <button 
    className={`${styles.btnSm} ${traversalMode === 'dfs' ? styles.active : ''}`} 
    data-mode="dfs"
    onClick={() => handleModeChange('dfs')}
  >
    DFS
  </button>
  <button className={styles.btnSm} data-step="prev" onClick={() => handleStep('prev')}>
    上一步
  </button>
  <button className={styles.btnSm} data-step="next" onClick={() => handleStep('next')}>
    下一步
  </button>
  <button className={styles.btnSm} data-step="reset" onClick={() => handleStep('reset')}>
    重置
  </button>
</div>
```

### 修改后的代码（移除冗余按钮）
```javascript
/* 步骤控制 */
<div className={styles.controls}>
  <button className={styles.btnSm} data-step="prev" onClick={() => handleStep('prev')}>
    上一步
  </button>
  <button className={styles.btnSm} data-step="next" onClick={() => handleStep('next')}>
    下一步
  </button>
  <button className={styles.btnSm} data-step="reset" onClick={() => handleStep('reset')}>
    重置
  </button>
</div>
```

## 2. 文件夹系统模式实现示例

### 修改后的 `parseLinks` 函数
```javascript
export function parseLinks(code: string): ParseResult {
  const nodes: TreeNode[] = [];
  const links: TreeLink[] = [];
  let parsedCount = 0;
  
  // 正则表达式匹配<a href>标签
  const linkRegex = /<a\s+href\s*=\s*"([^"\s]+)"\s*>([^<]+)<\/a>/gi;
  let match;
  
  // 解析链接
  while ((match = linkRegex.exec(code)) !== null) {
    const href = match[1];
    const label = match[2];
    parsedCount++;
    
    // 生成节点ID：处理文件夹路径，替换/为-，去除index.html
    let nodeId = href.replace(/\/index\.html$/, "") // 处理index.html
                     .replace(/\.[^/.]+$/, "") // 去除扩展名
                     .replace(/\//g, "-") // 替换路径分隔符为连字符
                     .replace(/-+/g, "-") // 合并连续连字符
                     .toLowerCase(); // 转为小写
    
    // 处理首页特殊情况
    if (nodeId === "index" || nodeId === "") {
      nodeId = "home";
    }
    
    // 检查节点是否已存在
    const existingNodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (existingNodeIndex !== -1) {
      // 更新现有节点的标签
      nodes[existingNodeIndex].label = label;
    } else {
      // 添加新节点
      nodes.push({
        id: nodeId,
        label: label,
        href: href
      });
    }
  }
  
  // 确保首页节点存在
  if (!nodes.find(n => n.id === "home")) {
    nodes.push({
      id: "home",
      label: "首页",
      href: "index.html"
    });
  }
  
  // 生成链接：基于节点ID的层级关系
  const nodeNames = new Set(nodes.map(n => n.id));
  
  nodes.forEach(node => {
    if (node.id === "home") return;
    
    // 查找父节点：尝试去掉最后一个连字符后的部分
    let parentId = node.id;
    let foundParent = false;
    
    while (parentId.lastIndexOf("-") !== -1) {
      parentId = parentId.substring(0, parentId.lastIndexOf("-"));
      if (nodeNames.has(parentId)) {
        links.push({
          source: parentId,
          target: node.id,
          weight: 1
        });
        foundParent = true;
        break;
      }
    }
    
    // 如果没有找到父节点，将其作为首页的直接子节点
    if (!foundParent) {
      links.push({
        source: "home",
        target: node.id,
        weight: 1
      });
    }
  });
  
  return {
    nodes,
    links,
    parsedCount
  };
}
```

## 3. 本地文件系统读取示例

### 本地文件结构示例
```
中华文化传播网站/
├── index.html          # 首页
├── calligraphy.html    # 书法（直接文件）
├── painting/           # 绘画（文件夹）
│   ├── index.html      # 绘画首页
│   └── landscape.html  # 山水画
└── poetry/             # 诗词（文件夹）
    ├── index.html      # 诗词首页
    ├── tang/           # 唐诗（子文件夹）
    │   └── index.html  # 唐诗首页
    └── song.html       # 宋词
```

### 本地文件读取代码示例
```javascript
// 本地文件读取功能
const readLocalFiles = async (folderPath: string) => {
  try {
    const files = await fs.promises.readdir(folderPath, { withFileTypes: true });
    const htmlFiles: string[] = [];
    
    for (const file of files) {
      const filePath = path.join(folderPath, file.name);
      if (file.isDirectory()) {
        // 递归读取子文件夹
        const subFiles = await readLocalFiles(filePath);
        htmlFiles.push(...subFiles);
      } else if (file.name.endsWith('.html')) {
        // 读取HTML文件
        const content = await fs.promises.readFile(filePath, 'utf8');
        htmlFiles.push(content);
      }
    }
    
    return htmlFiles;
  } catch (error) {
    console.error('读取本地文件失败:', error);
    return [];
  }
};
```

### 路径处理与环境切换示例
```javascript
// 路径处理工具函数
const processPath = (originalPath: string, isLocal: boolean = false) => {
  if (isLocal) {
    // 本地环境：使用绝对路径
    return path.resolve(originalPath);
  } else {
    // 服务器环境：使用相对路径
    return originalPath.replace(/\\/g, '/');
  }
};

// 环境检测与切换
const isLocal = process.env.NODE_ENV === 'development';
const basePath = isLocal ? 'C:/Users/Username/Desktop/' : '/var/www/';
```

## 4. 示例HTML代码与解析结果

### 示例HTML代码
```html
<!DOCTYPE html>
<html lang="zh-CN">
<body>
  <h1>中华文化传播网站</h1>
  <!-- 一级节点 -->
  <a href="calligraphy.html">书法</a>
  <a href="painting/index.html">绘画</a>
  <!-- 二级节点 -->
  <a href="calligraphy/regular.html">楷书</a>
  <a href="painting/landscape.html">山水画</a>
  <!-- 三级节点 -->
  <a href="poetry/tang/index.html">唐诗</a>
</body>
</html>
```

### 解析结果（树结构）
```
home (首页)
├── calligraphy (书法)
│   └── calligraphy-regular (楷书)
├── painting (绘画)
│   ├── painting-landscape (山水画)
└── poetry (诗词)
    └── poetry-tang (唐诗)
```

## 5. 功能按钮优化示例

### 修改前的按钮样式
```css
.btnSm {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #f5f7ff;
  cursor: pointer;
  transition: all 0.2s ease;
}
```

### 修改后的按钮样式（优化）
```css
.btnSm {
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, #ffffff, #f5f7ff);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.12);
  
  &:hover {
    background: linear-gradient(180deg, #f0f7ff, #e0ebff);
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.18);
    transform: translateY(-1px);
  }
  
  &.active {
    background: linear-gradient(180deg, var(--primary), #1e40af);
    color: #fff;
    border-color: var(--primary);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.24);
  }
}
```