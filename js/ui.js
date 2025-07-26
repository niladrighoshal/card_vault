/**
 * UI Module for Card Vault
 * Handles user interface interactions and screen management
 */

const UIModule = (() => {
    // Screen elements
    const screens = {
        lock: document.getElementById('lock-screen'),
        main: document.getElementById('main-screen'),
        addCard: document.getElementById('add-card-screen'),
        cardDetail: document.getElementById('card-detail-screen'),
        profile: document.getElementById('profile-screen'),
        changePin: document.getElementById('change-pin-screen')
    };
    
    // UI elements
    const elements = {
        // Lock screen
        pinDots: document.querySelectorAll('.pin-dot'),
        pinButtons: document.querySelectorAll('.pin-button'),
        pinClear: document.querySelector('.pin-clear'),
        pinEnter: document.querySelector('.pin-enter'),
        biometricButton: document.getElementById('biometric-button'),
        setupPinContainer: document.getElementById('setup-pin-container'),
        newPinInput: document.getElementById('new-pin'),
        confirmPinInput: document.getElementById('confirm-pin'),
        savePinButton: document.getElementById('save-pin-button'),
        
        // Main screen
        cardStack: document.getElementById('card-stack'),
        emptyState: document.getElementById('empty-state'),
        addFirstCardButton: document.getElementById('add-first-card'),
        addCardFloating: document.getElementById('add-card-floating'),
        navButtons: document.querySelectorAll('.nav-button'),
        
        // Add card screen
        cardForm: document.getElementById('card-form'),
        cardPreview: document.getElementById('card-preview'),
        cardTypeSelect: document.getElementById('card-type'),
        cardNicknameInput: document.getElementById('card-nickname'),
        cardNumberInput: document.getElementById('card-number'),
        validFromInput: document.getElementById('valid-from'),
        validThruInput: document.getElementById('valid-thru'),
        cardNameInput: document.getElementById('card-name'),
        bankNameInput: document.getElementById('bank-name'),
        cardCvvInput: document.getElementById('card-cvv'),
        cardColorInput: document.getElementById('card-color'),
        previewValidFrom: document.getElementById('preview-valid-from'),
        previewValidThru: document.getElementById('preview-valid-thru'),
        previewCardName: document.getElementById('preview-card-name'),
        previewBankName: document.getElementById('preview-bank-name'),
        cancelCardButton: document.querySelector('.add-card-form .cancel-button'),
        saveCardButton: document.querySelector('.add-card-form .save-button'),
        
        // Card detail screen
        detailCardNickname: document.getElementById('detail-card-nickname'),
        detailCardView: document.getElementById('detail-card-view'),
        detailCardNumber: document.getElementById('detail-card-number'),
        detailValidFrom: document.getElementById('detail-valid-from'),
        detailValidThru: document.getElementById('detail-valid-thru'),
        detailCardName: document.getElementById('detail-card-name'),
        detailBankName: document.getElementById('detail-bank-name'),
        detailCvv: document.getElementById('detail-cvv'),
        detailFullNumber: document.getElementById('detail-full-number'),
        toggleCvv: document.getElementById('toggle-cvv'),
        toggleNumber: document.getElementById('toggle-number'),
        deleteCardButton: document.getElementById('delete-card-button'),
        editCardButton: document.querySelector('.edit-button'),
        
        // Profile screen
        profileForm: document.getElementById('profile-form'),
        userNameInput: document.getElementById('user-name'),
        userEmailInput: document.getElementById('user-email'),
        changePinButton: document.getElementById('change-pin-button'),
        biometricToggle: document.getElementById('biometric-toggle'),
        
        // Change PIN screen
        changePinForm: document.getElementById('change-pin-form'),
        currentPinInput: document.getElementById('current-pin'),
        newPinChangeInput: document.getElementById('new-pin-change'),
        confirmPinChangeInput: document.getElementById('confirm-pin-change'),
        
        // Modal
        confirmationModal: document.getElementById('confirmation-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalMessage: document.getElementById('modal-message'),
        modalCancel: document.getElementById('modal-cancel'),
        modalConfirm: document.getElementById('modal-confirm'),
        
        // Toast
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toast-message'),
        
        // Back buttons
        backButtons: document.querySelectorAll('.back-button')
    };
    
    // Current state
    let currentScreen = 'lock';
    let enteredPin = '';
    let currentCardId = null;
    let editingCard = null;
    let cardFilter = 'credit';
    
    // Initialize UI
    const init = async () => {
        try {
            // Check if app is set up
            const isSetUp = await AuthModule.isSetUp();
            
            if (!isSetUp) {
                // Show setup screen
                elements.setupPinContainer.classList.remove('hidden');
            } else {
                // Check if biometric is available and enabled
                if (AuthModule.isBiometricAvailable()) {
                    elements.biometricButton.classList.remove('hidden');
                    const isBiometricEnabled = await AuthModule.isBiometricEnabled();
                    if (isBiometricEnabled) {
                        elements.biometricToggle.checked = true;
                    }
                } else {
                    elements.biometricButton.classList.add('hidden');
                }
            }
            
            // Attach event listeners
            attachEventListeners();
            
        } catch (error) {
            console.error('UI initialization error:', error);
            showToast('Failed to initialize app');
        }
    };
    
    // Attach event listeners to UI elements
    const attachEventListeners = () => {
        // PIN pad buttons
        elements.pinButtons.forEach(button => {
            if (!button.classList.contains('pin-clear') && !button.classList.contains('pin-enter')) {
                button.addEventListener('click', () => {
                    if (enteredPin.length < 4) {
                        const value = button.getAttribute('data-value');
                        enteredPin += value;
                        updatePinDots();
                        
                        // Auto-submit when 4 digits are entered
                        if (enteredPin.length === 4) {
                            setTimeout(() => verifyPin(), 300);
                        }
                    }
                });
            }
        });
        
        // PIN clear button
        elements.pinClear.addEventListener('click', () => {
            enteredPin = '';
            updatePinDots();
        });
        
        // PIN enter button
        elements.pinEnter.addEventListener('click', verifyPin);
        
        // Biometric button
        elements.biometricButton.addEventListener('click', authenticateWithBiometric);
        
        // Setup PIN form
        elements.savePinButton.addEventListener('click', setupPin);
        
        // Add first card button
        elements.addFirstCardButton.addEventListener('click', () => showScreen('addCard'));
        
        // Add card floating button
        elements.addCardFloating.addEventListener('click', () => {
            editingCard = null;
            resetCardForm();
            showScreen('addCard');
        });
        
        // Navigation buttons
        elements.navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const screen = button.getAttribute('data-screen');
                elements.navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                if (screen === 'credit-cards') {
                    cardFilter = 'credit';
                    loadCards();
                } else if (screen === 'debit-cards') {
                    cardFilter = 'debit';
                    loadCards();
                } else if (screen === 'profile') {
                    showScreen('profile');
                    loadProfile();
                }
            });
        });
        
        // Card form inputs for live preview
        elements.cardNumberInput.addEventListener('input', updateCardPreview);
        elements.validFromInput.addEventListener('input', updateCardPreview);
        elements.validThruInput.addEventListener('input', updateCardPreview);
        elements.cardNameInput.addEventListener('input', updateCardPreview);
        elements.bankNameInput.addEventListener('input', updateCardPreview);
        elements.cardColorInput.addEventListener('input', updateCardPreview);
        
        // Format card number input
        elements.cardNumberInput.addEventListener('input', formatCardNumber);
        
        // Format date inputs
        elements.validFromInput.addEventListener('input', formatDate);
        elements.validThruInput.addEventListener('input', formatDate);
        
        // Card form submission
        elements.cardForm.addEventListener('submit', saveCard);
        
        // Cancel card button
        elements.cancelCardButton.addEventListener('click', () => {
            showScreen('main');
        });
        
        // Toggle visibility buttons
        elements.toggleCvv.addEventListener('click', () => toggleSensitiveData('detail-cvv', 5000));
        elements.toggleNumber.addEventListener('click', () => toggleSensitiveData('detail-full-number', 5000));
        
        // Delete card button
        elements.deleteCardButton.addEventListener('click', confirmDeleteCard);
        
        // Edit card button
        elements.editCardButton.addEventListener('click', editCard);
        
        // Profile form submission
        elements.profileForm.addEventListener('submit', saveProfile);
        
        // Change PIN button
        elements.changePinButton.addEventListener('click', () => showScreen('changePin'));
        
        // Biometric toggle
        elements.biometricToggle.addEventListener('change', toggleBiometric);
        
        // Change PIN form submission
        elements.changePinForm.addEventListener('submit', changePin);
        
        // Modal buttons
        elements.modalCancel.addEventListener('click', closeModal);
        
        // Back buttons
        elements.backButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (currentScreen === 'addCard' || currentScreen === 'cardDetail' || currentScreen === 'changePin' || currentScreen === 'profile') {
                    showScreen('main');
                }
            });
        });
    };
    
    // Update PIN dots based on entered PIN
    const updatePinDots = () => {
        elements.pinDots.forEach((dot, index) => {
            if (index < enteredPin.length) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
    };
    
    // Verify entered PIN
    const verifyPin = async () => {
        try {
            if (enteredPin.length === 0) return;
            
            const isValid = await AuthModule.verifyPin(enteredPin);
            
            if (isValid) {
                // Store PIN for potential biometric auth later
                AuthModule.setCurrentPin(enteredPin);
                
                // Reset PIN and show main screen
                enteredPin = '';
                updatePinDots();
                showScreen('main');
                loadCards();
            } else {
                showToast('Incorrect PIN');
                enteredPin = '';
                updatePinDots();
            }
        } catch (error) {
            console.error('PIN verification error:', error);
            showToast('Failed to verify PIN');
            enteredPin = '';
            updatePinDots();
        }
    };
    
    // Authenticate with biometric
    const authenticateWithBiometric = async () => {
        try {
            const isAuthenticated = await AuthModule.authenticateWithBiometric();
            
            if (isAuthenticated) {
                showScreen('main');
                loadCards();
            } else {
                showToast('Biometric authentication failed');
            }
        } catch (error) {
            console.error('Biometric authentication error:', error);
            showToast('Biometric authentication failed');
        }
    };
    
    // Set up PIN
    const setupPin = async () => {
        try {
            const newPin = elements.newPinInput.value;
            const confirmPin = elements.confirmPinInput.value;
            
            if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
                showToast('PIN must be 4 digits');
                return;
            }
            
            if (newPin !== confirmPin) {
                showToast('PINs do not match');
                return;
            }
            
            await AuthModule.setupPin(newPin);
            
            // Store PIN for potential biometric auth later
            AuthModule.setCurrentPin(newPin);
            
            // Hide setup container and show main screen
            elements.setupPinContainer.classList.add('hidden');
            showScreen('main');
            loadCards();
            
            showToast('PIN set up successfully');
        } catch (error) {
            console.error('PIN setup error:', error);
            showToast('Failed to set up PIN');
        }
    };
    
    // Show a specific screen
    const showScreen = (screenName) => {
        // Hide all screens
        Object.values(screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show the requested screen
        screens[screenName].classList.add('active');
        currentScreen = screenName;
        
        // Update navigation if on main screen
        if (screenName === 'main') {
            // Highlight the correct nav button
            elements.navButtons.forEach(btn => {
                if ((cardFilter === 'credit' && btn.getAttribute('data-screen') === 'credit-cards') ||
                    (cardFilter === 'debit' && btn.getAttribute('data-screen') === 'debit-cards')) {
                    btn.classList.add('active');
                } else if (btn.getAttribute('data-screen') !== 'credit-cards' && 
                           btn.getAttribute('data-screen') !== 'debit-cards') {
                    btn.classList.remove('active');
                }
            });
        }
    };
    
    // Load cards from storage
    const loadCards = async () => {
        try {
            // Get cards by type
            const cards = await StorageModule.getCardsByType(cardFilter);
            
            // Clear card stack
            elements.cardStack.innerHTML = '';
            
            if (cards.length === 0) {
                // Show empty state
                elements.cardStack.appendChild(elements.emptyState);
                return;
            }
            
            // Create card elements
            cards.forEach(card => {
                const cardElement = createCardElement(card);
                elements.cardStack.appendChild(cardElement);
            });
        } catch (error) {
            console.error('Load cards error:', error);
            showToast('Failed to load cards');
        }
    };
    
    // Create a card element
    const createCardElement = (card) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-template';
        cardElement.style.backgroundColor = card.color || '#1e3a8a';
        
        // Calculate text color based on background color
        const color = card.color || '#1e3a8a';
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const textColor = brightness > 128 ? '#000000' : '#ffffff';
        cardElement.style.color = textColor;
        
        // Format card number to show only last 6 digits
        const cardNumber = card.cardNumber.replace(/\s/g, '');
        const maskedNumber = '•••• •••• ' + cardNumber.slice(-6).replace(/(\d{2})(\d{4})/, '$1 $2');
        
        cardElement.innerHTML = `
            <div class="card-chip"></div>
            <div class="card-number">${maskedNumber}</div>
            <div class="card-details">
                <div class="card-valid">
                    <span class="valid-label">Valid From</span>
                    <span class="valid-date">${card.validFrom}</span>
                </div>
                <div class="card-valid">
                    <span class="valid-label">Valid Thru</span>
                    <span class="valid-date">${card.validThru}</span>
                </div>
            </div>
            <div class="card-holder">${card.cardName}</div>
            <div class="card-bank">${card.bankName}</div>
        `;
        
        // Add click event to show card details
        cardElement.addEventListener('click', () => {
            showCardDetails(card.id);
        });
        
        return cardElement;
    };
    
    // Show card details
    const showCardDetails = async (cardId) => {
        try {
            const card = await StorageModule.getCardById(cardId);
            currentCardId = cardId;
            
            // Set card details
            elements.detailCardNickname.textContent = card.nickname || 'Card Details';
            elements.detailCardView.style.backgroundColor = card.color || '#1e3a8a';
            
            // Calculate text color based on background color
            const color = card.color || '#1e3a8a';
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            const textColor = brightness > 128 ? '#000000' : '#ffffff';
            elements.detailCardView.style.color = textColor;
            
            // Format card number to show only last 6 digits
            const cardNumber = card.cardNumber.replace(/\s/g, '');
            const maskedNumber = '•••• •••• ' + cardNumber.slice(-6).replace(/(\d{2})(\d{4})/, '$1 $2');
            
            elements.detailCardNumber.textContent = maskedNumber;
            elements.detailValidFrom.textContent = card.validFrom;
            elements.detailValidThru.textContent = card.validThru;
            elements.detailCardName.textContent = card.cardName;
            elements.detailBankName.textContent = card.bankName;
            
            // Set masked sensitive data
            elements.detailCvv.textContent = '•••';
            elements.detailCvv.classList.add('masked');
            elements.detailFullNumber.textContent = '•••• •••• •••• ••••';
            elements.detailFullNumber.classList.add('masked');
            
            // Store encrypted data for later use
            elements.detailCvv.dataset.encrypted = card.cvv;
            elements.detailFullNumber.dataset.encrypted = card.cardNumber;
            
            // Show card detail screen
            showScreen('cardDetail');
        } catch (error) {
            console.error('Show card details error:', error);
            showToast('Failed to load card details');
        }
    };
    
    // Toggle sensitive data visibility
    const toggleSensitiveData = async (elementId, timeout = 5000) => {
        try {
            const element = document.getElementById(elementId);
            const encryptedData = element.dataset.encrypted;
            const toggleButton = element.nextElementSibling;
            
            if (element.classList.contains('masked')) {
                // Show the data
                element.textContent = encryptedData;
                element.classList.remove('masked');
                toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
                
                // Hide after timeout
                setTimeout(() => {
                    if (elementId === 'detail-cvv') {
                        element.textContent = '•••';
                    } else {
                        element.textContent = '•••• •••• •••• ••••';
                    }
                    element.classList.add('masked');
                    toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
                }, timeout);
            } else {
                // Hide the data
                if (elementId === 'detail-cvv') {
                    element.textContent = '•••';
                } else {
                    element.textContent = '•••• •••• •••• ••••';
                }
                element.classList.add('masked');
                toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
            }
        } catch (error) {
            console.error('Toggle sensitive data error:', error);
            showToast('Failed to show sensitive data');
        }
    };
    
    // Confirm delete card
    const confirmDeleteCard = () => {
        elements.modalTitle.textContent = 'Delete Card';
        elements.modalMessage.textContent = 'Are you sure you want to delete this card? This action cannot be undone.';
        elements.modalConfirm.addEventListener('click', deleteCard, { once: true });
        openModal();
    };
    
    // Delete card
    const deleteCard = async () => {
        try {
            await StorageModule.deleteCard(currentCardId);
            closeModal();
            showScreen('main');
            loadCards();
            showToast('Card deleted successfully');
        } catch (error) {
            console.error('Delete card error:', error);
            showToast('Failed to delete card');
        }
    };
    
    // Edit card
    const editCard = async () => {
        try {
            const card = await StorageModule.getCardById(currentCardId);
            editingCard = card;
            
            // Fill form with card data
            elements.cardTypeSelect.value = card.type;
            elements.cardNicknameInput.value = card.nickname || '';
            elements.cardNumberInput.value = card.cardNumber;
            elements.validFromInput.value = card.validFrom;
            elements.validThruInput.value = card.validThru;
            elements.cardNameInput.value = card.cardName;
            elements.bankNameInput.value = card.bankName;
            elements.cardCvvInput.value = card.cvv;
            elements.cardColorInput.value = card.color || '#1e3a8a';
            
            // Update preview
            updateCardPreview();
            
            // Show add card screen
            showScreen('addCard');
        } catch (error) {
            console.error('Edit card error:', error);
            showToast('Failed to load card for editing');
        }
    };
    
    // Reset card form
    const resetCardForm = () => {
        elements.cardForm.reset();
        elements.cardColorInput.value = '#1e3a8a';
        updateCardPreview();
    };
    
    // Update card preview
    const updateCardPreview = () => {
        // Update card color
        const color = elements.cardColorInput.value;
        elements.cardPreview.style.backgroundColor = color;
        
        // Calculate text color based on background color
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const textColor = brightness > 128 ? '#000000' : '#ffffff';
        elements.cardPreview.style.color = textColor;
        
        // Update other preview elements
        elements.previewValidFrom.textContent = elements.validFromInput.value || 'MM/YY';
        elements.previewValidThru.textContent = elements.validThruInput.value || 'MM/YY';
        elements.previewCardName.textContent = elements.cardNameInput.value || 'CARD HOLDER NAME';
        elements.previewBankName.textContent = elements.bankNameInput.value || 'BANK NAME';
    };
    
    // Format card number input
    const formatCardNumber = (event) => {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');
        let formattedValue = '';
        
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formattedValue += ' ';
            }
            formattedValue += value[i];
        }
        
        input.value = formattedValue;
    };
    
    // Format date input (MM/YY)
    const formatDate = (event) => {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');
        
        if (value.length > 2) {
            input.value = value.slice(0, 2) + '/' + value.slice(2, 4);
        } else {
            input.value = value;
        }
    };
    
    // Save card
    const saveCard = async (event) => {
        event.preventDefault();
        
        try {
            // Get form values
            const type = elements.cardTypeSelect.value;
            const nickname = elements.cardNicknameInput.value;
            const cardNumber = elements.cardNumberInput.value;
            const validFrom = elements.validFromInput.value;
            const validThru = elements.validThruInput.value;
            const cardName = elements.cardNameInput.value;
            const bankName = elements.bankNameInput.value;
            const cvv = elements.cardCvvInput.value;
            const color = elements.cardColorInput.value;
            
            // Validate form
            if (!cardNumber || !validFrom || !validThru || !cardName || !bankName || !cvv) {
                showToast('Please fill in all required fields');
                return;
            }
            
            // Create card object
            const cardData = {
                type,
                nickname,
                cardNumber,
                validFrom,
                validThru,
                cardName,
                bankName,
                cvv,
                color
            };
            
            // If editing, add the ID
            if (editingCard) {
                cardData.id = editingCard.id;
            }
            
            // Save card
            await StorageModule.saveCard(cardData);
            
            // Reset form and show main screen
            resetCardForm();
            showScreen('main');
            loadCards();
            
            showToast(editingCard ? 'Card updated successfully' : 'Card added successfully');
            editingCard = null;
        } catch (error) {
            console.error('Save card error:', error);
            showToast('Failed to save card');
        }
    };
    
    // Load profile
    const loadProfile = async () => {
        try {
            const profile = await StorageModule.getProfile();
            
            // Fill profile form
            elements.userNameInput.value = profile.name || '';
            elements.userEmailInput.value = profile.email || '';
            
            // Check biometric toggle
            const isBiometricEnabled = await AuthModule.isBiometricEnabled();
            elements.biometricToggle.checked = isBiometricEnabled;
            
            // Hide biometric toggle if not available
            if (!AuthModule.isBiometricAvailable()) {
                elements.biometricToggle.parentElement.style.display = 'none';
            } else {
                elements.biometricToggle.parentElement.style.display = 'flex';
            }
        } catch (error) {
            console.error('Load profile error:', error);
            showToast('Failed to load profile');
        }
    };
    
    // Save profile
    const saveProfile = async (event) => {
        event.preventDefault();
        
        try {
            // Get form values
            const name = elements.userNameInput.value;
            const email = elements.userEmailInput.value;
            
            // Save profile
            await StorageModule.saveProfile({ name, email });
            
            showToast('Profile saved successfully');
        } catch (error) {
            console.error('Save profile error:', error);
            showToast('Failed to save profile');
        }
    };
    
    // Toggle biometric authentication
    const toggleBiometric = async () => {
        try {
            const isEnabled = elements.biometricToggle.checked;
            
            if (isEnabled) {
                // Show PIN confirmation modal
                elements.modalTitle.textContent = 'Enable Biometric Authentication';
                elements.modalMessage.textContent = 'Please enter your PIN to enable biometric authentication.';
                
                // Create PIN input
                const pinInput = document.createElement('input');
                pinInput.type = 'password';
                pinInput.id = 'biometric-pin';
                pinInput.maxLength = 4;
                pinInput.pattern = '[0-9]*';
                pinInput.inputMode = 'numeric';
                pinInput.placeholder = 'Enter your PIN';
                pinInput.style.width = '100%';
                pinInput.style.padding = '12px';
                pinInput.style.marginBottom = '16px';
                pinInput.style.borderRadius = '8px';
                pinInput.style.border = '1px solid #ddd';
                
                // Insert PIN input before buttons
                elements.modalMessage.insertAdjacentElement('afterend', pinInput);
                
                // Set up confirm button
                elements.modalConfirm.addEventListener('click', async () => {
                    const pin = document.getElementById('biometric-pin').value;
                    
                    if (pin.length !== 4) {
                        showToast('PIN must be 4 digits');
                        return;
                    }
                    
                    try {
                        await AuthModule.enableBiometric(pin);
                        closeModal();
                        showToast('Biometric authentication enabled');
                    } catch (error) {
                        console.error('Enable biometric error:', error);
                        showToast('Failed to enable biometric authentication');
                        elements.biometricToggle.checked = false;
                        closeModal();
                    }
                }, { once: true });
                
                // Set up cancel button
                elements.modalCancel.addEventListener('click', () => {
                    elements.biometricToggle.checked = false;
                }, { once: true });
                
                openModal();
            } else {
                // Show PIN confirmation modal
                elements.modalTitle.textContent = 'Disable Biometric Authentication';
                elements.modalMessage.textContent = 'Please enter your PIN to disable biometric authentication.';
                
                // Create PIN input
                const pinInput = document.createElement('input');
                pinInput.type = 'password';
                pinInput.id = 'biometric-pin';
                pinInput.maxLength = 4;
                pinInput.pattern = '[0-9]*';
                pinInput.inputMode = 'numeric';
                pinInput.placeholder = 'Enter your PIN';
                pinInput.style.width = '100%';
                pinInput.style.padding = '12px';
                pinInput.style.marginBottom = '16px';
                pinInput.style.borderRadius = '8px';
                pinInput.style.border = '1px solid #ddd';
                
                // Insert PIN input before buttons
                elements.modalMessage.insertAdjacentElement('afterend', pinInput);
                
                // Set up confirm button
                elements.modalConfirm.addEventListener('click', async () => {
                    const pin = document.getElementById('biometric-pin').value;
                    
                    if (pin.length !== 4) {
                        showToast('PIN must be 4 digits');
                        return;
                    }
                    
                    try {
                        await AuthModule.disableBiometric(pin);
                        closeModal();
                        showToast('Biometric authentication disabled');
                    } catch (error) {
                        console.error('Disable biometric error:', error);
                        showToast('Failed to disable biometric authentication');
                        elements.biometricToggle.checked = true;
                        closeModal();
                    }
                }, { once: true });
                
                // Set up cancel button
                elements.modalCancel.addEventListener('click', () => {
                    elements.biometricToggle.checked = true;
                }, { once: true });
                
                openModal();
            }
        } catch (error) {
            console.error('Toggle biometric error:', error);
            showToast('Failed to toggle biometric authentication');
            elements.biometricToggle.checked = !elements.biometricToggle.checked;
        }
    };
    
    // Change PIN
    const changePin = async (event) => {
        event.preventDefault();
        
        try {
            // Get form values
            const currentPin = elements.currentPinInput.value;
            const newPin = elements.newPinChangeInput.value;
            const confirmPin = elements.confirmPinChangeInput.value;
            
            // Validate form
            if (!currentPin || !newPin || !confirmPin) {
                showToast('Please fill in all fields');
                return;
            }
            
            if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
                showToast('PIN must be 4 digits');
                return;
            }
            
            if (newPin !== confirmPin) {
                showToast('New PINs do not match');
                return;
            }
            
            // Change PIN
            await AuthModule.changePin(currentPin, newPin);
            
            // Update current PIN for biometric auth
            AuthModule.setCurrentPin(newPin);
            
            // Reset form and show profile screen
            elements.changePinForm.reset();
            showScreen('profile');
            
            showToast('PIN changed successfully');
        } catch (error) {
            console.error('Change PIN error:', error);
            showToast('Failed to change PIN');
        }
    };
    
    // Open modal
    const openModal = () => {
        elements.confirmationModal.classList.add('active');
    };
    
    // Close modal
    const closeModal = () => {
        elements.confirmationModal.classList.remove('active');
        
        // Remove any dynamically added elements
        const pinInput = document.getElementById('biometric-pin');
        if (pinInput) {
            pinInput.remove();
        }
    };
    
    // Show toast message
    const showToast = (message, duration = 3000) => {
        elements.toastMessage.textContent = message;
        elements.toast.classList.add('show');
        
        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, duration);
    };
    
    // Public API
    return {
        init,
        showScreen,
        showToast
    };
})();