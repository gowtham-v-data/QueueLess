# QueueLess - Smart Queue Management Platform

Never Wait in Line Again.

QueueLess is a cloud-based smart queue management platform designed for organizations such as hospitals, banks, colleges, government offices, restaurants, vehicle service centers, and salons. It allows organizations to manage queues and branches efficiently, while giving customers the ability to join queues and track their tokens live in real-time.

---

## 🏗️ Architecture & Stack

QueueLess is structured as a Monorepo workspace with the following architecture:

* **Frontend (`apps/web`)**: A high-performance single-page application built using **React 18**, **TypeScript**, **Vite**, and styled with **Vanilla CSS** and **Tailwind CSS**.
* **Backend API (`apps/api`)**: A production-ready REST API built using **Node.js**, **Express**, and **TypeScript** with active CORS, rate limiting, compression, and security headers.
* **Database & Auth (Cloud/Primary)**: **Firebase Auth** handles secure registration and login, while **Cloud Firestore** acts as the real-time data layer for active profiles, branches, services, counters, queues, and notifications.
* **Database (MySQL/Prisma/Legacy)**: **MySQL** (queried via **Prisma Client**) is integrated as a secure data fallback and schema holder for structured legacy reporting.

---

## 📁 Repository Directory Structure

```text
├── apps/
│   ├── api/                   # Express TypeScript Backend
│   │   ├── prisma/            # Prisma MySQL schemas and migrations
│   │   └── src/
│   │       ├── config/        # Environment and SDK configs (Firebase, Prisma)
│   │       ├── controllers/   # Express route controllers
│   │       ├── middlewares/   # Authentication, role checking, error handling
│   │       ├── repositories/  # Database access layers
│   │       ├── routes/        # API routing endpoints
│   │       └── services/      # Core business logic
│   └── web/                   # React 18 + Vite Frontend
│       └── src/
│           ├── components/    # Reusable UI primitives
│           ├── context/       # Auth and global state contexts
│           ├── pages/         # Screen views (Dashboard, OrgSetup, Join, Track)
│           └── services/      # Firebase and backend interface scripts
├── package.json               # Monorepo workspaces definition
├── tsconfig.base.json         # Shared TypeScript compiler options
└── .gitignore                 # Safe staging filters (.env and npm cache ignored)
```

---

## 🛠️ Local Development Setup

### 1. Prerequisites
* **Node.js**: `v18.x` or later.
* **MySQL**: Running locally (e.g. port `3308`) with a database named `queueless`.

### 2. Installation
Clone the repository and install dependencies from the repository root:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory by copying the example:
```bash
cp .env.example .env
```
Fill in the configuration details:
```ini
# Server Setup
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

# Database (MySQL)
DATABASE_URL=mysql://root:password@localhost:3308/queueless

# Firebase Credentials (Public config for Frontend + Backend SDK)
FIREBASE_PROJECT_ID=queueless-14f92
FIREBASE_WEB_API_KEY=AIzaSyBX0p8zxgQlMjBCMhZ1DOXXWeemjjkRm7w
VITE_FIREBASE_API_KEY=AIzaSyBX0p8zxgQlMjBCMhZ1DOXXWeemjjkRm7w
VITE_FIREBASE_AUTH_DOMAIN=queueless-14f92.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=queueless-14f92
VITE_FIREBASE_STORAGE_BUCKET=queueless-14f92.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=381272158860
VITE_FIREBASE_APP_ID=1:381272158860:web:5b6a88951894c83525c1a9
VITE_FIREBASE_MEASUREMENT_ID=G-PHHN7XMZ6W
```

### 4. Running the Dev Server
Generate the Prisma Client and start the concurrent development servers:
```bash
npm run prisma:generate
npm run dev
```
* **Frontend Client**: Accessible at [http://localhost:5173](http://localhost:5173)
* **Backend API**: Accessible at [http://localhost:4000/health](http://localhost:4000/health)

---

## 🚀 Production Deployment (Railway)

The workspace is pre-configured to build and deploy frontend and backend services directly on **Railway**.

### Step 1: Provision a MySQL Database on Railway
1. Go to your [Railway Dashboard](https://railway.app/).
2. Click **New Project** -> **Provision MySQL**.
3. Once initialized, Railway will automatically generate a `DATABASE_URL` for the database instance.

### Step 2: Deploy the Backend API (`queueless-api`)
1. Click **New** -> **GitHub Repo** -> select your `QueueLess` repository.
2. In the settings, configure the following:
   * **Service Name**: `queueless-api`
   * **Root Directory**: `apps/api`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npx prisma db push && npm start` (Executes database migrations and runs the node process).
3. Under **Variables**, add:
   * `DATABASE_URL`: `${{MySQL.DATABASE_URL}}` (Refers to your provisioned MySQL service)
   * `NODE_ENV`: `production`
   * `JWT_ACCESS_SECRET`: *A secure random string*
   * `JWT_REFRESH_SECRET`: *A secure random string*
   * `FIREBASE_PROJECT_ID`: `queueless-14f92`
   * `FIREBASE_WEB_API_KEY`: `AIzaSyBX0p8zxgQlMjBCMhZ1DOXXWeemjjkRm7w`
   * `CLIENT_ORIGIN`: *Your generated Frontend Railway URL* (configured in Step 3)

### Step 3: Deploy the Frontend App (`queueless-web`)
1. Click **New** -> **GitHub Repo** -> select your repository again.
2. Configure the settings:
   * **Service Name**: `queueless-web`
   * **Root Directory**: `apps/web`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm run start` (Uses `serve` to serve the static build with client-side SPA routing).
3. Under **Variables**, add the Vite injected environments:
   * `VITE_API_BASE_URL`: *Your Backend Service URL* + `/api` (e.g. `https://queueless-api-production.up.railway.app/api`)
   * `VITE_FIREBASE_API_KEY`: `AIzaSyBX0p8zxgQlMjBCMhZ1DOXXWeemjjkRm7w`
   * `VITE_FIREBASE_AUTH_DOMAIN`: `queueless-14f92.firebaseapp.com`
   * `VITE_FIREBASE_PROJECT_ID`: `queueless-14f92`
   * `VITE_FIREBASE_STORAGE_BUCKET`: `queueless-14f92.firebasestorage.app`
   * `VITE_FIREBASE_MESSAGING_SENDER_ID`: `381272158860`
   * `VITE_FIREBASE_APP_ID`: `1:381272158860:web:5b6a88951894c83525c1a9`
   * `VITE_FIREBASE_MEASUREMENT_ID`: `G-PHHN7XMZ6W`
4. Under **Settings** -> **Networking**, click **Generate Domain**. 
5. Copy this URL and set it as `CLIENT_ORIGIN` inside your backend variables.
