# Transcendence - 42 Project

A modern, full-stack implementation of the classic Pong game with real-time multiplayer capabilities and tournament system.

## 📋 Project Overview

This project is part of the 42 curriculum and implements the **Transcendence** subject (version 18.0). It features:

- 🎮 Real-time Pong gameplay
- 🏆 Tournament system with matchmaking
- 🔐 Secure HTTPS connections
- 🎨 Modern UI with TypeScript + Tailwind CSS
- ⚡ Fast backend with Fastify (Node.js)
- 🐳 Full Docker containerization

## 🏗️ Architecture

### Tech Stack

- **Frontend**: TypeScript + Vite + Tailwind CSS
- **Backend**: Fastify (Node.js)
- **Reverse Proxy**: NGINX with SSL/TLS
- **Database**: SQLite (to be implemented)
- **Containerization**: Docker + Docker Compose

### Modules Implemented

- ✅ **Major Module**: Fastify backend framework
- ✅ **Minor Module**: Tailwind CSS frontend toolkit
- 🔄 **Minor Module**: SQLite database (in progress)

### Project Structure

```
Trascendence/
├── Backend/
│   ├── Core/              # Main backend service (Fastify)
│   │   ├── Dockerfile
│   │   └── App/
│   │       ├── package.json
│   │       └── src/
│   │           ├── index.js
│   │           └── services/
│   └── servizio/          # Secondary backend service
│       ├── Dockerfile
│       └── App/
├── Frontend/              # TypeScript + Tailwind CSS
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.ts        # SPA Router + App logic
│       └── style.css
├── nginx/                 # Reverse proxy with SSL
│   ├── Dockerfile
│   ├── nginx.conf
│   └── conf.d/
│       └── default.conf
├── docker-compose.yaml
└── Makefile
```

## 🚀 Getting Started

### Prerequisites

- Docker
- Docker Compose
- Make (optional, for shortcuts)

### Installation & Running

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Trascendence
   ```

2. **Build and start the project**:
   ```bash
   make
   # or
   docker compose -f docker-compose.yaml up --build
   ```

3. **Access the application**:
   - Open your browser and navigate to: `https://localhost`
   - Accept the self-signed certificate warning (it's safe for development)

### Makefile Commands

```bash
make                # Build and start all services
make up             # Start containers (without rebuild)
make down           # Stop all containers
make clean          # Stop and remove all containers, images, volumes
make restart        # Restart all services
make prune          # Deep clean (removes all Docker resources)
make help           # Show all available commands
```

## 🔐 Security Features

- ✅ HTTPS/TLS encryption (self-signed certificate for development)
- ✅ Secure headers (HSTS, X-Frame-Options, etc.)
- 🔄 Password hashing (to be implemented)
- 🔄 XSS/SQL injection protection (to be implemented)
- 🔄 Form validation (to be implemented)

## 📝 API Endpoints

### Backend Core (port 3000)
- `GET /health` - Health check endpoint

Access via NGINX:
- `https://localhost/api/core/*`

### Backend Servizio (port 3001)
- `GET /health` - Health check endpoint

Access via NGINX:
- `https://localhost/api/servizio/*`

### WebSocket (for real-time game)
- `wss://localhost/ws` - WebSocket connection

## 🎮 Features

### Current Features
- ✅ Single Page Application (SPA) with routing
- ✅ Browser Back/Forward button support
- ✅ Responsive design with Tailwind CSS
- ✅ HTTPS with NGINX reverse proxy
- ✅ Microservices architecture

### In Progress
- 🔄 Pong game implementation
- 🔄 Tournament system
- 🔄 User management with aliases
- 🔄 Real-time multiplayer

### Planned Features
- 📋 User authentication & profiles
- 📋 Remote players support
- 📋 AI opponent
- 📋 Game statistics dashboard
- 📋 2FA + JWT authentication

## 🧪 Development

### Frontend Development
```bash
cd Frontend
npm install
npm run dev
```

### Backend Development
```bash
cd Backend/Core/App
npm install
npm start
```

## 📚 Subject Requirements

This project follows the **Transcendence subject version 18.0** requirements:

- ✅ Docker containerization
- ✅ HTTPS connection
- ✅ TypeScript frontend
- ✅ SPA with browser navigation
- ✅ Fastify backend framework
- ✅ Tailwind CSS styling
- 🔄 SQLite database (in progress)

## 🤝 Contributing

This is a 42 school project. Contributions are welcome from team members.

## 📄 License

This project is part of the 42 curriculum.

## 👥 Authors

- [Your Name] - Initial work

## 🙏 Acknowledgments

- 42 School for the project subject
- The Pong game (1972) for inspiration
