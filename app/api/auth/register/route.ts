// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "../../../../lib/dbConnect";
import User from "../../../../models/User";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;
    
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required" }, 
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { message: "Invalid input types" }, 
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters long" }, 
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { message: "Invalid email format" }, 
        { status: 400 }
      );
    }

    await dbConnect();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { message: "Email already exists" }, 
        { status: 400 }
      );
    }

    const user = new User({ name, email });
    await user.setPassword(password);
    await user.save();

    // respond with created user (omit passwordHash)
    const payload = { 
      id: user._id, 
      name: user.name, 
      email: user.email, 
      avatarUrl: user.avatarUrl 
    };
    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { message: "Internal server error" }, 
      { status: 500 }
    );
  }
}
