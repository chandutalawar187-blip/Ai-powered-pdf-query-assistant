# AI-powered PDF Query Assistant

An intelligent application that allows users to query their PDF documents and get precise, verbatim answers directly from the source material. Built with React, Flask, and Google's Gemini AI.

## Key Features

### Document Processing

- Upload and manage multiple PDF documents
- Support for both typed and handwritten PDFs (Pro feature)
- Separate handling for notes and question papers
- Built-in file management system
- OCR capabilities for extracting text from images in PDFs

### Smart Querying

- Verbatim text extraction from source documents
- Smart question-answer matching
- Comparison mode for analyzing differences
- Google search integration for broader context
- Image extraction and display for relevant figures

### Interface & Design

- Dark/Light theme support
- Responsive design
- Real-time processing status
- Interactive file management
- Markdown support for formatted answers

### Pro Benefits

- Free and Pro plan tiers
- Razorpay payment integration
- Unlimited queries with Pro plan
- Handwritten PDF support
- Advanced OCR capabilities

## Technical Architecture

### Frontend Components

- React with Hooks for state management
- Custom theming system
- Responsive UI components
- Firebase client integration
- Razorpay payment gateway

### Backend Services

- Flask server with CORS
- Firebase Admin integration
- Google Gemini AI for processing
- PDF text and image extraction
- Secure webhook handling

### Data Management

- Local PDF storage
- Firestore database
- Session management
- Token-based security
- Temporary processing cache

## Setup Guide

### Installation Steps

Clone and set up the repository:

```bash
git clone 'https://github.com/chandutalawar187-blip/Ai-powered-pdf-query-assistant.git'
cd pdf-query-assistant
```

Install backend dependencies:

```bash
cd server
pip install -r requirements.txt
```

Install frontend dependencies:

```bash
cd ../client
npm install
```

### Configuration

Create a `.env` file in the server directory with these variables:

```plaintext
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI='https://accounts.google.com/o/oauth2/auth'
FIREBASE_TOKEN_URI='https://oauth2.googleapis.com/token'
FIREBASE_AUTH_PROVIDER_X509_CERT_URL='https://www.googleapis.com/oauth2/v1/certs'
FIREBASE_CLIENT_X509_CERT_URL=your_cert_url
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

### Starting Services

Start the backend server:

```bash
cd server
python app.py
```

Start the frontend development server:

```bash
cd client
npm start
```

## User Guide

1. Create an account using email, Google, or GitHub
2. Upload your PDF documents (notes and question papers)
3. Select your active notes file for querying
4. Ask questions to receive verbatim answers
5. Try the Google search feature for broader context
6. Use the file manager to organize your documents
7. Consider upgrading to Pro for unlimited access

## API Documentation

### User Management

- `GET /auth/status` - Authentication status
- `GET /get-user-profile` - User profile data

### Document Operations

- `GET /files` - List all files
- `DELETE /files/<file_id>` - Remove file
- `POST /upload-notes` - Add notes PDF
- `POST /upload-paper` - Add question paper
- `POST /set-active-notes` - Set notes file

### Content Retrieval

- `POST /query` - Get answers from documents
- `POST /google-solve` - Search Google

### Subscription

- `POST /create-payment-order` - Create payment
- `POST /payment-webhook` - Process callbacks

## Contributing Guidelines

Contributions are welcome! Please open an issue first to discuss major changes.

## Project License

This project is licensed under the [MIT](LICENSE.md) License.

## Contact

Chandrashekar Talawar

Connect on Instagram: [@__chandu.talawar__](https://www.instagram.com/__chandu.talawar__/)

An intelligent application that allows users to query their PDF documents and get precise, verbatim answers directly from the source material. Built with React, Flask, and Google's Gemini AI.

## Key Features

### Document Processing

- Upload and manage multiple PDF documents
- Support for both typed and handwritten PDFs (Pro feature)
- Separate handling for notes and question papers
- Built-in file management system
- OCR capabilities for extracting text from images in PDFs

### Smart Querying

- Verbatim text extraction from source documents
- Smart question-answer matching
- Comparison mode for analyzing differences
- Google search integration for broader context
- Image extraction and display for relevant figures

### Interface & Design

- Dark/Light theme support
- Responsive design
- Real-time processing status
- Interactive file management
- Markdown support for formatted answers

### Pro Benefits

- Free and Pro plan tiers
- Razorpay payment integration
- Unlimited queries with Pro plan
- Handwritten PDF support
- Advanced OCR capabilities

## Technical Architecture

### Frontend Components

- React with Hooks for state management
- Custom theming system
- Responsive UI components
- Firebase client integration
- Razorpay payment gateway

### Backend Services

- Flask server with CORS
- Firebase Admin integration
- Google Gemini AI for processing
- PDF text and image extraction
- Secure webhook handling

### Data Management

- Local PDF storage
- Firestore database
- Session management
- Token-based security
- Temporary processing cache

## Setup Instructions

1. Clone the repository:
```bash
git clone '<https://github.com/chandutalawar187-blip/Ai-powered-pdf-query-assistant.git>'
cd pdf-query-assistant
```

2. Install backend dependencies:
```bash
cd server
pip install -r requirements.txt
```

3. Install frontend dependencies:
```bash
cd ../client
npm install
```

4. Configure environment variables in server/.env:
```
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI='<https://accounts.google.com/o/oauth2/auth>'
FIREBASE_TOKEN_URI='<https://oauth2.googleapis.com/token>'
FIREBASE_AUTH_PROVIDER_X509_CERT_URL='<https://www.googleapis.com/oauth2/v1/certs>'
FIREBASE_CLIENT_X509_CERT_URL=your_cert_url
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

5. Start the services:
```bash
# Terminal 1 - Backend
cd server
python app.py

# Terminal 2 - Frontend
cd client
npm start
```

## How to Use

1. Create an account using email, Google, or GitHub
2. Upload your PDF documents (notes and question papers)
3. Select your active notes file for querying
4. Ask questions to receive verbatim answers
5. Try the Google search feature for broader context
6. Use the file manager to organize your documents
7. Consider upgrading to Pro for unlimited access

## API Reference

### User Management

- `GET /auth/status` - Authentication status
- `GET /get-user-profile` - User profile data

### Document Operations

- `GET /files` - List all files
- `DELETE /files/<file_id>` - Remove file
- `POST /upload-notes` - Add notes PDF
- `POST /upload-paper` - Add question paper
- `POST /set-active-notes` - Set notes file

### Content Retrieval

- `POST /query` - Get answers from documents
- `POST /google-solve` - Search Google

### Subscription

- `POST /create-payment-order` - Create payment
- `POST /payment-webhook` - Process callbacks

## Development

Contributions are welcome! Please open an issue first to discuss major changes.

## License

This project is licensed under the [MIT](LICENSE.md) License.

## Creator

Chandrashekar Talawar

Connect on Instagram: [@__chandu.talawar__](https://www.instagram.com/__chandu.talawar__/)

## Installation

1. Clone the repository:
\`\`\`bash
git clone "https://github.com/chandutalawar187-blip/Ai-powered-pdf-query-assistant.git"
cd pdf-query-assistant
\`\`\`

2. Install backend dependencies:
\`\`\`bash
cd server
pip install -r requirements.txt
\`\`\`

3. Install frontend dependencies:
\`\`\`bash
cd ../client
npm install
\`\`\`

4. Set up environment variables:
Create a .env file in the server directory with the following variables:
\`\`\`
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI="https://accounts.google.com/o/oauth2/auth"
FIREBASE_TOKEN_URI="https://oauth2.googleapis.com/token"
FIREBASE_AUTH_PROVIDER_X509_CERT_URL="https://www.googleapis.com/oauth2/v1/certs"
FIREBASE_CLIENT_X509_CERT_URL=your_cert_url
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
\`\`\`

5. Start the backend server:
\`\`\`bash
cd server
python app.py
\`\`\`

6. Start the frontend development server:
\`\`\`bash
cd client
npm start
\`\`\`

## Usage

1. Register/Login using email, Google, or GitHub
2. Upload your reference PDF documents
3. Set an active notes file for querying
4. Ask questions to get verbatim answers from your documents
5. Use the Google solve feature for broader context
6. Manage your files using the file manager
7. Upgrade to Pro for unlimited queries and handwritten PDF support

## API Endpoints

### API Authentication

- `GET /auth/status` - Check authentication status
- `GET /get-user-profile` - Get user profile information

### File Management

- `GET /files` - List uploaded files
- `DELETE /files/<file_id>` - Delete a file
- `POST /upload-notes` - Upload notes PDF
- `POST /upload-paper` - Upload question paper PDF
- `POST /set-active-notes` - Set active notes file

### Querying

- `POST /query` - Query documents for answers
- `POST /google-solve` - Get answers using Google search

### Payment

- `POST /create-payment-order` - Create Razorpay payment order
- `POST /payment-webhook` - Handle Razorpay webhook callbacks

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE.md)

## Author

Chandrashekar Talawar

- Instagram: [@__chandu.talawar__](https://www.instagram.com/__chandu.talawar__/)

An intelligent application that allows users to query their PDF documents and get precise, verbatim answers directly from the source material. Built with React, Flask, and Google's Gemini AI.

## Features

### Document Management

- Upload and manage multiple PDF documents
- Support for both typed and handwritten PDFs (Pro feature)
- Separate handling for notes and question papers
- Built-in file management system
- OCR capabilities for extracting text from images in PDFs

### Intelligent Querying

- Verbatim text extraction from source documents
- Smart question-answer matching
- Comparison mode for analyzing differences
- Google search integration for broader context
- Image extraction and display for relevant figures

### Authentication & Security

- Firebase authentication integration
- Support for multiple login methods:
  - Email/Password
  - Google Sign-in
  - GitHub Sign-in
- Secure token-based API access

### User Experience

- Dark/Light theme support
- Responsive design
- Real-time processing status
- Interactive file management
- Markdown support for formatted answers

### Subscription Management

- Free and Pro plan tiers
- Razorpay integration for payments
- Usage tracking and limits
- Automatic plan upgrades

## Technical Stack

### Frontend (React)

- React with Hooks
- Custom theme system
- Responsive UI components
- Firebase client SDK
- Razorpay integration

### Backend (Flask)

- Flask server with CORS support
- Firebase Admin SDK integration
- Google Gemini AI integration
- PyPDF for PDF processing
- PyMuPDF for image extraction
- Razorpay webhook handling

### Authentication

- Firebase Authentication
- Token-based API security
- Session management
- Role-based access control

### Storage

- Local file system for PDFs
- Firestore for user data
- Temporary storage for processing

### Payment Processing

- Razorpay integration
- Webhook handling
- Secure payment flow
- Automatic subscription management

## Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/chandutalawar187-blip/Ai-powered-pdf-query-assistant.git
cd pdf-query-assistant
\`\`\`

2. Install backend dependencies:
\`\`\`bash
cd server
pip install -r requirements.txt
\`\`\`

3. Install frontend dependencies:
\`\`\`bash
cd ../client
npm install
\`\`\`

4. Set up environment variables:
Create a .env file in the server directory with the following variables:
\`\`\`
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your_cert_url
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
\`\`\`

5. Start the backend server:
\`\`\`bash
cd server
python app.py
\`\`\`

6. Start the frontend development server:
\`\`\`bash
cd client
npm start
\`\`\`

## Usage

1. Register/Login using email, Google, or GitHub
2. Upload your reference PDF documents
3. Set an active notes file for querying
4. Ask questions to get verbatim answers from your documents
5. Use the Google solve feature for broader context
6. Manage your files using the file manager
7. Upgrade to Pro for unlimited queries and handwritten PDF support

## API Endpoints

### Authentication

- `GET /auth/status` - Check authentication status
- `GET /get-user-profile` - Get user profile information

### File Management

- `GET /files` - List uploaded files
- `DELETE /files/<file_id>` - Delete a file
- `POST /upload-notes` - Upload notes PDF
- `POST /upload-paper` - Upload question paper PDF
- `POST /set-active-notes` - Set active notes file

### Querying

- `POST /query` - Query documents for answers
- `POST /google-solve` - Get answers using Google search

### Payment

- `POST /create-payment-order` - Create Razorpay payment order
- `POST /payment-webhook` - Handle Razorpay webhook callbacks

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE.md)

## Author

Chandrashekar Talawar
- Instagram: [@__chandu.talawar__](https://www.instagram.com/__chandu.talawar__/)
