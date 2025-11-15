const { PocketBase } = require('pocketbase');

async function debugPocketBase() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  
  try {
    // 管理员登录
    console.log('正在登录PocketBase...');
    const authData = await pb.admins.authWithPassword('root@qq.com', '123456');
    console.log('✅ 登录成功，管理员ID:', authData.record.id);
    
    // 检查students集合
    console.log('\n--- 检查students集合 ---');
    try {
      const collections = await pb.collections.getFullList();
      const studentsCollection = collections.find(c => c.name === 'students');
      console.log('students集合:', studentsCollection ? '存在' : '不存在');
      if (studentsCollection) {
        console.log('集合ID:', studentsCollection.id);
        console.log('集合名称:', studentsCollection.name);
        console.log('集合类型:', studentsCollection.type);
        console.log('schema:', JSON.stringify(studentsCollection.schema, null, 2));
      }
    } catch (error) {
      console.error('获取集合失败:', error.message);
    }
    
    // 尝试查询学生记录
    console.log('\n--- 尝试查询学生记录 ---');
    try {
      const records = await pb.collection('students').getList(1, 1, {
        filter: `student_id = "20222821047"`
      });
      console.log('查询成功，找到记录数:', records.items.length);
      if (records.items.length > 0) {
        console.log('第一条记录:', JSON.stringify(records.items[0], null, 2));
      }
    } catch (error) {
      console.error('查询失败:');
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      console.error('错误代码:', error.response?.code);
      console.error('错误数据:', JSON.stringify(error.response?.data, null, 2));
      console.error('完整错误对象:', JSON.stringify(error, null, 2));
    }
    
    // 尝试创建学生记录
    console.log('\n--- 尝试创建学生记录 ---');
    try {
      const newStudent = await pb.collection('students').create({
        student_id: '20222821047',
        quota: 100,
        used: 0
      });
      console.log('创建成功，学生ID:', newStudent.id);
    } catch (error) {
      console.error('创建失败:');
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      console.error('错误代码:', error.response?.code);
      console.error('错误数据:', JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('管理员登录失败:');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
  }
}

debugPocketBase();