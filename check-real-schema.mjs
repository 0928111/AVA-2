import PocketBase from 'pocketbase';

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
      console.log('示例记录数据:', {
        id: records.items[0].id,
        student_id: records.items[0].student_id,
        sutdents_id: records.items[0].sutdents_id,
        name: records.items[0].name,
        quota: records.items[0].quota,
        used: records.items[0].used
      });
    }
    
  } catch (error) {
    console.error('错误:', error.message);
  }
}

checkRealSchema();