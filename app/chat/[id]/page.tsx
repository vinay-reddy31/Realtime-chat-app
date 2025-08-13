import ChatWindow from "../../../components/ChatWindow";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { id } = await params;
  
  if (!id || typeof id !== 'string') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-red-600 text-center">Invalid room ID</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ChatWindow roomId={id} />
    </div>
  );
}
