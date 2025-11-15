"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateStudentId, setStudentId } from "@/app/utils/student-id";
import styles from "./login.module.scss";

export default function StudentLoginPage() {
  const [studentId, setStudentIdInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!studentId.trim()) {
      setError("请输入学号");
      return;
    }

    if (!validateStudentId(studentId)) {
      setError("学号格式不正确，只能包含字母和数字，长度3-20位");
      return;
    }

    setLoading(true);

    try {
      // 保存学号到localStorage
      setStudentId(studentId.trim());
      console.log("[Login] 学号验证成功，保存并跳转首页");

      // 跳转到首页
      router.push("/");
    } catch (err) {
      setError("保存学号失败，请重试");
      console.error("[Login] 保存学号失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleSubmit(e);
    }
  };

  return (
    <div className={styles["login-container"]}>
      <div className={styles["login-card"]}>
        <div className={styles["login-header"]}>
          <h1>学生登录</h1>
          <p>请输入您的学号开始使用</p>
        </div>

        <form onSubmit={handleSubmit} className={styles["login-form"]}>
          <div className={styles["form-group"]}>
            <label htmlFor="studentId">学号</label>
            <input
              id="studentId"
              type="text"
              value={studentId}
              onChange={(e) => setStudentIdInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入学号"
              className={error ? styles["input-error"] : ""}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div className={styles["error-message"]}>{error}</div>}

          <button
            type="submit"
            className={styles["submit-button"]}
            disabled={loading}
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className={styles["login-footer"]}>
          <p>学号格式：字母和数字组合，长度3-20位</p>
        </div>
      </div>
    </div>
  );
}
