// models/Message.ts
import mongoose, { Document, Model } from "mongoose";

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  roomId: string;
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  text: string;
  read?: boolean;
}

const MessageSchema = new mongoose.Schema<IMessage>(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    roomId: { type: String, required: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
export default Message;
