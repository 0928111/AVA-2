const { PocketBase } = require('pocketbase/cjs');

async function checkRealSchema() {
  try {
    const pb = new PocketBase('http://127.0.0.1:8090');
    await pb.admins.authWithPassword('root@qq.com', '-yV23HY6kEcsbYE');
    
    const studentsCollection = await pb.collections.getOne('students');
    console.log('Students集合字段:');
    studentsCollection.fields.forEach(field => {
      console.log(`- ${field.name}: ${field.type} ${field.required ? '(必填)' : '(可选)'}`);
    });
    
    // 检查现有记录看实际使用的字段
    const records = await pb.collection('students').getList(1, 1);
    if (records.items.length > 0) {
      console.log('\n示例记录字段:', Object.keys(records.items[0]));
    }
    
  } catch (error) {
    console.error('错误:', error.message);
  }
}

checkRealSchema();