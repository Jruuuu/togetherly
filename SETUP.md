# Setup Instructions

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

## Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Firebase:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication:
     - Go to Authentication > Sign-in method
     - Enable "Email/Password" provider
     - Enable "Email link (passwordless sign-in)"
   - Create Firestore Database:
     - Go to Firestore Database
     - Create database in production mode (or test mode for development)
     - Set up security rules (see below)
   - Get your Firebase config:
     - Go to Project Settings > General
     - Scroll to "Your apps" and add a web app
     - Copy the Firebase configuration

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase credentials in `.env`

4. **Set up Firebase Security Rules:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Couples can read/write their own data
       match /couples/{coupleId} {
         allow read, write: if request.auth != null && request.auth.uid == coupleId;
       }
       
       // Date nights - couples can manage their own
       match /dateNights/{dateNightId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           resource.data.coupleId == request.auth.uid;
       }
       
       // Volunteers - read only for couples, write for signup
       match /volunteers/{volunteerId} {
         allow read: if request.auth != null;
         allow create: if true; // Anyone can create (via invitation link)
       }
       
       // Invitation links - couples can manage their own
       match /invitationLinks/{linkId} {
         allow read: if true; // Public read for link validation
         allow write: if request.auth != null;
       }
     }
   }
   ```

5. **Set up Firebase Cloud Functions (optional for MVP):**
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Login: `firebase login`
   - Initialize: `firebase init functions`
   - The functions for notifications will need to be implemented separately

6. **Start development server:**
   ```bash
   npm start
   ```

7. **Start Firebase emulators (for local testing):**
  ```bash
  npm run emulators
  ```

## Firebase Cloud Functions Setup (for notifications)

The notification system requires Cloud Functions. Here's a basic setup:

1. **Install Firebase CLI and initialize:**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init functions
   ```

2. **Set up Twilio (for SMS):**
   - Create a Twilio account
   - Get Account SID, Auth Token, and Phone Number
   - Add to `.env` file

3. **Deploy functions:**
   ```bash
   cd firebase/functions
   npm install
   cd ../..
   firebase deploy --only functions
   ```

## Development Notes

- The app uses React Query for data fetching
- Authentication uses Firebase Email Link (passwordless)
- Firestore is used for data storage
- Tailwind CSS is used for styling
- React Big Calendar is used for calendar views

## Troubleshooting

- **Firebase import errors:** Make sure you've run `npm install` and Firebase is properly configured
- **Type errors:** Run `npm install` to ensure all TypeScript types are installed
- **Calendar not showing:** Make sure `react-big-calendar` CSS is imported (already done in CalendarView.tsx)

