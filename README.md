# Socialite

A modern, real-time social networking app built with React, Node.js, Express, MongoDB, and Socket.IO.  
Share posts (text, images, videos), comment, like, save, and follow your friends in a beautiful, responsive UI.

---

## 🚀 Features

- **Authentication**: Email/password + Google OAuth + optional 2FA  
- **Posts**: Create, edit, delete, like, comment, share, and save  
- **Media**: Image & video uploads via Cloudinary  
- **Real-time**: Presence/online-user indicator with Socket.IO  
- **Search**: Full-text user search + autocomplete suggestions  
- **Privacy**: Public, friends-only, and private post visibility  
- **Notifications**: In-app real-time notifications for likes, comments, shares  
- **Themes**: Light/dark mode with DaisyUI & Tailwind CSS  
- **Responsive**: Fully mobile-friendly design  
- **Optimistic UI**: Instant feedback for likes, saves, shares  

---

## 🛠️ Tech Stack

- **Frontend**: React, React Router, Tailwind CSS, DaisyUI, React Hook Form, Yup  
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.IO  
- **Storage**: Cloudinary for image & video uploads  
- **Auth**: JWT in headers or HTTP-only cookies, Passport.js + Google OAuth  
- **Lint & Format**: ESLint, Prettier  
- **Testing**: (Suggested) Jest, React Testing Library, Cypress  
- **Deployment**: Vercel / Netlify (frontend), Heroku / DigitalOcean (backend)  

---

## 📥 Installation

1. **Clone the repo**  
  
   >git clone https://github.com/ciobanski/social-app.git
   >cd social-app

2. Install dependencies

/Backend

>cd server
>npm install

Frontend



>cd client
>npm install

Environment Variables

Create a .env in server/:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=http://localhost:3000
And in client/.env:

VITE_API_URL=http://localhost:5000/api

Backend

>cd server
>npm run dev
Starts Express + nodemon on http://localhost:5000.

Frontend

>cd client
>npm run dev
Starts Vite on http://localhost:5173 (or the port Vite chooses).

📝 API Documentation
Endpoints live under /server/routes. You can:

Auth
POST /api/auth/signup
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout
Posts & Shares
GET /api/posts?limit=&offset=
POST /api/posts
POST /api/posts/:id/like
DELETE /api/posts/:id/like
POST /api/posts/:id/save
DELETE /api/posts/:id/save
POST /api/shares/:postId
DELETE /api/shares/:postId

Comments
GET /api/comments/post/:postId
POST /api/comments
POST /api/comments/:id/like
DELETE /api/comments/:id/like

Users
GET /api/users/:id
GET /api/users/me/saves
etc.

Search
GET /api/search?q=…&page=&limit=
GET /api/search/suggestions?q=…

