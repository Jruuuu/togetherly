# Togetherly

A web application for managing date night childcare with volunteer sign-ups.

## Features

- Email-based authentication for couples
- Date night management with recurring dates
- Volunteer sign-up via invitation links
- Approval system with backup volunteers
- Calendar views (month and week)
- Email and SMS notifications

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Firebase:
   - Create a Firebase project
   - Enable Authentication (Email link sign-in)
   - Create Firestore database
   - Set up Cloud Functions

3. Configure environment variables:
```bash
cp .env.example .env
# Fill in your Firebase and Twilio credentials
```

4. For Development or Local Usage Run firebase emulator
```bash
firebase emulators:start
```

5. Start development server:
```bash
npm start
```

## Tech Stack

- React + TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore, Functions)
- React Router
- React Query
- React Hook Form + Zod
- React Big Calendar

