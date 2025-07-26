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
            const store = await getStore(STORES.CARDS, 'readwrite');
            return new Promise((resolve, reject) => {
                const request = cardData.id ?
                    store.put({
                        ...cardData,
                        updatedAt: new Date().toISOString()
                    }) :
                    store.add({
                        ...cardData,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                
                request.onsuccess = (event) => {
                    // If it's a new card, return the generated ID
                    const id = cardData.id || event.target.result;
                    resolve({ ...cardData, id });
                };
                
                request.onerror = () => reject('Failed to save card');
            });
        } catch (error) {
            console.error('Save card error:', error);
            throw error;
        }
    };
    
    // Get all cards from the database
    const getAllCards = async () => {
        try {
            const store = await getStore(STORES.CARDS);
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = () => {
                    resolve(request.result || []);
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
            const store = await getStore(STORES.CARDS);
            const index = store.index('type');
            
            return new Promise((resolve, reject) => {
                const request = index.getAll(type);
                
                request.onsuccess = () => {
                    resolve(request.result || []);
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
            const store = await getStore(STORES.CARDS);
            return new Promise((resolve, reject) => {
                const request = store.get(id);
                
                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result);
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