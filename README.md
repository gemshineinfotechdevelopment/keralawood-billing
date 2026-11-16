# Kerala Wood Billing

Full-stack billing application for **Kerala Wood** with a React + Vite frontend (`src/`) and Express.js backend (`server/`).

## Environment Variables

Only two `.env` files are used in this project:

### 1. Frontend: [src/.env](file:///c:/Users/harii/React-projects/kerala-wood-billing/src/.env)
```env
VITE_PORT=5173
VITE_API_URL=http://localhost:5000
VITE_APP_NAME="Kerala Wood Billing"
```

### 2. Backend: [server/.env](file:///c:/Users/harii/React-projects/kerala-wood-billing/server/.env)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/kerala_wood_billing
# Atlas example: MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/kerala_wood_billing?retryWrites=true&w=majority
```

---

## Running the Application

### Frontend:
```bash
cd src
npm run dev
```
> Runs on **`http://localhost:5173`**

### Backend:
```bash
cd server
npm run dev
```
> Runs on **`http://localhost:5000`**
