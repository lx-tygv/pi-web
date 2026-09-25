import { NextResponse } from "next/server";
import { homedir } from "@/lib/home-dir";

export async function GET() {
  return NextResponse.json({ home: homedir() });
}
