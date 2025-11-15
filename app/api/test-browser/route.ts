import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), "test-coze-browser.html");
    const htmlContent = fs.readFileSync(filePath, "utf-8");

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("[TestBrowser] Error serving test browser page:", error);
    return new NextResponse("Test browser page not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}
