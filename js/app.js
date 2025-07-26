/**
 * Main Application Module for Card Vault
 * Initializes and coordinates all modules
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize modules in the correct order
        console.log('Initializing Card Vault application...');
        
        // First initialize storage
        await StorageModule.init();
        console.log('Storage module initialized');
        
        // Then initialize authentication
        await AuthModule.init();
        console.log('Authentication module initialized');
        
        // Finally initialize UI
        await UIModule.init();
        console.log('UI module initialized');
        
        console.log('Card Vault application initialized successfully');
    } catch (error) {
        console.error('Application initialization error:', error);
        alert('Failed to initialize application. Please refresh the page and try again.');
    }
});

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}