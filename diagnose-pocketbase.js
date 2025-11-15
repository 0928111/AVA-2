// 更详细的PocketBase诊断脚本
const PocketBase = require('pocketbase/cjs');

async function diagnosePocketBase() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  
  try {
    console.log('🔄 正在连接PocketBase...');
    
    // 管理员登录
    const authData = await pb.admins.authWithPassword('root@qq.com', '-yV23HY6kEcsbYE');
    console.log('✅ 管理员登录成功:', authData.admin.id);
    
    // 获取students集合的详细信息
    console.log('📊 获取students集合详情...');
    const collection = await pb.collections.getOne('students');
    console.log('📋 集合信息:', {
      id: collection.id,
      name: collection.name,
      type: collection.type,
      schema: collection.schema,
      indexes: collection.indexes,
      system: collection.system,
      listRule: collection.listRule,
      viewRule: collection.viewRule,
      createRule: collection.createRule,
      updateRule: collection.updateRule,
      deleteRule: collection.deleteRule
    });
    
    if (collection.schema && collection.schema.fields) {
      console.log('🔍 字段详情:');
      collection.schema.fields.forEach(field => {
        console.log(`  - ${field.name}: ${field.type} (${field.required ? '必填' : '可选'})`);
      });
    }
    
    // 尝试不同的查询方式
    console.log('\n🔍 测试查询...');
    
    // 方法1: 简单查询
    try {
      const allRecords = await pb.collection('students').getFullList();
      console.log('✅ 获取所有记录成功，数量:', allRecords.length);
      if (allRecords.length > 0) {
        console.log('📋 第一条记录:', allRecords[0]);
      }
    } catch (error) {
      console.log('❌ 获取所有记录失败:', error.message);
    }
    
    // 方法2: 带过滤的查询
    try {
      const filteredRecords = await pb.collection('students').getList(1, 10, {
        filter: 'student_id = "20222821047"'
      });
      console.log('✅ 过滤查询成功，数量:', filteredRecords.items.length);
    } catch (error) {
      console.log('❌ 过滤查询失败:', error.message);
      console.log('🔍 错误详情:', error.data || error.response || error);
    }
    
    // 尝试创建记录
    console.log('\n📝 测试创建记录...');
    try {
      const newRecord = await pb.collection('students').create({
        student_id: 'test_student_001',
        quota: 100,
        used: 0
      });
      console.log('✅ 创建记录成功:', newRecord.id);
    } catch (error) {
      console.log('❌ 创建记录失败:', error.message);
      console.log('🔍 错误详情:', error.data || error.response || error);
    }
    
  } catch (error) {
    console.log('❌ 连接失败:', error.message);
    console.log('🔍 错误详情:', error.data || error.response || error);
  }
}

diagnosePocketBase();