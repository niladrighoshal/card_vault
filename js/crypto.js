/**
 * Crypto Module for Card Vault
 * Handles encryption and decryption of sensitive data using the Web Crypto API
 */

const CryptoModule = (() => {
    // Constants for encryption
    const ALGORITHM = 'AES-GCM';
    const KEY_LENGTH = 256;
    const SALT_LENGTH = 16;
    const IV_LENGTH = 12;
    const ITERATION_COUNT = 100000;
    
    // Convert string to ArrayBuffer
    const str2ab = (str) => {
        const encoder = new TextEncoder();
        return encoder.encode(str);
    };
    
    // Convert ArrayBuffer to string
    const ab2str = (buffer) => {
        const decoder = new TextDecoder();
        return decoder.decode(buffer);
    };
    
    // Convert ArrayBuffer to Base64 string
    const arrayBufferToBase64 = (buffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };
    
    // Convert Base64 string to ArrayBuffer
    const base64ToArrayBuffer = (base64) => {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };
    
    // Generate a random salt
    const generateSalt = () => {
        return window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    };
    
    // Generate a random initialization vector
    const generateIV = () => {
        return window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    };
    
    // Derive a key from password and salt
    const deriveKey = async (password, salt) => {
        const passwordBuffer = str2ab(password);
        const importedKey = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        
        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: ITERATION_COUNT,
                hash: 'SHA-256'
            },
            importedKey,
            {
                name: ALGORITHM,
                length: KEY_LENGTH
            },
            false,
            ['encrypt', 'decrypt']
        );
    };
    
    // Encrypt data with a password (used for master key)
    const encryptWithPassword = async (data, password) => {
        try {
            const salt = generateSalt();
            const iv = generateIV();
            const key = await deriveKey(password, salt);
            
            const dataBuffer = typeof data === 'string' ? str2ab(data) : data;
            const encryptedData = await window.crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, dataBuffer);
            
            return JSON.stringify({
                salt: arrayBufferToBase64(salt),
                iv: arrayBufferToBase64(iv),
                data: arrayBufferToBase64(encryptedData)
            });
        } catch (error) {
            console.error('Encryption with password error:', error);
            throw new Error('Failed to encrypt data with password');
        }
    };

    // Decrypt data with a password (used for master key)
    const decryptWithPassword = async (encryptedObj, password) => {
        try {
            const parsedObj = typeof encryptedObj === 'string' ? JSON.parse(encryptedObj) : encryptedObj;
            const salt = base64ToArrayBuffer(parsedObj.salt);
            const iv = base64ToArrayBuffer(parsedObj.iv);
            const encryptedData = base64ToArrayBuffer(parsedObj.data);
            
            const key = await deriveKey(password, salt);
            
            const decryptedData = await window.crypto.subtle.decrypt({ name: ALGORITHM, iv: new Uint8Array(iv) }, key, encryptedData);

            return ab2str(decryptedData);
        } catch (error) {
            console.error('Decryption with password error:', error);
            throw new Error('Failed to decrypt data with password');
        }
    };

    // Import a base64 encoded key
    const importEncryptionKey = async (keyB64) => {
        try {
            const keyBuffer = base64ToArrayBuffer(keyB64);
            return await window.crypto.subtle.importKey(
                'raw',
                keyBuffer,
                { name: ALGORITHM },
                true,
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            console.error('Key import error:', error);
            throw new Error('Failed to import encryption key');
        }
    };

    // Encrypt data with an imported CryptoKey
    const encryptWithKey = async (data, cryptoKey) => {
        try {
            const iv = generateIV();
            const dataBuffer = typeof data === 'string' ? str2ab(data) : data;
            const encryptedData = await window.crypto.subtle.encrypt({ name: ALGORITHM, iv }, cryptoKey, dataBuffer);

            return JSON.stringify({
                iv: arrayBufferToBase64(iv),
                data: arrayBufferToBase64(encryptedData)
            });
        } catch (error) {
            console.error('Encryption with key error:', error);
            throw new Error('Failed to encrypt data with key');
        }
    };

    // Decrypt data with an imported CryptoKey
    const decryptWithKey = async (encryptedObj, cryptoKey) => {
        try {
            const parsedObj = typeof encryptedObj === 'string' ? JSON.parse(encryptedObj) : encryptedObj;
            const iv = base64ToArrayBuffer(parsedObj.iv);
            const encryptedData = base64ToArrayBuffer(parsedObj.data);

            const decryptedData = await window.crypto.subtle.decrypt({ name: ALGORITHM, iv: new Uint8Array(iv) }, cryptoKey, encryptedData);
            
            return ab2str(decryptedData);
        } catch (error) {
            console.error('Decryption with key error:', error);
            throw new Error('Failed to decrypt data with key');
        }
    };

    // Export a CryptoKey to a base64 string
    const exportEncryptionKey = async (cryptoKey) => {
        try {
            const rawKey = await window.crypto.subtle.exportKey('raw', cryptoKey);
            return arrayBufferToBase64(rawKey);
        } catch (error) {
            console.error('Key export error:', error);
            throw new Error('Failed to export encryption key');
        }
    };
    
    // Generate a secure PIN hash
    const hashPin = async (pin) => {
        try {
            const salt = generateSalt();
            const pinBuffer = str2ab(pin);
            
            // Import the PIN as a key
            const importedKey = await window.crypto.subtle.importKey(
                'raw',
                pinBuffer,
                { name: 'PBKDF2' },
                false,
                ['deriveBits']
            );
            
            // Derive bits using PBKDF2
            const derivedBits = await window.crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: ITERATION_COUNT,
                    hash: 'SHA-256'
                },
                importedKey,
                256
            );
            
            // Combine salt and derived bits
            const result = {
                salt: arrayBufferToBase64(salt),
                hash: arrayBufferToBase64(derivedBits)
            };
            
            return JSON.stringify(result);
        } catch (error) {
            console.error('PIN hashing error:', error);
            throw new Error('Failed to hash PIN');
        }
    };
    
    // Verify a PIN against a stored hash
    const verifyPin = async (pin, storedHashObj) => {
        try {
            // Parse the stored hash object
            const parsedObj = typeof storedHashObj === 'string' ? JSON.parse(storedHashObj) : storedHashObj;
            
            // Extract salt and stored hash
            const salt = base64ToArrayBuffer(parsedObj.salt);
            const storedHash = parsedObj.hash;
            
            const pinBuffer = str2ab(pin);
            
            // Import the PIN as a key
            const importedKey = await window.crypto.subtle.importKey(
                'raw',
                pinBuffer,
                { name: 'PBKDF2' },
                false,
                ['deriveBits']
            );
            
            // Derive bits using PBKDF2 with the same salt
            const derivedBits = await window.crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: ITERATION_COUNT,
                    hash: 'SHA-256'
                },
                importedKey,
                256
            );
            
            // Compare the derived hash with the stored hash
            const derivedHash = arrayBufferToBase64(derivedBits);
            return derivedHash === storedHash;
        } catch (error) {
            console.error('PIN verification error:', error);
            throw new Error('Failed to verify PIN');
        }
    };
    
    // Generate a random encryption key for app data
    const generateEncryptionKey = async () => {
        try {
            const key = await window.crypto.subtle.generateKey(
                {
                    name: ALGORITHM,
                    length: KEY_LENGTH
                },
                true,
                ['encrypt', 'decrypt']
            );
            
            const exportedKey = await window.crypto.subtle.exportKey('raw', key);
            return arrayBufferToBase64(exportedKey);
        } catch (error) {
            console.error('Key generation error:', error);
            throw new Error('Failed to generate encryption key');
        }
    };
    
    // Initialize the module
    const init = async () => {
        try {
            // Check if Web Crypto API is available
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error('Web Crypto API is not available in this browser');
            }
            
            console.log('Crypto module initialized successfully');
            return true;
        } catch (error) {
            console.error('Crypto initialization error:', error);
            throw error;
        }
    };
    
    // Convert ArrayBuffer to string (needed for biometric auth)
    const arrayBufferToString = (buffer) => {
        return ab2str(buffer);
    };
    
    // Public API
    return {
        init,
        encryptWithPassword,
        decryptWithPassword,
        importEncryptionKey,
        exportEncryptionKey,
        encryptWithKey,
        decryptWithKey,
        hashPin,
        verifyPin,
        generateEncryptionKey,
        arrayBufferToString,
        arrayBufferToBase64,
        base64ToArrayBuffer
    };
})();