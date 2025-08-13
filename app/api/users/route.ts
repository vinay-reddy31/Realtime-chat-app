// app/api/users/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "../../../lib/dbConnect";
import User from "../../../models/User";

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find().select("_id name email avatarUrl").lean();
    return NextResponse.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    return NextResponse.json(
      { message: "Failed to fetch users" }, 
      { status: 500 }
    );
  }
}
