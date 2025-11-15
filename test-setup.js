// 测试脚本：验证 PocketBase 数据结构并创建测试数据
const { getPb } = require("./app/server/pb.ts");

async function setupTestData() {
  try {
    const pb = await getPb();
    
    if (!pb.authStore.isValid) {
      console.error("PocketBase 认证失败");
      return;
    }

    console.log("PocketBase 连接成功！");

    // 检查并创建测试学生
    let student;
    const students = await pb.collection("students").getFullList({
      filter: 'student_id = "test001"',
    });

    if (students.length === 0) {
      console.log("创建测试学生...");
      student = await pb.collection("students").create({
        student_id: "test001",
        name: "测试学生",
        quota: 100,
        used: 0,
      });
      console.log("测试学生创建成功:", student.id);
    } else {
      student = students[0];
      console.log("测试学生已存在:", student.id);
    }

    // 创建测试对话
    console.log("创建测试对话...");
    const conversation = await pb.collection("conversations").create({
      student: student.id,
      coze_conversation_id: "",
    });
    console.log("测试对话创建成功:", conversation.id);

    console.log("测试数据准备完成！");
    
  } catch (error) {
    console.error("测试数据设置失败:", error);
  }
}

setupTestData();