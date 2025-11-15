// 清理浏览器本地存储中的非ASCII字符脚本
// 在浏览器控制台中运行此脚本

(function() {
  console.log("=== 开始清理本地存储中的非ASCII字符 ===");
  
  // ASCII验证函数
  function isAsciiOnly(str) {
    if (!str || typeof str !== "string") return false;
    for (let i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) > 127) {
        return false;
      }
    }
    return true;
  }
  
  // 检查并清理localStorage
  function checkAndCleanLocalStorage() {
    const keys = Object.keys(localStorage);
    let cleanedCount = 0;
    
    keys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          let hasChanges = false;
          
          // 检查access相关的字段
          if (parsed.accessCode && !isAsciiOnly(parsed.accessCode)) {
            console.warn(`发现非ASCII访问码: ${key}.accessCode = "${parsed.accessCode}"`);
            parsed.accessCode = "";
            hasChanges = true;
          }
          
          if (parsed.token && !isAsciiOnly(parsed.token)) {
            console.warn(`发现非ASCII token: ${key}.token = "${parsed.token}"`);
            parsed.token = "";
            hasChanges = true;
          }
          
          if (parsed.cozeApiKey && !isAsciiOnly(parsed.cozeApiKey)) {
            console.warn(`发现非ASCII Coze API密钥: ${key}.cozeApiKey = "${parsed.cozeApiKey}"`);
            parsed.cozeApiKey = "";
            hasChanges = true;
          }
          
          if (hasChanges) {
            localStorage.setItem(key, JSON.stringify(parsed));
            cleanedCount++;
            console.log(`已清理: ${key}`);
          }
        }
      } catch (e) {
        console.error(`处理 ${key} 时出错:`, e);
      }
    });
    
    return cleanedCount;
  }
  
  // 清理sessionStorage
  function checkAndCleanSessionStorage() {
    const keys = Object.keys(sessionStorage);
    let cleanedCount = 0;
    
    keys.forEach(key => {
      try {
        const value = sessionStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          let hasChanges = false;
          
          // 同样的检查逻辑
          if (parsed.accessCode && !isAsciiOnly(parsed.accessCode)) {
            console.warn(`发现非ASCII访问码: ${key}.accessCode = "${parsed.accessCode}"`);
            parsed.accessCode = "";
            hasChanges = true;
          }
          
          if (parsed.token && !isAsciiOnly(parsed.token)) {
            console.warn(`发现非ASCII token: ${key}.token = "${parsed.token}"`);
            parsed.token = "";
            hasChanges = true;
          }
          
          if (parsed.cozeApiKey && !isAsciiOnly(parsed.cozeApiKey)) {
            console.warn(`发现非ASCII Coze API密钥: ${key}.cozeApiKey = "${parsed.cozeApiKey}"`);
            parsed.cozeApiKey = "";
            hasChanges = true;
          }
          
          if (hasChanges) {
            sessionStorage.setItem(key, JSON.stringify(parsed));
            cleanedCount++;
            console.log(`已清理: ${key}`);
          }
        }
      } catch (e) {
        console.error(`处理 ${key} 时出错:`, e);
      }
    });
    
    return cleanedCount;
  }
  
  // 执行清理
  console.log("正在检查 localStorage...");
  const localCleaned = checkAndCleanLocalStorage();
  
  console.log("正在检查 sessionStorage...");
  const sessionCleaned = checkAndCleanSessionStorage();
  
  console.log(`=== 清理完成 ===`);
  console.log(`localStorage 清理了 ${localCleaned} 个项目`);
  console.log(`sessionStorage 清理了 ${sessionCleaned} 个项目`);
  
  if (localCleaned === 0 && sessionCleaned === 0) {
    console.log("未发现需要清理的非ASCII字符数据");
  } else {
    console.log("建议刷新页面后重新配置API密钥和访问码");
  }
  
  console.log("=== 清理脚本执行完毕 ===");
})();