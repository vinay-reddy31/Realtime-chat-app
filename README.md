# RealTime Chat Application

A real-time chat application built with Next.js, Socket.io, and MongoDB.

## Features

- **Landing Page**: Beautiful welcome page with Sign In/Sign Up buttons
- **User Authentication**: Secure login and registration system
- **Dashboard**: View all previous conversations with a clean interface
- **New Chat**: Click the + button to start conversations with other users
- **Real-time Messaging**: Instant message delivery with Socket.io
- **User Management**: Easy discovery of other users in the system
- **Responsive Design**: Works on desktop and mobile devices

## App Flow

1. **Landing Page** (`/`) - Welcome page with Sign In/Sign Up options
2. **Login/Register** (`/login`) - Authentication page for existing and new users
3. **Dashboard** (`/dashboard`) - Main interface showing all conversations
4. **Chat Window** (`/chat/[roomId]`) - Individual chat conversations

## How to Use

### For New Users:
1. Visit the landing page
2. Click "Sign Up" to create an account
3. Fill in your name, email, and password
4. You'll be redirected to the dashboard

### For Existing Users:
1. Visit the landing page
2. Click "Sign In" to access your account
3. Enter your email and password
4. You'll see your dashboard with all previous conversations

### Starting New Chats:
1. On the dashboard, click the "+" button
2. Select a user from the list of available users
3. A new conversation will be created automatically
4. Start chatting immediately!

## Technical Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Real-time**: Socket.io
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens (stored in localStorage)

## Project Structure

```
realtime-chat/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── conversations/ # Conversation management
│   │   └── users/         # User management
│   ├── chat/              # Chat interface
│   ├── dashboard/         # Main dashboard
│   ├── login/             # Authentication pages
│   └── page.tsx           # Landing page
├── components/             # Reusable components
├── lib/                    # Utility functions
├── models/                 # Database models
└── server.js               # Socket.io server
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
4. Run the development server: `npm run dev`
5. Start the Socket.io server: `node server.js`

## Environment Variables

Create a `.env.local` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/realtime-chat
```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/users` - List all users
- `GET /api/users/[id]` - Get specific user
- `GET /api/conversations` - List user conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/[roomId]/messages` - Get chat messages

## Socket Events

- `join_room` - Join a chat room
- `private_message` - Send/receive private messages
- `online_users` - List of online users

## Security Features

- JWT token authentication
- Protected routes with authentication middleware
- Input validation and sanitization
- Secure password handling

## Future Enhancements

- Message encryption
- File sharing
- Group chats
- Push notifications
- Message search
- User profiles and avatars
- Typing indicators
- Message reactions
