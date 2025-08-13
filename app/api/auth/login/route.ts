// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "../../../../lib/dbConnect";
import User from "../../../../models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET not set in environment variables");
  throw new Error("JWT_SECRET not set in .env.local");
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" }, 
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { message: "Invalid input types" }, 
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findOne({ email }).exec();
    
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" }, 
        { status: 401 }
      );
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return NextResponse.json(
        { message: "Invalid credentials" }, 
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { 
        sub: user._id.toString(), 
        email: user.email, 
        name: user.name 
      }, 
      JWT_SECRET as string, 
      { expiresIn: "7d" }
    );

    // set httpOnly cookie (NextResponse can set cookies)
    const res = NextResponse.json(
      { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        token 
      }, 
      { status: 200 }
    );
    
    // set cookie for 7 days
    res.cookies.set("token", token, { 
      httpOnly: true, 
      path: "/", 
      maxAge: 7 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { message: "Internal server error" }, 
      { status: 500 }
    );
  }
}