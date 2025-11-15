// 简化的PocketBase测试
const PocketBase = require('pocketbase/cjs');

async function simpleTest() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  
  try {
    console.log('🔄 测试PocketBase连接...');
    
    // 先尝试获取集合列表，不需要认证
    try {
      const collections = await pb.collections.getFullList();
      console.log('✅ 连接成功！可用集合:', collections.map(c => c.name));
    } catch (collectionsError) {
      console.log('⚠️  获取集合列表失败:', collectionsError.message);
      console.log('🔄 继续尝试管理员登录...');
    }
    
    // 尝试管理员登录，但不依赖返回值
    console.log('🔄 尝试管理员登录...');
    try {
      await pb.admins.authWithPassword('root@qq.com', '-yV23HY6kEcsbYE');
      console.log('✅ 管理员登录成功');
      
      // 现在尝试查询学生记录
      console.log('🔄 查询学生记录...');
      const records = await pb.collection('students').getFullList();
      console.log('✅ 查询成功，找到', records.length, '条记录');
      
      if (records.length === 0) {
        console.log('📝 创建测试学生记录...');
        const newStudent = await pb.collection('students').create({
          student_id: '20222821047',
          quota: 100,
          used: 0
        });
        console.log('✅ 创建成功:', newStudent.id);
      }
      
    } catch (authError) {
      console.log('⚠️  管理员登录失败:', authError.message);
      console.log('🔄 尝试以访客身份查询...');
      
      try {
        const records = await pb.collection('students').getFullList();
        console.log('✅ 访客查询成功，找到', records.length, '条记录');
      } catch (queryError) {
        console.log('❌ 访客查询也失败:', queryError.message);
        console.log('🔍 可能是权限或集合配置问题');
      }
    }
    
  } catch (error) {
    console.log('❌ 连接失败:', error.message);
  }
}

simpleTest();