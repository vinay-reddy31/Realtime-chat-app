import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../lib/dbConnect";
import Conversation from "../../../models/Conversation";
import Message from "../../../models/Message";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 });
    }

    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name')
      .lean();
    
    if (conversations.length === 0) {
      return NextResponse.json([]);
    }
    
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({ conversation: conv._id })
          .sort({ createdAt: -1 })
          .lean();
          
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          to: userId,
          read: false,
        });
        
        return {
          _id: conv._id,
          participants: conv.participants,
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            createdAt: (lastMessage as any).createdAt,
            from: lastMessage.from,
          } : null,
          unreadCount: unreadCount,
        };
      })
    );
    
    return NextResponse.json(conversationsWithDetails);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const { participant1Id, participant2Id } = await request.json();
    
    if (!participant1Id || !participant2Id) {
      return NextResponse.json(
        { message: "Both participant IDs are required" },
        { status: 400 }
      );
    }
    
    const existingConversation = await Conversation.findOne({
      participants: { $all: [participant1Id, participant2Id] }
    });
    
    if (existingConversation) {
      return NextResponse.json(existingConversation);
    }
    
    const newConversation = new Conversation({
      participants: [participant1Id, participant2Id]
    });
    
    await newConversation.save();
    
    return NextResponse.json(newConversation, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}