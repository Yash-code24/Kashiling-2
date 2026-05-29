/**
 * KASHILING TEMPLE APP - CORE LOGIC (Part 2)
 */

const AppCore = (() => {
    
    // --- STATE MANAGEMENT ---
    let currentUser = JSON.parse(sessionStorage.getItem('kashiling_user')) || null;
    let selectedDonationCategory = 'General';
    let pendingDonationAmount = 0;

    // --- DOM ELEMENTS ---
    const splashScreen = document.getElementById('splash-screen');
    const authView = document.getElementById('auth-view');
    const mainApp = document.getElementById('main-app');
    const toastContainer = document.getElementById('toast-container');
    const navItems = document.querySelectorAll('.bottom-nav .nav-item[data-target]');

    // --- INITIALIZATION ---
    const init = () => {
        setTimeout(() => {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.classList.remove('active');
                splashScreen.style.display = 'none';
                checkAuthState();
                
                // Set min date for pooja to today
                const today = new Date().toISOString().split('T')[0];
                if(document.getElementById('pooja-date')) {
                    document.getElementById('pooja-date').min = today;
                }
            }, 500);
        }, 1500);
    };

    // --- AUTHENTICATION ---
    const checkAuthState = () => {
        if (currentUser) {
            authView.classList.add('hidden');
            mainApp.classList.remove('hidden');
            if(document.getElementById('user-greeting')) {
                document.getElementById('user-greeting').innerText = `Namaskaram, ${currentUser.name} 🙏`;
            }
        } else {
            authView.classList.remove('hidden');
            mainApp.classList.add('hidden');
        }
    };

    const loginAsGuest = () => {
        currentUser = { uid: 'guest_' + Math.floor(Math.random()*1000), name: 'Devotee', role: 'user' };
        sessionStorage.setItem('kashiling_user', JSON.stringify(currentUser));
        showToast('Logged in successfully', 'success');
        checkAuthState();
    };

    const navigate = (viewId) => {
        document.querySelectorAll('.page-view').forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(`view-${viewId}`);
        if(targetView) {
            targetView.classList.add('active');
        } else {
            showToast('Module coming in next update!', 'info');
            return;
        }
        navItems.forEach(item => item.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-target="${viewId}"]`);
        if(activeNav) activeNav.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- 💰 DONATION SYSTEM ---
    const selectCategory = (element, category) => {
        document.querySelectorAll('.category-pill').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
        selectedDonationCategory = category;
    };

    const processDonation = () => {
        const amount = document.getElementById('donation-amount').value;
        if(!amount || amount < 10) {
            showToast('Please enter a valid amount (Min ₹10)', 'error');
            return;
        }
        pendingDonationAmount = amount;
        
        // Update QR Code dynamically (Using a free QR API for demo)
        const upiString = `upi://pay?pa=temple@upi&pn=KashilingTemple&am=${amount}&cu=INR`;
        document.getElementById('upi-qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
        document.getElementById('qr-amount-display').innerText = `Amount: ₹${amount}`;
        
        document.getElementById('qr-modal').classList.remove('hidden');
    };

    const confirmPayment = () => {
        // In a real app, you would verify payment status via webhook here.
        // For this app, we simulate success.
        closeModal('qr-modal');
        
        const donorName = document.getElementById('donor-name').value || currentUser.name;
        const receiptId = 'TXN' + Math.floor(Math.random() * 100000000);
        const date = new Date().toLocaleString();

        // 1. Save to Database
        saveToDatabase('donations', {
            uid: currentUser.uid,
            name: donorName,
            amount: pendingDonationAmount,
            category: selectedDonationCategory,
            date: new Date().toISOString(),
            receiptId: receiptId
        });

        // 2. Populate Receipt UI
        document.getElementById('receipt-id').innerText = receiptId;
        document.getElementById('receipt-name').innerText = donorName;
        document.getElementById('receipt-cause').innerText = selectedDonationCategory;
        document.getElementById('receipt-amount').innerText = pendingDonationAmount;
        document.getElementById('receipt-date').innerText = date;

        document.getElementById('receipt-modal').classList.remove('hidden');
        showToast('Donation received successfully!', 'success');
        
        // Reset form
        document.getElementById('donation-amount').value = '';
    };

    // --- 🛕 POOJA BOOKING SYSTEM ---
    const bookPooja = () => {
        const poojaSelect = document.getElementById('pooja-type').value.split('|');
        const poojaName = poojaSelect[0];
        const poojaPrice = poojaSelect[1];
        const date = document.getElementById('pooja-date').value;
        const devoteeName = document.getElementById('pooja-name').value;
        const gotra = document.getElementById('pooja-gotra').value || 'Not specified';

        if(!date || !devoteeName) {
            showToast('Please fill all required details', 'error');
            return;
        }

        const bookingId = 'BK' + Math.floor(Math.random() * 1000000);

        saveToDatabase('bookings', {
            uid: currentUser.uid,
            bookingId: bookingId,
            poojaName: poojaName,
            price: poojaPrice,
            date: date,
            devoteeName: devoteeName,
            gotra: gotra,
            status: 'Confirmed'
        });

        showToast(`Pooja Booked! ID: ${bookingId}`, 'success');
        
        // Reset form
        document.getElementById('pooja-date').value = '';
        document.getElementById('pooja-name').value = '';
        document.getElementById('pooja-gotra').value = '';
        
        setTimeout(() => navigate('home'), 2000);
    };

    // --- ☁️ DATABASE ABSTRACTION (Firebase + LocalStorage Fallback) ---
    const saveToDatabase = async (collectionName, data) => {
        // 1. Save to LocalStorage (Offline Backup / Free Tier optimization)
        let localData = JSON.parse(localStorage.getItem(`kashiling_${collectionName}`)) || [];
        localData.push(data);
        localStorage.setItem(`kashiling_${collectionName}`, JSON.stringify(localData));

        // 2. Save to Firebase (If configured in index.html)
        if (window.firebaseDb && window.firebaseDb.addDoc) {
            try {
                // Assuming firebaseDb is exported from the module script
                await window.firebaseDb.addDoc(window.firebaseDb.collection(window.firebaseDb.db, collectionName), data);
                console.log("Saved to Firestore");
            } catch (e) {
                console.error("Firebase save failed, data is safe in LocalStorage", e);
            }
        }
    };

    // --- UTILITIES ---
    const closeModal = (id) => {
        document.getElementById(id).classList.add('hidden');
    };

    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = 'toast';
        let icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
        if(type === 'error') toast.style.borderLeftColor = '#ff4444';
        if(type === 'success') toast.style.borderLeftColor = '#00C851';
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    return {
        init, loginAsGuest, navigate, showToast,
        selectCategory, processDonation, confirmPayment, closeModal,
        bookPooja
    };
})();

window.onload = AppCore.init;
window.app = AppCore;
