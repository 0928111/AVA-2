import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing image URL" }, { status: 400 });
  }

  try {
    // 解码URL
    const decodedUrl = decodeURIComponent(imageUrl);

    // 获取图片
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: new URL(decodedUrl).origin,
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      // 不跟随重定向，手动处理
      redirect: "manual",
    });

    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get("location");
      if (location) {
        // 递归处理重定向
        return GET(
          new NextRequest(
            request.url.replace(imageUrl, encodeURIComponent(location)),
          ),
        );
      }
    }

    if (!response.ok) {
      console.error(
        `[Image Proxy] Failed to fetch ${decodedUrl}: ${response.status}`,
      );
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: response.status },
      );
    }

    // 获取图片内容和类型
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // 返回图片数据
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // 缓存1小时
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[Image Proxy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const runtime = "edge";
