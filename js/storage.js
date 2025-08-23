/**
 * Storage Module for Card Vault
 * Handles secure local storage of card data using IndexedDB
 */

const StorageModule = (() => {
    // Database configuration
    const DB_NAME = 'CardVaultDB';
    const DB_VERSION = 1;
    const STORES = {
        SETTINGS: 'settings',
        CARDS: 'cards',
        PROFILE: 'profile'
    };
    
    let db = null;
    
    // Initialize the database
    const initDatabase = () => {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }
            
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject('Failed to open database');
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains(STORES.CARDS)) {
                    const cardsStore = db.createObjectStore(STORES.CARDS, { keyPath: 'id', autoIncrement: true });
                    cardsStore.createIndex('type', 'type', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(STORES.PROFILE)) {
                    db.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
                }
            };
        });
    };
    
    // Get a transaction and object store
    const getStore = async (storeName, mode = 'readonly') => {
        const db = await initDatabase();
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    };
    
    // Save settings to the database
    const saveSettings = async (settings) => {
        try {
            const store = await getStore(STORES.SETTINGS, 'readwrite');
            return new Promise((resolve, reject) => {
                const request = store.put({
                    id: 'app-settings',
                    ...settings,
                    updatedAt: new Date().toISOString()
                });
                
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject('Failed to save settings');
            });
        } catch (error) {
            console.error('Save settings error:', error);
            throw error;
        }
    };
    
    // Get settings from the database
    const getSettings = async () => {
        try {
            const store = await getStore(STORES.SETTINGS);
            return new Promise((resolve, reject) => {
                const request = store.get('app-settings');
                
                request.onsuccess = () => {
                    resolve(request.result || {});
                };
                
                request.onerror = () => reject('Failed to get settings');
            });
        } catch (error) {
            console.error('Get settings error:', error);
            throw error;
        }
    };
    
    // Save a card to the database
    const saveCard = async (cardData) => {
        try {
            const encryptionKey = AuthModule.getEncryptionKey();
            if (!encryptionKey) {
                throw new Error('Not authenticated, cannot save card');
            }

            // Encrypt the card data, excluding some metadata
            const dataToEncrypt = { ...cardData };
            const cardId = dataToEncrypt.id;
            delete dataToEncrypt.id;

            const encryptedBlob = await CryptoModule.encrypt(JSON.stringify(dataToEncrypt), encryptionKey);

            const dataToStore = {
                id: cardId,
                type: cardData.type, // For filtering
                encryptedData: encryptedBlob,
                createdAt: cardData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const store = await getStore(STORES.CARDS, 'readwrite');

            return new Promise((resolve, reject) => {
                const request = store.put(dataToStore);

                request.onsuccess = (event) => {
                    const newId = event.target.result;
                    resolve({ ...cardData, id: newId });
                };

                request.onerror = (event) => {
                    console.error('Failed to save card to IndexedDB', event.target.error);
                    reject('Failed to save card');
                };
            });
        } catch (error) {
            console.error('Save card error:', error);
            throw error;
        }
    };
    
    // Get all cards from the database
    const getAllCards = async () => {
        try {
            const encryptionKey = AuthModule.getEncryptionKey();
            if (!encryptionKey) {
                throw new Error('Not authenticated, cannot get cards');
            }

            const store = await getStore(STORES.CARDS);
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = async () => {
                    const encryptedCards = request.result || [];
                    const decryptedCards = [];

                    for (const card of encryptedCards) {
                        try {
                            const decryptedData = await CryptoModule.decrypt(card.encryptedData, encryptionKey);
                            const cardData = JSON.parse(decryptedData);
                            decryptedCards.push({
                                id: card.id,
                                ...cardData
                            });
                        } catch (error) {
                            console.error(`Failed to decrypt card ${card.id}:`, error);
                        }
                    }
                    resolve(decryptedCards);
                };
                
                request.onerror = () => reject('Failed to get cards');
            });
        } catch (error) {
            console.error('Get all cards error:', error);
            throw error;
        }
    };
    
    // Get cards by type (credit or debit)
    const getCardsByType = async (type) => {
        try {
            const encryptionKey = AuthModule.getEncryptionKey();
            if (!encryptionKey) {
                throw new Error('Not authenticated, cannot get cards');
            }

            const store = await getStore(STORES.CARDS);
            const index = store.index('type');
            
            return new Promise((resolve, reject) => {
                const request = index.getAll(type);
                
                request.onsuccess = async () => {
                    const encryptedCards = request.result || [];
                    const decryptedCards = [];

                    for (const card of encryptedCards) {
                        try {
                            const decryptedData = await CryptoModule.decrypt(card.encryptedData, encryptionKey);
                            const cardData = JSON.parse(decryptedData);
                            decryptedCards.push({
                                id: card.id,
                                ...cardData
                            });
                        } catch (error) {
                            console.error(`Failed to decrypt card ${card.id}:`, error);
                        }
                    }
                    resolve(decryptedCards);
                };
                
                request.onerror = () => reject(`Failed to get ${type} cards`);
            });
        } catch (error) {
            console.error(`Get ${type} cards error:`, error);
            throw error;
        }
    };
    
    // Get a card by ID
    const getCardById = async (id) => {
        try {
            const encryptionKey = AuthModule.getEncryptionKey();
            if (!encryptionKey) {
                throw new Error('Not authenticated, cannot get card');
            }

            const store = await getStore(STORES.CARDS);
            return new Promise((resolve, reject) => {
                const request = store.get(id);
                
                request.onsuccess = async () => {
                    const card = request.result;
                    if (card) {
                        try {
                            const decryptedData = await CryptoModule.decrypt(card.encryptedData, encryptionKey);
                            const cardData = JSON.parse(decryptedData);
                            resolve({
                                id: card.id,
                                ...cardData
                            });
                        } catch (error) {
                            console.error(`Failed to decrypt card ${id}:`, error);
                            reject('Failed to decrypt card');
                        }
                    } else {
                        reject('Card not found');
                    }
                };
                
                request.onerror = () => reject('Failed to get card');
            });
        } catch (error) {
            console.error('Get card error:', error);
            throw error;
        }
    };
    
    // Delete a card by ID
    const deleteCard = async (id) => {
        try {
            const store = await getStore(STORES.CARDS, 'readwrite');
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject('Failed to delete card');
            });
        } catch (error) {
            console.error('Delete card error:', error);
            throw error;
        }
    };
    
    // Save profile data
    const saveProfile = async (profileData) => {
        try {
            const store = await getStore(STORES.PROFILE, 'readwrite');
            return new Promise((resolve, reject) => {
                const request = store.put({
                    id: 'user-profile',
                    ...profileData,
                    updatedAt: new Date().toISOString()
                });
                
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject('Failed to save profile');
            });
        } catch (error) {
            console.error('Save profile error:', error);
            throw error;
        }
    };
    
    // Get profile data
    const getProfile = async () => {
        try {
            const store = await getStore(STORES.PROFILE);
            return new Promise((resolve, reject) => {
                const request = store.get('user-profile');
                
                request.onsuccess = () => {
                    resolve(request.result || {});
                };
                
                request.onerror = () => reject('Failed to get profile');
            });
        } catch (error) {
            console.error('Get profile error:', error);
            throw error;
        }
    };
    
    // Clear all data (for reset)
    const clearAllData = async () => {
        try {
            const db = await initDatabase();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(
                    [STORES.SETTINGS, STORES.CARDS, STORES.PROFILE],
                    'readwrite'
                );
                
                transaction.oncomplete = () => resolve(true);
                transaction.onerror = () => reject('Failed to clear data');
                
                const settingsStore = transaction.objectStore(STORES.SETTINGS);
                const cardsStore = transaction.objectStore(STORES.CARDS);
                const profileStore = transaction.objectStore(STORES.PROFILE);
                
                settingsStore.clear();
                cardsStore.clear();
                profileStore.clear();
            });
        } catch (error) {
            console.error('Clear data error:', error);
            throw error;
        }
    };
    
    // Initialize the module
    const init = async () => {
        try {
            await initDatabase();
            return true;
        } catch (error) {
            console.error('Storage initialization error:', error);
            throw error;
        }
    };
    
    // Public API
    return {
        init,
        initDatabase,
        saveSettings,
        getSettings,
        saveCard,
        getAllCards,
        getCardsByType,
        getCardById,
        deleteCard,
        saveProfile,
        getProfile,
        clearAllData
    };
})();