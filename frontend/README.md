# DaiLi Pay Frontend

Trust-minimized daily savings infrastructure - Web Application

## Overview

This is the frontend web application for DaiLi Pay. It's a Progressive Web App (PWA) that supports offline-first operations for agents, with role-aware routing and UI shells.

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **PWA**: Vite PWA Plugin
- **Offline Storage**: IndexedDB (via idb)
- **QR Scanning**: html5-qrcode

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   │   ├── agent/       # Agent-specific pages
│   │   ├── admin/       # Admin-specific pages
│   │   └── super-admin/ # Super admin pages
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API service layer
│   ├── store/           # Zustand stores
│   ├── routes/          # Route configuration
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── context/         # React contexts
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Application entry point
├── public/              # Static assets
├── index.html
└── vite.config.ts
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Routes

- `/login` - Login page
- `/agent/*` - Agent dashboard and operations
- `/admin/*` - Operations admin dashboard
- `/super-admin/*` - Super admin dashboard

Contributors do not have web access (SMS-only).

## Features

- **Progressive Web App (PWA)**: Installable, offline-capable
- **Offline-First for Agents**: Up to 72 hours offline operation
- **Role-Based Routing**: Automatic redirection based on user role
- **QR Code Scanning**: For contributor onboarding and deposits
- **Background Sync**: Automatic retry every 15 minutes
- **IndexedDB Storage**: Local transaction storage when offline

## Development

- **Linting**: `npm run lint`
- **Type Checking**: `npm run type-check`
- **Build**: `npm run build`

## Browser Support

Primary target: **Android Chrome** (for agent operations)
Also supports modern browsers with PWA capabilities.

## License

ISC
