# StayEase

StayEase is a server-rendered accommodation booking app built with Node.js, Express, MongoDB, Mongoose, and EJS. Visitors can explore stays; guest accounts can book dates and write reviews; administrator accounts manage property listings.

## Features

- Public home page with separate guest and administrator account links.
- Guest registration, login, logout, and a personal bookings page.
- Administrator login and invitation-key-protected registration.
- Admin dashboard to create, update, and delete listings.
- Listing browsing by category, listing detail pages, photos, and maps.
- Guest reviews with ratings; authors can delete their own reviews.
- Date-based booking checkout using Razorpay, with server-side payment signature verification.
- Overlap checks when checkout starts and again before a payment is confirmed. Pending payment reservations hold their selected dates; failed reservations release them.
- MongoDB-backed sessions and flash messages.

## Account roles

| Role | Can do |
|---|---|
| Visitor | Browse listings and view listing details. |
| Guest (`user`) | Everything a visitor can do, plus book stays, see personal bookings, and create or delete their own reviews. |
| Administrator (`admin`) | Sign in to the admin area and create, edit, or delete any listing. |

Guest accounts are created at `/signup` and always receive the `user` role. Admins sign in at `/admin/login`; the protected listing dashboard is at `/admin/dashboard`. Admin registration at `/admin/signup` requires the private `ADMIN_SIGNUP_KEY` environment variable. Keep this key private and do not commit it. The server checks roles on protected routes, so hiding links in the interface does not grant access.

## Run locally

### Requirements

- Node.js 22 or a compatible version
- MongoDB Atlas connection string (or another MongoDB URL)
- Cloudinary credentials for listing photo uploads
- Mapbox token for geocoding and map display
- Razorpay test or live API credentials for payments

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root. Add the following variables with your own credentials; never commit `.env`:

   ```env
   ATLASDB_URL=your_mongodb_connection_string
   SECRET=your_session_secret
   CLOUD_NAME=your_cloudinary_cloud_name
   CLOUD_API_KEY=your_cloudinary_api_key
   CLOUD_API_SECRET=your_cloudinary_api_secret
   MAP_TOKEN=your_mapbox_token
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ADMIN_SIGNUP_KEY=your_private_admin_invitation_key
   ```

   The application loads `.env` when `NODE_ENV` is not `production`. In production, configure these values through the hosting provider's environment settings. Razorpay credentials are required to complete checkout; without them, booking payments are reported as unavailable.

3. Start the server:

   ```bash
   npm start
   ```

   The optional `npm run dev` script uses Nodemon, which must be installed in your development environment. The current server listens on port `8080`.

4. Open `http://localhost:8080/`. The home page links to guest and administrator sign-in and sign-up. Create an administrator account using the same private value you configured for `ADMIN_SIGNUP_KEY`.

## Main routes

| Path | Purpose | Access |
|---|---|---|
| `/` | Home and account access page | Public |
| `/listings` | Browse and filter stays | Public |
| `/listings/:id` | View listing details, reviews, and map | Public |
| `/signup`, `/login` | Guest account registration and sign-in | Public |
| `/bookings` | View the signed-in guest's bookings | Guest |
| `/bookings/:id/new` | Start a booking for a listing | Guest |
| `/admin/login`, `/admin/signup` | Admin sign-in and invitation-key registration | Public; registration requires key |
| `/admin/dashboard` | Manage all listings | Admin |

Booking checkout endpoints exchange JSON with the browser and Razorpay Checkout. Other app pages are rendered on the server with EJS.

## Project structure

```text
app.js                 Express app, middleware, database and route setup
controllers/           Listing, booking, review, user, and admin logic
Models/                Mongoose models for users, listings, reviews, bookings
routes/                Express route definitions
views/                 EJS pages and shared layouts
public/                CSS, browser JavaScript, and static assets
utils/                 Async wrapper and Express error helpers
```

## Current scope and limitations

- Date overlap checks are performed at checkout creation and payment verification. They improve availability protection, but simultaneous requests can still race because there is no database-level atomic reservation lock.
- Pending checkout records hold dates until payment fails or is dismissed. There is no automatic expiry for abandoned pending checkouts.
- The admin dashboard manages listings; host booking approval and cancellation workflows are not implemented.
- Payment verification is handled by the application callback; a Razorpay webhook is not configured.
- The app currently listens on port `8080` directly. Configure the port and production session cookie settings before deploying behind a production hosting environment.

## External services

- **MongoDB / Mongoose** store application records and server sessions.
- **Cloudinary** stores listing photos uploaded through Multer.
- **Mapbox** geocodes listing locations and renders maps.
- **Razorpay** creates payment orders and verifies payment signatures.

Configure credentials in environment variables. Do not place secret values in source files or documentation.
