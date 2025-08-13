// models/Conversation.ts
import mongoose, { Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid"; // ✅ Import here

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[]; // two user ids
  lastMessageAt?: Date;
  roomId: string; // ✅ Add to interface
}

const ConversationSchema = new mongoose.Schema<IConversation>(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
    ],
    roomId: {
      type: String,
      unique: true,
      required: true,
      default: uuidv4 // ✅ Auto-generate on new doc
    },
    lastMessageAt: Date
  },
  { timestamps: true }
);

const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;
