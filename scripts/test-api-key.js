// API密钥ASCII字符测试脚本
const fs = require('fs');
const path = require('path');

function isAsciiOnly(str) {
    for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 127) {
            return false;
        }
    }
    return true;
}

function analyzeString(str, name) {
    console.log(`\n=== 分析 ${name} ===`);
    console.log(`原始字符串: "${str}"`);
    console.log(`长度: ${str.length}`);
    console.log(`ASCII检测: ${isAsciiOnly(str) ? '✅ 纯ASCII' : '❌ 包含非ASCII字符'}`);
    
    if (!isAsciiOnly(str)) {
        console.log('非ASCII字符位置:');
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const code = str.charCodeAt(i);
            if (code > 127) {
                console.log(`  位置 ${i}: "${char}" (字符编码: ${code})`);
            }
        }
    }
    
    // 检查是否有不可见字符
    console.log('字符详细分析:');
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const code = str.charCodeAt(i);
        const visible = code >= 32 && code <= 126;
        console.log(`  [${i}] "${visible ? char : '•'}" (编码: ${code}) ${visible ? '' : '[不可见字符]'}`);
    }
}

// 从环境变量文件读取API密钥
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKeyMatch = envContent.match(/COZE_API_KEY=(.*)/);
    
    if (apiKeyMatch) {
        const apiKey = apiKeyMatch[1].trim();
        analyzeString(apiKey, '环境变量中的COZE_API_KEY');
    } else {
        console.log('未找到COZE_API_KEY');
    }
} else {
    console.log('未找到.env.local文件');
}

// 检查本地存储中的API密钥
console.log('\n=== 检查浏览器本地存储 ===');
console.log('请在浏览器控制台中运行以下代码:');
console.log(`
// 检查localStorage中的API密钥
const accessStore = localStorage.getItem('access-store');
if (accessStore) {
    const parsed = JSON.parse(accessStore);
    console.log('localStorage中的cozeApiKey:', parsed.cozeApiKey);
    if (parsed.cozeApiKey) {
        // 复制这里的检测代码
        ${isAsciiOnly.toString()}
        console.log('ASCII检测结果:', isAsciiOnly(parsed.cozeApiKey));
    }
}
`);