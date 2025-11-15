/**
 * 学号管理工具函数
 * 用于在前端管理学生的学号信息
 */

const STUDENT_ID_KEY = "student_id";

/**
 * 从localStorage获取学号
 * @returns 学号字符串，如果不存在则返回null
 */
export function getStudentId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem(STUDENT_ID_KEY);
  } catch (error) {
    console.error("[StudentId] 获取学号失败:", error);
    return null;
  }
}

/**
 * 保存学号到localStorage
 * @param studentId 学号字符串
 */
export function setStudentId(studentId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STUDENT_ID_KEY, studentId.trim());
    console.log("[StudentId] 学号已保存:", studentId);
  } catch (error) {
    console.error("[StudentId] 保存学号失败:", error);
  }
}

/**
 * 验证学号格式
 * @param studentId 学号字符串
 * @returns 是否有效
 */
export function validateStudentId(studentId: string): boolean {
  if (!studentId || typeof studentId !== "string") {
    return false;
  }

  const trimmedId = studentId.trim();

  // 基本验证：不能为空，长度在3-20之间，只能包含字母数字
  if (trimmedId.length < 3 || trimmedId.length > 20) {
    return false;
  }

  // 只允许字母和数字
  const validPattern = /^[a-zA-Z0-9]+$/;
  return validPattern.test(trimmedId);
}

/**
 * 检查是否已存在学号
 * @returns 是否存在学号
 */
export function hasStudentId(): boolean {
  const studentId = getStudentId();
  return studentId !== null && studentId.trim().length > 0;
}

/**
 * 清除学号
 */
export function clearStudentId(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STUDENT_ID_KEY);
    console.log("[StudentId] 学号已清除");
  } catch (error) {
    console.error("[StudentId] 清除学号失败:", error);
  }
}
