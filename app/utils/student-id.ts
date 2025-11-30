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
    const id = localStorage.getItem(STUDENT_ID_KEY);
    // 如果本地存的学号格式无效，清掉并要求重新登录
    if (id && !validateStudentId(id)) {
      localStorage.removeItem(STUDENT_ID_KEY);
      console.warn("[StudentId] 本地学号无效，已清除，请重新登录");
      return null;
    }
    return id;
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

  // 特殊用户：root用户始终有效
  if (trimmedId === "root") {
    return true;
  }

  // 检查格式：8位数字
  if (!/^\d{8}$/.test(trimmedId)) {
    return false;
  }

  // 检查年份：前4位应该是合理的年份（2010-2029）
  const year = parseInt(trimmedId.substring(0, 4));
  const currentYear = new Date().getFullYear();
  if (year < 2010 || year > currentYear + 5) {
    return false;
  }

  return true;
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
