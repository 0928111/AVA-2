import PocketBase from "pocketbase";

let pbInstance: PocketBase | null = null;

export async function getPb() {
  if (pbInstance) {
    return pbInstance;
  }

  const url = process.env.POCKETBASE_URL!;
  pbInstance = new PocketBase(url);

  const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
  const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

  try {
    if (adminEmail && adminPassword) {
      const authData = await pbInstance.admins.authWithPassword(
        adminEmail,
        adminPassword,
      );
      console.log("[PocketBase] 管理员认证成功");
      console.log("[PocketBase] 管理员:", authData.record?.email || "未知邮箱");
    } else {
      console.warn("[PocketBase] 管理员凭证未配置，将以未认证方式运行");
    }
  } catch (error) {
    console.error("[PocketBase] 管理员认证失败:", error);
    // 即使认证失败也返回实例，实际使用时再处理
  }

  return pbInstance;
}
