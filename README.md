# Sthala 🏡

A full-stack accommodation booking platform inspired by Airbnb, where users can explore listings, save their favourites, and manage reservations.

🌐 **Live Demo:** [https://mysthala.netlify.app](https://mysthala.netlify.app)

## Features

- Browse and search accommodation listings
- User authentication
- View listing details
- Add and remove wishlist items
- Manage reservations

## Tech Stack

**Frontend:** React.js, Vite, CSS

**Backend:** Node.js, Express.js

**Database:** MongoDB Atlas

**Authentication:** JWT

**Deployment:** Netlify, Render

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sujay-707/Sthala.git
cd Sthala
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Install frontend dependencies

```bash
cd client
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

For the frontend, create `client/.env` if needed:

```env
VITE_API_URL=http://localhost:8080/api
```

### 5. Run the application

Start the backend from the project root:

```bash
npm start
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

- [GitHub](https://github.com/sujay-707)
- [Live Project](https://mysthala.netlify.app)
