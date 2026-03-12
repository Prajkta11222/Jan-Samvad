# Samvad Backend – Deployment & Cross-Device Setup

What you need to run this backend on any device (local, server, cloud).

---

## Required Services

| Service | Purpose | Required |
|---------|---------|----------|
| **Node.js** (v16+) | Runtime | ✅ Yes |
| **MongoDB** | Database for users & complaints | ✅ Yes |
| **Internet** | Translation API (MyMemory/LibreTranslate) | ✅ Yes (for translation) |

---

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/samvad
JWT_SECRET=your_secure_random_secret_here
# LIBRETRANSLATE_API_KEY=   # optional
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** (prod) | Secret for signing JWT tokens |
| `LIBRETRANSLATE_API_KEY` | No | For LibreTranslate (better translation) |

---

## MongoDB Setup

### Option A: Local MongoDB

1. Install MongoDB: https://www.mongodb.com/try/download/community  
2. Start MongoDB (e.g. `mongod` on Windows/Linux, or as a service)  
3. Use in `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/samvad
   ```

### Option B: MongoDB Atlas (cloud – works on any device)

1. Sign up: https://www.mongodb.com/cloud/atlas  
2. Create a free cluster  
3. Create a database user (username + password)  
4. Add your IP to Network Access (or `0.0.0.0/0` for testing)  
5. Get the connection string (Connect → Drivers → Node.js)  
6. Use in `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/samvad?retryWrites=true&w=majority
   ```

Replace `<username>` and `<password>` with your DB user credentials.

---

## Running on Different Devices

### Local machine

```bash
# 1. Install dependencies
npm install

# 2. Copy env
copy .env.example .env   # Windows
# cp .env.example .env   # Mac/Linux

# 3. Edit .env with your MONGODB_URI and JWT_SECRET

# 4. Start
npm start
# or for dev:
npm run dev
```

### Server / VPS (e.g. Ubuntu)

```bash
# Install Node.js & MongoDB (or use Atlas)
# Clone repo, then:
npm install
# Create .env with production values
npm start
# Use pm2 or systemd to keep it running
```

### Cloud platforms (Heroku, Railway, Render, etc.)

1. Add env vars in the platform dashboard:  
   `MONGODB_URI`, `JWT_SECRET`, `PORT` (if provided by platform)  
2. Use **MongoDB Atlas** as the database (no local MongoDB on cloud hosts)  
3. Deploy via Git or CLI  

---

## CORS & Frontend

The backend uses `cors()`, so it accepts requests from any origin by default.

For production, restrict origins:

```javascript
// server.js
app.use(cors({
  origin: ['https://your-frontend.vercel.app', 'http://localhost:3000']
}));
```

---

## API Base URL by Environment

| Environment | Base URL |
|-------------|----------|
| Local | `http://localhost:5000` |
| Same network | `http://<your-ip>:5000` |
| Deployed | `https://your-backend.railway.app` (or your host) |

Frontend must call the correct base URL for where the backend is running.

---

## Summary Checklist

- [ ] Node.js installed  
- [ ] MongoDB running (local or Atlas)  
- [ ] `.env` created with `MONGODB_URI` and `JWT_SECRET`  
- [ ] `npm install` run  
- [ ] `npm start` runs without errors  
- [ ] Frontend points to backend URL  
