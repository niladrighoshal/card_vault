/**
 * Authentication Module for Card Vault
 * Handles PIN and biometric authentication
 */

const AuthModule = (() => {
    // Constants
    const AUTH_SETTINGS_KEY = 'auth-settings';
    const PIN_LENGTH = 4;
    
    // Variables to track authentication state
    let isAuthenticated = false;
    let encryptionKey = null;
    let currentPin = '';
    
    // Check if the app is set up with a PIN
    const isSetUp = async () => {
        try {
            const settings = await StorageModule.getSettings();
            return !!(settings && settings.pinHash);
        } catch (error) {
            console.error('Error checking setup status:', error);
            return false;
        }
    };
    
    // Set up a new PIN
    const setupPin = async (pin) => {
        try {
            if (pin.length !== PIN_LENGTH) {
                throw new Error('PIN must be 4 digits');
            }
            
            // Hash the PIN
            const pinHash = await CryptoModule.hashPin(pin);
            
            // Generate a master encryption key
            const masterKey = await CryptoModule.generateEncryptionKey();
            
            // Encrypt the master key with the PIN
            const encryptedMasterKey = await CryptoModule.encryptWithPassword(masterKey, pin);
            
            // Generate a stable user ID for WebAuthn
            const userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            // Save to settings
            await StorageModule.saveSettings({
                pinHash,
                encryptedMasterKey,
                setupComplete: true,
                biometricEnabled: false,
                userId: userId
            });
            
            // Set as authenticated
            isAuthenticated = true;
            encryptionKey = await CryptoModule.importEncryptionKey(masterKey);
            
            return true;
        } catch (error) {
            console.error('Setup PIN error:', error);
            throw error;
        }
    };
    
    // Verify PIN
    const verifyPin = async (pin) => {
        try {
            const settings = await StorageModule.getSettings();
            
            if (!settings || !settings.pinHash) {
                throw new Error('PIN not set up');
            }
            
            // Verify the PIN against stored hash
            const isValid = await CryptoModule.verifyPin(pin, settings.pinHash);
            
            if (isValid) {
                // Decrypt the master key
                const masterKeyB64 = await CryptoModule.decryptWithPassword(settings.encryptedMasterKey, pin);
                
                // Import the key for use in encryption/decryption
                encryptionKey = await CryptoModule.importEncryptionKey(masterKeyB64);

                // Set as authenticated
                isAuthenticated = true;
            }
            
            return isValid;
        } catch (error) {
            console.error('Verify PIN error:', error);
            throw error;
        }
    };
    
    // Change PIN
    const changePin = async (currentPin, newPin) => {
        try {
            // Verify current PIN
            const isValid = await verifyPin(currentPin);
            
            if (!isValid) {
                throw new Error('Current PIN is incorrect');
            }
            
            if (newPin.length !== PIN_LENGTH) {
                throw new Error('PIN must be 4 digits');
            }
            
            // Get current settings
            const settings = await StorageModule.getSettings();
            
            // Hash the new PIN
            const pinHash = await CryptoModule.hashPin(newPin);
            
            // Re-encrypt the master key with the new PIN
            const masterKeyB64 = await CryptoModule.exportEncryptionKey(encryptionKey);
            const encryptedMasterKey = await CryptoModule.encryptWithPassword(masterKeyB64, newPin);
            
            // Save updated settings
            await StorageModule.saveSettings({
                ...settings,
                pinHash,
                encryptedMasterKey
            });
            
            return true;
        } catch (error) {
            console.error('Change PIN error:', error);
            throw error;
        }
    };
    
    // Check if biometric authentication is available
    const isBiometricAvailable = async () => {
        if (window.PublicKeyCredential &&
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
            try {
                const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                return isAvailable;
            } catch (error) {
                console.error('Error checking biometric availability:', error);
                return false;
            }
        }
        return false;
    };
    
    // Check if biometric authentication is enabled
    const isBiometricEnabled = async () => {
        try {
            const settings = await StorageModule.getSettings();
            return !!(settings && settings.biometricEnabled);
        } catch (error) {
            console.error('Error checking biometric status:', error);
            return false;
        }
    };
    
    // Enable biometric authentication
    const enableBiometric = async (pin) => {
        try {
            // First verify PIN
            const isValid = await verifyPin(pin);
            
            if (!isValid) {
                throw new Error('PIN is incorrect');
            }
            
            if (!await isBiometricAvailable()) {
                throw new Error('Biometric authentication not available on this device');
            }
            
            const challengeBytes = new Uint8Array(32);
            window.crypto.getRandomValues(challengeBytes);
            
            const settings = await StorageModule.getSettings();
            if (!settings.userId) {
                throw new Error('User ID not found. Please re-setup PIN.');
            }

            const userId = (new TextEncoder()).encode(settings.userId);

            // Create the WebAuthn credential options
            const options = {
                publicKey: {
                    challenge: challengeBytes,
                    rp: {
                        name: 'Card Vault',
                        id: window.location.hostname
                    },
                    user: {
                        id: userId,
                        name: settings.userId, // A user-friendly name
                        displayName: 'Card Vault User'
                    },
                    pubKeyCredParams: [
                        { type: "public-key", alg: -7 }, // ES256
                        { type: "public-key", alg: -257 } // RS256
                    ],
                    timeout: 60000,
                    attestation: 'none',
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        residentKey: "required",
                        userVerification: 'required'
                    }
                }
            };
            
            // Create the credential
            try {
                const credential = await navigator.credentials.create(options);
                
                if (!credential) {
                    throw new Error('Failed to create credential');
                }
                
                // Update settings
                const credentialId = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.rawId)));
                await StorageModule.saveSettings({
                    ...settings,
                    biometricEnabled: true,
                    biometricCredentialId: credentialId
                });
                
                return true;
            } catch (credError) {
                console.error('WebAuthn credential creation error:', credError);
                throw new Error('Failed to set up biometric: ' + (credError.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Enable biometric error:', error);
            throw error;
        }
    };
    
    // Disable biometric authentication
    const disableBiometric = async (pin) => {
        try {
            // First verify PIN
            const isValid = await verifyPin(pin);
            
            if (!isValid) {
                throw new Error('PIN is incorrect');
            }
            
            // Get current settings
            const settings = await StorageModule.getSettings();
            
            // Update settings
            await StorageModule.saveSettings({
                ...settings,
                biometricEnabled: false
            });
            
            return true;
        } catch (error) {
            console.error('Disable biometric error:', error);
            throw error;
        }
    };
    
    // Authenticate with biometrics
    const authenticateWithBiometric = async () => {
        try {
            if (!await isBiometricAvailable()) {
                throw new Error('Biometric authentication not available');
            }

            const settings = await StorageModule.getSettings();

            if (!settings || !settings.biometricEnabled || !settings.biometricCredentialId) {
                throw new Error('Biometric authentication not enabled');
            }

            const challengeBytes = new Uint8Array(32);
            window.crypto.getRandomValues(challengeBytes);

            const credentialId = CryptoModule.base64ToArrayBuffer(settings.biometricCredentialId);

            const options = {
                publicKey: {
                    challenge: challengeBytes,
                    allowCredentials: [{
                        type: 'public-key',
                        id: credentialId,
                    }],
                    timeout: 60000,
                    userVerification: 'required',
                    rpId: window.location.hostname
                }
            };

            try {
                const credential = await navigator.credentials.get(options);

                if (!credential) {
                    throw new Error('Biometric authentication failed');
                }

                // If biometric is successful, we still need the PIN to decrypt the master key.
                // This function will now simply return true, and the UI will handle asking for the PIN.
                // This is a more secure flow.
                return true;

            } catch (error) {
                console.error('WebAuthn error:', error);
                throw new Error('Biometric authentication failed: ' + (error.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Authenticate with biometric error:', error);
            throw error;
        }
    };
    
    // Log out
    const logout = () => {
        isAuthenticated = false;
        encryptionKey = null;
        currentPin = '';
    };
    
    // Get the encryption key (only if authenticated)
    const getEncryptionKey = () => {
        if (!isAuthenticated) {
            throw new Error('Not authenticated');
        }
        return encryptionKey;
    };
    
    // Check if authenticated
    const checkAuthenticated = () => {
        return isAuthenticated;
    };
    
    // Set current PIN (for biometric auth)
    const setCurrentPin = (pin) => {
        currentPin = pin;
    };
    
    // Initialize the module
    const init = async () => {
        try {
            // Check if biometric is available
        const biometricAvailable = await isBiometricAvailable();
            console.log('Biometric authentication available:', biometricAvailable);
            
            return true;
        } catch (error) {
            console.error('Auth initialization error:', error);
            throw error;
        }
    };
    
    // Public API
    return {
        init,
        isSetUp,
        setupPin,
        verifyPin,
        changePin,
        isBiometricAvailable,
        isBiometricEnabled,
        enableBiometric,
        disableBiometric,
        authenticateWithBiometric,
        logout,
        getEncryptionKey,
        checkAuthenticated,
        setCurrentPin
    };
})();