Real-Time Collaboration Tool Task
Objective
Build a real-time collaboration system that allows multiple users to interact in a shared
session with live updates.
This assignment evaluates:
● Backend architecture (Node.js + TypeScript)
● Real-time systems (WebSockets)
● AWS deployment understanding
● Frontend state handling (React)
● Scalability thinking
Tech Stack
Backend:
● Node.js with TypeScript
● WebSocket implementation (Socket.IO or native WebSocket)
Frontend:
● React.js with TypeScript
AWS:
● Deploy backend on
Amazon EC2
Core Problem Statement
Build a real-time collaboration platform where multiple users can join a shared session and
interact live.
Features to Implement
1. Session Management
● User can:
○ Create a session
○ Join an existing session using session ID
● Each session acts as a shared workspace
2. Real-Time Activity Feed
● When a user performs an action, all users in the session should see updates instantly.
Actions:
● User joined session
● User left session
● User sent message
● User performed action (e.g., typed text)
3. Real-Time Shared Editor
● Implement a simple shared text editor:
○ Multiple users can type simultaneously
○ Changes reflect in real-time for all users
Important:
● Handle basic conflict (last write wins is fine)
4. Presence System
● Show:
○ Active users in session
○ User status (online/offline)
5. Backend APIs (Node.js + TypeScript)
Ex minimal REST APIs:
● POST /session/create
● POST /session/join
● GET /session/:id
6. WebSocket Events
Design clean event structure:
Example events:
● join_session
● leave_session
● send_message
● editor_update
7. Frontend (React + TypeScript)
Build a simple UI with:
Screens:
1. Create / Join Session
2. Collaboration Room
Inside Room:
● Shared editor
● Activity feed
● Active users list
8. AWS Requirement (Mandatory)
● Deploy backend and frontend on:
○ Amazon EC2 with nginx and CI/CD from GitHub Actions
● Ensure:
○ App runs on public IP
○ Proper environment config
Advanced Features (Bonus)
1. Message Persistence
● Store chat/messages in DB (MongoDB preferred)
● Reload session history on join
2. Scaling Awareness
● Explain how this would scale:
○ Multiple servers
○ WebSocket scaling issues
3. Use Managed WebSocket (Optional Advanced)
● Instead of custom server, explore:
○ Amazon API Gateway (WebSocket mode)
4. AI Feature (Optional Bonus)
● Add:
○ “Suggest next sentence” OR
○ “Summarize session”
Using:
● OpenAI
5. Performance Handling
● Debounce editor updates
● Avoid flooding WebSocket events
Project Structure Expectations
Backend:
src/
├── controllers/
├── services/
├── sockets/
├── routes/
├── utils/
Frontend:
src/
├── components/
├── pages/
├── services/
├── hooks/
Deliverables
1. GitHub Repository
2. Live backend URL (EC2 deployment)
3. Frontend running locally and deployed
4. README with:
○ Setup instructions
○ Architecture explanation
○ Scaling approach
Evaluation Criteria
1. Code Quality
● TypeScript usage (strict typing, no unnecessary any)
● Clean structure and modular design
2. Real-Time Implementation
● Proper WebSocket handling
● Efficient event design
3. AWS Understanding
● Deployment correctness
● Environment handling
4. Problem-Solving
● Handling multiple users
● Managing shared state