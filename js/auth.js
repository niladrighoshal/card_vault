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
    let encryptionKey = null; // This will be a CryptoKey object
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
            
            const pinHash = await CryptoModule.hashPin(pin);
            const masterKeyB64 = await CryptoModule.generateEncryptionKey();
            const encryptedMasterKey = await CryptoModule.encryptWithPassword(masterKeyB64, pin);
            const userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            await StorageModule.saveSettings({
                pinHash,
                encryptedMasterKey,
                userId,
                setupComplete: true,
                biometricEnabled: false,
            });
            
            isAuthenticated = true;
            encryptionKey = await CryptoModule.importEncryptionKey(masterKeyB64);
            
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
            if (!settings || !settings.pinHash) throw new Error('PIN not set up');

            const isValid = await CryptoModule.verifyPin(pin, settings.pinHash);
            
            if (isValid) {
                const masterKeyB64 = await CryptoModule.decryptWithPassword(settings.encryptedMasterKey, pin);
                encryptionKey = await CryptoModule.importEncryptionKey(masterKeyB64);
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
            const isValid = await verifyPin(currentPin);
            if (!isValid) throw new Error('Current PIN is incorrect');
            if (newPin.length !== PIN_LENGTH) throw new Error('PIN must be 4 digits');

            const settings = await StorageModule.getSettings();
            const pinHash = await CryptoModule.hashPin(newPin);
            const masterKeyB64 = await CryptoModule.exportEncryptionKey(encryptionKey);
            const encryptedMasterKey = await CryptoModule.encryptWithPassword(masterKeyB64, newPin);
            
            await StorageModule.saveSettings({ ...settings, pinHash, encryptedMasterKey });
            
            return true;
        } catch (error) {
            console.error('Change PIN error:', error);
            throw error;
        }
    };
    
    // Check if biometric authentication is available
    const isBiometricAvailable = async () => {
        try {
            return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
        } catch (error) {
            console.error('Error checking biometric availability:', error);
            return false;
        }
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
            const isValid = await verifyPin(pin);
            if (!isValid) throw new Error('PIN is incorrect');
            if (!(await isBiometricAvailable())) throw new Error('Biometric authentication not available on this device');

            const challengeBytes = new Uint8Array(32);
            window.crypto.getRandomValues(challengeBytes);
            
            const settings = await StorageModule.getSettings();
            if (!settings.userId) throw new Error('User ID not found. Please re-setup PIN.');

            const userId = (new TextEncoder()).encode(settings.userId);

            const options = {
                publicKey: {
                    challenge: challengeBytes,
                    rp: { name: 'Card Vault', id: window.location.hostname },
                    user: { id: userId, name: settings.userId, displayName: 'Card Vault User' },
                    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
                    timeout: 60000,
                    attestation: 'none',
                    authenticatorSelection: { residentKey: "required", userVerification: 'required' },
                }
            };
            
            const credential = await navigator.credentials.create(options);
            if (!credential) throw new Error('Failed to create credential');

            const credentialId = CryptoModule.arrayBufferToBase64(credential.rawId);
            await StorageModule.saveSettings({ ...settings, biometricEnabled: true, biometricCredentialId: credentialId });

            return true;
        } catch (error) {
            console.error('Enable biometric error:', error);
            throw new Error('Failed to set up biometric: ' + (error.message || 'Unknown error'));
        }
    };
    
    // Disable biometric authentication
    const disableBiometric = async (pin) => {
        try {
            const isValid = await verifyPin(pin);
            if (!isValid) throw new Error('PIN is incorrect');
            
            const settings = await StorageModule.getSettings();
            await StorageModule.saveSettings({ ...settings, biometricEnabled: false, biometricCredentialId: null });
            
            return true;
        } catch (error) {
            console.error('Disable biometric error:', error);
            throw error;
        }
    };
    
    // Authenticate with biometrics (step 1 of 2)
    const authenticateWithBiometric = async () => {
        try {
            if (!(await isBiometricAvailable())) throw new Error('Biometric authentication not available');

            const settings = await StorageModule.getSettings();
            if (!settings.biometricEnabled || !settings.biometricCredentialId) throw new Error('Biometric authentication not enabled');

            const challengeBytes = new Uint8Array(32);
            window.crypto.getRandomValues(challengeBytes);
            const credentialId = CryptoModule.base64ToArrayBuffer(settings.biometricCredentialId);

            const options = {
                publicKey: {
                    challenge: challengeBytes,
                    allowCredentials: [{ type: 'public-key', id: credentialId }],
                    timeout: 60000,
                    userVerification: 'required',
                    rpId: window.location.hostname,
                }
            };

            const credential = await navigator.credentials.get(options);
            if (!credential) throw new Error('Biometric authentication failed');

            return true; // Signal to UI to now ask for PIN
        } catch (error) {
            console.error('WebAuthn error:', error);
            throw new Error('Biometric authentication failed: ' + (error.message || 'Unknown error'));
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
        if (!isAuthenticated) throw new Error('Not authenticated');
        return encryptionKey;
    };
    
    // Check if authenticated
    const checkAuthenticated = () => isAuthenticated;
    
    // Set current PIN (for biometric auth)
    const setCurrentPin = (pin) => { currentPin = pin; };
    
    // Initialize the module
    const init = async () => {
        try {
            console.log('Biometric authentication available:', await isBiometricAvailable());
            return true;
        } catch (error) {
            console.error('Auth initialization error:', error);
            throw error;
        }
    };
    
    // Public API
    return {
        init, isSetUp, setupPin, verifyPin, changePin,
        isBiometricAvailable, isBiometricEnabled, enableBiometric, disableBiometric,
        authenticateWithBiometric, logout, getEncryptionKey, checkAuthenticated, setCurrentPin
    };
})();