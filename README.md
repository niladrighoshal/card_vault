# Card Vault

Card Vault is a secure, offline Progressive Web Application (PWA) for storing and managing sensitive card information. It uses client-side encryption to ensure your data remains private and secure.

## Features

- **PIN and Biometric Authentication**: Secure access with a PIN code or biometric authentication (fingerprint, face ID)
- **AES-GCM Encryption**: All sensitive data is encrypted using AES-GCM with a key derived from your PIN
- **Offline Functionality**: Works completely offline as a Progressive Web Application
- **Card Management**: Add, edit, and delete various types of cards
- **Card Customization**: Customize card colors and icons
- **Data Masking**: Sensitive card information is masked by default

## Technical Implementation

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: IndexedDB for local data storage
- **Encryption**: Web Crypto API for cryptographic operations
- **Authentication**: WebAuthn API for biometric authentication
- **PWA**: Service Worker for offline functionality

## Project Structure

- **css/**: Stylesheets
- **images/**: Logo and icons
- **js/**: JavaScript modules
  - **crypto.js**: Encryption and decryption functionality
  - **storage.js**: IndexedDB data storage
  - **auth.js**: Authentication handling
  - **ui.js**: User interface management
  - **app.js**: Main application logic

## Installation

1. Clone this repository
2. Serve the files using a web server
3. Access the application in your browser
4. Install as a PWA for offline use

## Security

Card Vault is designed with security in mind:

- All sensitive data is encrypted locally before storage
- No data is ever sent to any server
- The encryption key is derived from your PIN and never stored directly
- Biometric authentication uses the WebAuthn standard

## License

MIT