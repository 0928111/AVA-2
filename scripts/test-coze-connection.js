// Coze API连接测试脚本
const https = require('https');
const http = require('http');

// ASCII检测函数
function isAsciiOnly(str) {
    for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 127) {
            return false;
        }
    }
    return true;
}

// 从环境变量获取API密钥
require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.COZE_API_KEY;
const botId = process.env.COZE_BOT_ID;
const baseUrl = process.env.COZE_BASE_URL || 'https://api.coze.cn';

console.log('=== Coze API连接测试 ===');
console.log('Base URL:', baseUrl);
console.log('Bot ID:', botId);
console.log('API Key存在:', !!apiKey);

if (apiKey) {
    console.log('API Key ASCII检测:', isAsciiOnly(apiKey) ? '✅ 通过' : '❌ 失败');
    console.log('API Key长度:', apiKey.length);
    console.log('API Key前10位:', apiKey.substring(0, 10) + '...');
}

// 测试DNS解析
function testDNS() {
    return new Promise((resolve) => {
        const url = new URL(baseUrl);
        console.log('\n=== DNS解析测试 ===');
        console.log('主机名:', url.hostname);
        
        https.get(`${baseUrl}/v3/bot/get_online_bots`, (res) => {
            console.log('DNS解析: ✅ 成功');
            console.log('HTTP连接: ✅ 成功');
            console.log('状态码:', res.statusCode);
            console.log('响应头:', res.headers);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('响应数据:', data.substring(0, 200));
                resolve(true);
            });
            
        }).on('error', (err) => {
            console.log('连接失败:', err.message);
            console.log('错误码:', err.code);
            console.log('错误堆栈:', err.stack);
            resolve(false);
        });
    });
}

// 测试API密钥有效性
async function testAPIKey() {
    if (!apiKey || !botId) {
        console.log('\n=== API密钥测试跳过 ===');
        console.log('缺少API密钥或Bot ID');
        return;
    }
    
    console.log('\n=== API密钥有效性测试 ===');
    
    const testPayload = {
        bot_id: botId,
        user: 'user',
        stream: false,
        query: 'Hello, this is a test message from Node.js'
    };
    
    console.log('请求负载:', JSON.stringify(testPayload, null, 2));
    
    const options = {
        hostname: 'api.coze.cn',
        port: 443,
        path: '/v3/chat',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'VisualCodeChat-Test/1.0'
        },
        timeout: 10000 // 10秒超时
    };
    
    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            console.log('API响应状态码:', res.statusCode);
            console.log('API响应头:', res.headers);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('API响应数据:', data);
                
                try {
                    const jsonData = JSON.parse(data);
                    if (jsonData.code === 0) {
                        console.log('✅ API密钥有效，调用成功');
                    } else {
                        console.log('❌ API调用失败，错误码:', jsonData.code);
                        console.log('错误信息:', jsonData.msg);
                    }
                } catch (e) {
                    console.log('响应解析失败:', e.message);
                }
                
                resolve(true);
            });
        });
        
        req.on('error', (err) => {
            console.log('API请求失败:', err.message);
            console.log('错误类型:', err.code);
            resolve(false);
        });
        
        req.on('timeout', () => {
            console.log('API请求超时');
            req.destroy();
            resolve(false);
        });
        
        req.write(JSON.stringify(testPayload));
        req.end();
    });
}

// 测试CORS和浏览器环境
function testBrowserEnvironment() {
    console.log('\n=== 浏览器环境测试 ===');
    console.log('提示: 请在浏览器控制台中运行以下代码:');
    console.log(`
// 浏览器环境测试
(async function() {
    console.log('=== 浏览器API测试 ===');
    
    // 测试fetch API
    try {
        const response = await fetch('https://api.coze.cn/v3/bot/get_online_bots', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ${apiKey}',
                'Content-Type': 'application/json'
            },
            mode: 'cors' // 关键：测试CORS
        });
        
        console.log('CORS状态:', response.ok ? '✅ 成功' : '❌ 失败');
        console.log('响应状态:', response.status);
        console.log('响应头:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.text();
        console.log('响应数据:', data.substring(0, 200));
        
    } catch (error) {
        console.log('浏览器请求失败:', error.message);
        console.log('错误类型:', error.name);
        if (error.message.includes('CORS')) {
            console.log('这看起来是CORS问题');
        }
    }
})();
    `);
}

// 主测试流程
async function main() {
    await testDNS();
    await testAPIKey();
    testBrowserEnvironment();
    
    console.log('\n=== 测试总结 ===');
    console.log('如果DNS和API测试都成功，但浏览器仍然失败，问题可能是:');
    console.log('1. CORS跨域问题');
    console.log('2. 浏览器安全策略');
    console.log('3. Service Worker拦截');
    console.log('4. 请求头格式问题');
    console.log('5. 网络代理或防火墙');
}

main().catch(console.error);