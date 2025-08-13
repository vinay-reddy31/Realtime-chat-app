"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { initSocket } from "../../lib/socket";

type Conversation = {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
  }>;
  lastMessage?: {
    text: string;
    createdAt: string;
    from: string;
  };
  unreadCount: number;
};

export default function DashboardPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const router = useRouter();

  const myId = typeof window !== 'undefined' ? localStorage.getItem("userId") : null;
  const myName = typeof window !== 'undefined' ? localStorage.getItem("name") : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

  useEffect(() => {
    loadConversations();

    if (token) {
      try {
        const socket = initSocket(token);
        socket.on("online_users", (list: string[]) => setOnlineUsers(list));
        socket.on("connect_error", (error) => {
          console.error('Socket connection error:', error);
        });
        return () => {
          socket.off("online_users");
          socket.off("connect_error");
        };
      } catch (err) {
        console.error('Socket initialization error:', err);
      }
    }
  }, [token]);

  async function loadConversations() {
    if (!token || !myId) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/conversations?userId=${myId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch conversations: ${res.status}`);
      }
      
      const data = await res.json();
      setConversations(data);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("name");
    router.push("/");
  }

  function getOtherParticipant(conversation: Conversation) {
    return conversation.participants.find(p => p._id !== myId);
  }

  function getRoomId(conversation: Conversation) {
    const otherId = getOtherParticipant(conversation)?._id;
    if (!otherId) return null;
    return [myId, otherId].sort().join("_");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-black">Loading conversations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 text-center">
          <div className="text-lg mb-2">Error</div>
          <div>{error}</div>
          <button 
            onClick={loadConversations} 
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">RealTime Chat</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {myName}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors duration-200"
                title="New Chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>

          {showNewChat && (
            <NewChatSection 
              myId={myId} 
              onClose={() => setShowNewChat(false)}
              onChatStart={() => {
                setShowNewChat(false);
                loadConversations();
              }}
            />
          )}

          <div className="divide-y divide-gray-200">
            {conversations.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                <p className="text-gray-500 mb-4">Start a new chat by clicking the + button above</p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              conversations.map((conversation) => {
                const otherUser = getOtherParticipant(conversation);
                const roomId = getRoomId(conversation);
                
                if (!otherUser || !roomId) return null;

                return (
                  <Link
                    key={conversation._id}
                    href={`/chat/${roomId}`}
                    className="block hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {otherUser.name ? otherUser.name[0].toUpperCase() : '?'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {otherUser.name || 'Unknown User'}
                            </p>
                            <div className="flex items-center space-x-2">
                              {onlineUsers.includes(otherUser._id) && (
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              )}
                              {conversation.lastMessage && (
                                <span className="text-xs text-gray-500">
                                  {new Date(conversation.lastMessage.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {conversation.lastMessage && (
                            <p className="text-sm text-gray-500 truncate">
                              {conversation.lastMessage.from === myId ? 'You: ' : ''}
                              {conversation.lastMessage.text}
                            </p>
                          )}
                          {conversation.unreadCount > 0 && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {conversation.unreadCount} new
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewChatSection({ myId, onClose, onChatStart }: { 
  myId: string | null; 
  onClose: () => void; 
  onChatStart: () => void; 
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        const res = await fetch("/api/users");
        if (!res.ok) {
          throw new Error(`Failed to fetch users: ${res.status}`);
        }
        const data = await res.json();
        setUsers(data.filter((u: any) => u._id !== myId));
      } catch (err) {
        console.error('Error loading users:', err);
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [myId]);

  async function startChat(userId: string) {
    try {
      if (!myId) {
        console.error("User ID is not available.");
        return;
      }
      
      const participants = [myId, userId].sort();
      const participant1Id = participants[0];
      const participant2Id = participants[1];

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          participant1Id,
          participant2Id
        })
      });
      
      if (res.ok) {
        const roomId = [myId, userId].sort().join("_");
        onChatStart();
        window.location.href = `/chat/${roomId}`;
      } else {
        console.error('Failed to create conversation');
      }
    } catch (err) {
      console.error('Error starting chat:', err);
    }
  }

  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium text-gray-900">Select a user to start chatting</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="text-gray-500">Loading users...</div>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <div className="text-red-500">Error: {error}</div>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((user) => (
            <button
              key={user._id}
              onClick={() => startChat(user._id)}
              className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-150 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {user.name ? user.name[0].toUpperCase() : '?'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {user.name || 'Unknown User'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}