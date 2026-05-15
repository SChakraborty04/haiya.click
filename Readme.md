# Haiya.click - Real-Time Polling Platform

A high-performance, real-time polling application designed to handle high concurrency. It allows authenticated users to create secure, time-bound polls and gathers responses from both anonymous and authenticated voters via WebSockets and task queues.

## Architecture Overview

This project is separated into a decoupled Node.js API backend and a React (Vite) frontend.

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, and shadcn/ui.
- **Backend**: Node.js, Express, MongoDB (via Mongoose), Socket.io, and Valkey (Redis fork).
- **Messaging/Queueing**: Uses Valkey for Socket.io Pub/Sub adapter (handling cross-cluster WebSocket events) and for queuing poll votes dynamically.
- **Authentication**: JWT-based authentication (Access and Refresh tokens stored in cookies).

## Key Features

- **User Authentication**: Secure user registration, login, email verification via Mailtrap, and JWT rotation.
- **Dynamic Poll Creation**: Create time-bound, secure polls. Options to restrict voting to authenticated users or allow anonymous voting.
- **Real-Time Data**: Live polling results streamed securely via Socket.io.
- **High Concurrency Handling**: Incoming votes are placed in a Valkey message queue and processed asynchronously by a background submission worker, protecting the primary MongoDB database from connection spikes.
- **Poll Analytics**: Granular analytics detailing concurrent users, vote counts, and specific option tallies.
- **Email Notifications**: Automated triggers for email verification and poll result notifications when a poll reaches its expiration time.

## Prerequisites

Before running the application locally, ensure you have the following installed:
- Node.js (v20 or higher recommended)
- MongoDB (Local instance or Cloud Atlas cluster)
- Valkey or Redis (Local instance or Cloud cluster)

## Environment Configuration

Both the frontend and backend require environment variables to function correctly. 

### Backend Setup
Navigate to the `backend/` directory and copy the example `.env` file:
```bash
cd backend
cp .env.example .env
```

Update the backend `.env` variables with your local configuration:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/haiya
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development

# Valkey / Redis configuration
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_URL=redis://localhost:6379

# Email Configuration (e.g. Mailtrap Sandbox)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
SMTP_FROM_EMAIL=no_reply@haiya.click

# Frontend URLs for CORS configuration
FRONTEND_URL=http://localhost:5173
EMAIL_URL=http://localhost:5173
```

### Frontend Setup
Navigate to the `frontend/` directory and configure the environment:
```bash
cd frontend
cp .env.example .env
```

Update the frontend `.env` to point to the backend server:
```env
VITE_BACKEND_URL=http://localhost:3001
```

## Running the Application Locally

1. **Start your local databases**
   Ensure your local MongoDB and Valkey/Redis instances are actively running on their designated ports.

2. **Start the Backend**
   Open a terminal, navigate to the `backend/` folder, install dependencies, and start the development server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   The backend will bootstrap the Express server, connect to MongoDB, initialize the Socket.io adapter, and start the queue submission worker.

3. **Start the Frontend**
   Open a separate terminal, navigate to the `frontend/` folder, install dependencies, and start the Vite development server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   Open your browser and navigate to `http://localhost:5173`.

## Deployment

### Deploying the Backend (CapRover)
The backend is configured for deployment using CapRover. It utilizes a `captain-definition` file in the backend root to construct a Node.js Docker container.

If you are using the CapRover CLI:
1. Ensure your CapRover cluster has a MongoDB and Redis/Valkey instance running.
2. Configure your Environment Variables in the CapRover dashboard.
3. Deploy from the backend folder using a tar archive (to bypass Git root limitations):
   ```bash
   npm run deploy
   ```

### Deploying the Frontend (Cloudflare Pages / Vercel)
The frontend is a standard Vite application optimized for Edge networks.
1. Link your GitHub repository to your host (e.g., Cloudflare Pages).
2. Set the build command to `npm run build` or `vite build`.
3. Set the output directory to `dist`.
4. Ensure you inject the `VITE_BACKEND_URL` environment variable within your cloud provider's dashboard pointing to your deployed CapRover backend domain.

## Database Schema

The core database model consists of Users, Polls, Questions, and Responses. The relationships and structure are modeled directly in Mongoose.

![Database Schema](./static/Haiya%20V1%20DB%20Schema.drawio.svg)

## Contributing

We welcome contributions to Haiya.click! Here is how you can help out.

### Guidelines for Contributing
1. **Fork the repository**: Click the Fork button at the top right of this page to copy this repository to your GitHub account.
2. **Clone your fork**: `git clone https://github.com/your-username/haiya.click.git`
3. **Create a branch**: `git checkout -b feature/your-feature-name` or `bugfix/issue-description`
4. **Make your changes**: Write your code, and make sure everything works locally.
5. **Commit your changes**: Provide a clear, descriptive commit message. `git commit -m "Add new feature..."`
6. **Push to the branch**: `git push origin feature/your-feature-name`
7. **Open a Pull Request**: Submit a PR to the `main` branch of this repository for review.

### Reporting Issues
If you encounter a bug, have a feature request, or need help, please open an issue in the issue tracker.
When creating an issue, include:
- A clear and descriptive title.
- Steps to reproduce the bug (if applicable).
- Expected behavior vs. actual behavior.
- Environment details (Node version, OS, browser, etc.).

## Contributors

Contributions, issues, and feature requests are welcome. Feel free to check the [issues page](https://github.com/your-repo/issues) if you want to contribute.

A huge thanks to everyone who has helped build Haiya.click!

- [SChakraborty04](https://github.com/SChakraborty04/)