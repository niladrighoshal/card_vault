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
            const encryptedMasterKey = await CryptoModule.encrypt(masterKey, pin);
            
            // Save to settings
            await StorageModule.saveSettings({
                pinHash,
                encryptedMasterKey,
                setupComplete: true,
                biometricEnabled: false
            });
            
            // Set as authenticated
            isAuthenticated = true;
            encryptionKey = masterKey;
            
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
                const masterKey = await CryptoModule.decrypt(settings.encryptedMasterKey, pin);
                
                // Set as authenticated
                isAuthenticated = true;
                encryptionKey = masterKey;
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
            const encryptedMasterKey = await CryptoModule.encrypt(encryptionKey, newPin);
            
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
    const isBiometricAvailable = () => {
        return navigator.credentials && 
               typeof PublicKeyCredential !== 'undefined' && 
               PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
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
            
            if (!isBiometricAvailable()) {
                throw new Error('Biometric authentication not available on this device');
            }
            
            // Create random challenge and user ID for WebAuthn registration
            const challengeBytes = new Uint8Array(32);
            window.crypto.getRandomValues(challengeBytes);
            
            const userIdBytes = new Uint8Array(16);
            window.crypto.getRandomValues(userIdBytes);
            
            // Get current settings
            const settings = await StorageModule.getSettings();
            
            // Create the WebAuthn credential options
            const options = {
                publicKey: {
                    challenge: challengeBytes,
                    rp: {
                        name: 'Card Vault'
                        // Don't set id for localhost testing
                    },
                    user: {
                        id: userIdBytes,
                        name: 'user',
                        displayName: 'Card Vault User'
                    },
                    pubKeyCredParams: [{
                        type: 'public-key',
                        alg: -7 // ES256
                    }],
                    timeout: 60000,
                    attestation: 'none',
                    authenticatorSelection: {
                        userVerification: 'required',
                        authenticatorAttachment: 'platform'
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
                await StorageModule.saveSettings({
                    ...settings,
                    biometricEnabled: true,
                    biometricKey: btoa(CryptoModule.arrayBufferToString(encryptionKey))
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
            if (!isBiometricAvailable()) {
                throw new Error('Biometric authentication not available');
            }
            
            const settings = await StorageModule.getSettings();
            
            if (!settings || !settings.biometricEnabled) {
                throw new Error('Biometric authentication not enabled');
            }
            
            // Create the WebAuthn options
            const challengeBytes = new Uint8Array(32);
            window.crypto.getRandomValues(challengeBytes);
            
            const options = {
                publicKey: {
                    challenge: challengeBytes,
                    timeout: 60000,
                    userVerification: 'required',
                    // Don't set rpId to allow same-origin authentication
                    // This is important for localhost testing
                    // rpId: window.location.hostname
                }
            };
            
            try {
                // Request biometric authentication
                const credential = await navigator.credentials.get(options);
                
                if (!credential) {
                    throw new Error('Biometric authentication failed');
                }
                
                // If successful, decrypt the master key with the stored PIN
                // In a real app, we'd use a more secure approach, but for this demo
                // we'll use the PIN that's stored in memory if available
                if (currentPin) {
                    const masterKey = await CryptoModule.decrypt(settings.encryptedMasterKey, currentPin);
                    isAuthenticated = true;
                    encryptionKey = masterKey;
                    return true;
                } else {
                    // This is a fallback that's not ideal for security
                    // In a real app, we'd use a more secure approach
                    const dummyPin = '0000'; // This is just for demo purposes
                    try {
                        const masterKey = await CryptoModule.decrypt(settings.encryptedMasterKey, dummyPin);
                        isAuthenticated = true;
                        encryptionKey = masterKey;
                        return true;
                    } catch {
                        throw new Error('Biometric authentication failed');
                    }
                }
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
            const biometricAvailable = isBiometricAvailable();
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