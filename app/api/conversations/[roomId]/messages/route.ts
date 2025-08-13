// app/api/conversations/[roomId]/messages/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

export async function GET(
  req: Request, context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;

    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json(
        { message: "Invalid room ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    const conv = await Conversation.findOne({ roomId });
    if (!conv) {
      return NextResponse.json([]);
    }

    // Populate sender info
    const messages = await Message.find({ conversation: conv._id })
      .sort({ createdAt: 1 })
      .populate("from", "name email") // Only name & email
      .lean();

    return NextResponse.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    return NextResponse.json(
      { message: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
