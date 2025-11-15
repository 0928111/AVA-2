// PocketBase连接测试脚本
const PocketBase = require('pocketbase/cjs');

async function testPocketBase() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  
  try {
    console.log('正在连接PocketBase...');
    
    // 管理员登录
    await pb.admins.authWithPassword('root@qq.com', '-yV23HY6kEcsbYE');
    console.log('✅ 管理员登录成功');
    
    // 获取所有集合
    const collections = await pb.collections.getFullList();
    console.log('📋 可用集合:', collections.map(c => c.name));
    
    // 检查students集合
    const studentsCollection = collections.find(c => c.name === 'students');
    if (studentsCollection) {
      console.log('✅ students集合存在');
      console.log('📊 集合信息:', {
        name: studentsCollection.name,
        schema: studentsCollection.schema,
        id: studentsCollection.id
      });
      
      // 尝试查询学生记录
      try {
        const records = await pb.collection('students').getList(1, 1, {
          filter: `student_id = "20222821047"`
        });
        console.log('✅ 查询成功，找到记录数:', records.items.length);
      } catch (queryError) {
        console.log('❌ 查询失败:', queryError.message);
        console.log('🔍 尝试创建测试记录...');
        
        try {
          const newStudent = await pb.collection('students').create({
            student_id: '20222821047',
            quota: 100,
            used: 0
          });
          console.log('✅ 创建测试学生记录成功:', newStudent.id);
        } catch (createError) {
          console.log('❌ 创建记录失败:', createError.message);
        }
      }
    } else {
      console.log('❌ students集合不存在');
    }
    
  } catch (error) {
    console.log('❌ 连接失败:', error.message);
  }
}

testPocketBase();