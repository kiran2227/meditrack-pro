// Main application initialization
class MediTrackApp {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.medicines = [];
        this.voiceAlerts = [];
        this.history = [];
        this.reminderInterval = null;
        
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.startReminderChecker();
    }

    checkAuthentication() {
        const token = localStorage.getItem('meditrack_token');
        const user = localStorage.getItem('meditrack_user');

        if (token && user) {
            this.token = token;
            this.currentUser = JSON.parse(user);
            this.showDashboard();
        } else {
            this.showLandingPage();
        }
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('landingLoginBtn').addEventListener('click', () => this.showAuthPage('login'));
        document.getElementById('landingRegisterBtn').addEventListener('click', () => this.showAuthPage('register'));
        document.getElementById('heroGetStartedBtn').addEventListener('click', () => this.showAuthPage('register'));
        
        // Auth tabs
        document.getElementById('loginTab').addEventListener('click', () => this.switchAuthTab('login'));
        document.getElementById('registerTab').addEventListener('click', () => this.switchAuthTab('register'));

        // Modal buttons
        document.getElementById('markTakenBtn').addEventListener('click', () => this.handleMedicineAction('taken'));
        document.getElementById('remindLaterBtn').addEventListener('click', () => this.showRemindLaterOptions());
        document.getElementById('snoozeBtn').addEventListener('click', () => this.snoozeReminder());

        // Close modal when clicking outside
        document.getElementById('reminderModal').addEventListener('click', (e) => {
            if (e.target.id === 'reminderModal') {
                this.hideReminderModal();
            }
        });
    }

    showLandingPage() {
        this.hideAllPages();
        document.getElementById('landingPage').classList.add('active');
    }

    showAuthPage(tab = 'login') {
        this.hideAllPages();
        document.getElementById('authPage').classList.add('active');
        this.switchAuthTab(tab);
    }

    showDashboard() {
        this.hideAllPages();
        document.getElementById('dashboard').classList.add('active');
        document.getElementById('userName').textContent = this.currentUser.name;
        document.getElementById('userAvatar').textContent = this.currentUser.name.charAt(0).toUpperCase();
        
        this.loadDashboardData();
    }

    hideAllPages() {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
    }

    switchAuthTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadMedicines(),
                this.loadVoiceAlerts(),
                this.loadHistory(),
                this.loadProfile()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadMedicines() {
        try {
            const response = await this.apiCall('/api/medicines', 'GET');
            if (response.success) {
                this.medicines = response.medicines;
                this.updateMedicineTable();
                this.updateSummaryCards();
                this.checkDueMedicines();
            }
        } catch (error) {
            console.error('Error loading medicines:', error);
        }
    }

    async loadVoiceAlerts() {
        try {
            const response = await this.apiCall('/api/voice', 'GET');
            if (response.success) {
                this.voiceAlerts = response.voiceAlerts || [];
                this.updateVoiceAlertsList();
            }
        } catch (error) {
            console.error('Error loading voice alerts:', error);
        }
    }

    async loadHistory() {
        try {
            const response = await this.apiCall('/api/history?range=30', 'GET');
            if (response.success) {
                this.history = response.history || [];
                this.updateHistoryTable();
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    async loadProfile() {
        try {
            const response = await this.apiCall('/api/users/profile', 'GET');
            if (response.success) {
                this.populateProfileForm(response.user);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    updateMedicineTable() {
        const tableBody = document.getElementById('medicineTableBody');
        tableBody.innerHTML = '';

        this.medicines.forEach(medicine => {
            const row = document.createElement('tr');
            const statusBadge = this.getStatusBadge(medicine.status);
            const voiceAlert = medicine.voice_alert_path ? 'Custom' : 'Default';

            row.innerHTML = `
                <td>${medicine.name}</td>
                <td>${medicine.dosage}</td>
                <td>${medicine.time}</td>
                <td>${voiceAlert}</td>
                <td>${statusBadge}</td>
                <td class="action-buttons">
                    <button class="btn btn-success btn-sm" onclick="app.markMedicineAsTaken(${medicine.id})">
                        <i class="fas fa-check"></i> Taken
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="app.deleteMedicine(${medicine.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    updateSummaryCards() {
        const takenCount = this.medicines.filter(m => m.status === 'taken').length;
        const pendingCount = this.medicines.filter(m => m.status === 'pending').length;
        const missedCount = this.medicines.filter(m => m.status === 'missed').length;
        const lowStockCount = this.medicines.filter(m => m.stock > 0 && m.stock <= m.refill_reminder).length;

        document.getElementById('takenCount').textContent = takenCount;
        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('missedCount').textContent = missedCount;
        document.getElementById('lowStockCount').textContent = lowStockCount;
    }

    updateHistoryTable() {
        const tableBody = document.getElementById('historyTableBody');
        tableBody.innerHTML = '';

        this.history.forEach(record => {
            const row = document.createElement('tr');
            const date = new Date(record.created_at).toLocaleDateString();
            const scheduledTime = record.scheduled_time;
            const actualTime = record.actual_time ? new Date(record.actual_time).toLocaleTimeString() : '-';
            const statusBadge = this.getStatusBadge(record.status);

            row.innerHTML = `
                <td>${date}</td>
                <td>${record.medicine_name}</td>
                <td>${record.dosage}</td>
                <td>${scheduledTime}</td>
                <td>${actualTime}</td>
                <td>${statusBadge}</td>
                <td>${record.notes || '-'}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    updateVoiceAlertsList() {
        const container = document.getElementById('voiceAlertsList');
        container.innerHTML = '';

        if (this.voiceAlerts.length === 0) {
            container.innerHTML = '<p>No voice alerts uploaded yet.</p>';
            return;
        }

        this.voiceAlerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = 'voice-alert-item';
            alertElement.innerHTML = `
                <i class="fas fa-volume-up"></i>
                <div class="voice-alert-info">
                    <div class="voice-alert-name">${alert.file_name}</div>
                    <div class="voice-alert-date">${new Date(alert.created_at).toLocaleDateString()}</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="app.deleteVoiceAlert(${alert.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(alertElement);
        });
    }

    populateProfileForm(user) {
        document.getElementById('profileName').value = user.name || '';
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profileAge').value = user.age || '';
        document.getElementById('profileMedicalHistory').value = user.medical_history || '';
        document.getElementById('profileGuardianName').value = user.guardian_name || '';
        document.getElementById('profileGuardianContact').value = user.guardian_contact || '';
    }

    getStatusBadge(status) {
        const badges = {
            'taken': '<span class="status-badge status-taken"><i class="fas fa-check-circle"></i> Taken</span>',
            'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>',
            'missed': '<span class="status-badge status-missed"><i class="fas fa-times-circle"></i> Missed</span>',
            'rescheduled': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Rescheduled</span>'
        };
        return badges[status] || badges.pending;
    }

    // Reminder System
    startReminderChecker() {
        this.reminderInterval = setInterval(() => {
            this.checkDueMedicines();
        }, 60000); // Check every minute
    }

    checkDueMedicines() {
        if (!this.currentUser) return;

        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

        const dueMedicines = this.medicines.filter(medicine => {
            return medicine.status === 'pending' && medicine.time <= currentTime;
        });

        if (dueMedicines.length > 0 && !this.isReminderActive()) {
            this.showReminderModal(dueMedicines[0]);
        }
    }

    isReminderActive() {
        return document.getElementById('reminderModal').classList.contains('active');
    }

    showReminderModal(medicine) {
        const modal = document.getElementById('reminderModal');
        const content = document.getElementById('reminderContent');
        
        content.innerHTML = `
            <div style="text-align: center; padding: 20px 0;">
                <i class="fas fa-bell" style="font-size: 3rem; color: var(--warning); margin-bottom: 16px;"></i>
                <h3 style="margin-bottom: 8px; color: var(--gray-900);">Time to take your medicine!</h3>
                <p style="font-size: 1.2rem; color: var(--gray-700); margin-bottom: 8px;">
                    <strong>${medicine.name}</strong> - ${medicine.dosage}
                </p>
                <p style="color: var(--gray-600);">Scheduled for: ${medicine.time}</p>
            </div>
        `;

        modal.classList.add('active');
        this.currentReminderMedicine = medicine;

        // Play voice alert if available
        this.playVoiceAlert(medicine);
    }

    hideReminderModal() {
        document.getElementById('reminderModal').classList.remove('active');
        this.currentReminderMedicine = null;
    }

    async playVoiceAlert(medicine) {
        // This would play the custom voice alert or default system voice
        // For now, we'll use the Web Speech API as a fallback
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(
                `Time to take your medicine: ${medicine.name}, ${medicine.dosage}`
            );
            speechSynthesis.speak(utterance);
        }
    }

    async handleMedicineAction(action) {
        if (!this.currentReminderMedicine) return;

        if (action === 'taken') {
            await this.markMedicineAsTaken(this.currentReminderMedicine.id);
        }

        this.hideReminderModal();
    }

    showRemindLaterOptions() {
        const content = document.getElementById('reminderContent');
        content.innerHTML = `
            <div style="text-align: center;">
                <h4 style="margin-bottom: 16px;">When should I remind you again?</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                    <button class="btn btn-secondary" onclick="app.rescheduleReminder(15)">15 minutes</button>
                    <button class="btn btn-secondary" onclick="app.rescheduleReminder(30)">30 minutes</button>
                    <button class="btn btn-secondary" onclick="app.rescheduleReminder(60)">1 hour</button>
                    <button class="btn btn-secondary" onclick="app.rescheduleReminder(120)">2 hours</button>
                </div>
                <button class="btn btn-primary" onclick="app.showReminderModal(app.currentReminderMedicine)">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
            </div>
        `;
    }

    async rescheduleReminder(minutes) {
        if (!this.currentReminderMedicine) return;

        try {
            await this.apiCall(`/api/medicines/${this.currentReminderMedicine.id}/reschedule`, 'POST', {
                remindInMinutes: minutes
            });

            this.hideReminderModal();
            // Show confirmation
            this.showNotification(`Reminder set for ${minutes} minutes from now`, 'success');
        } catch (error) {
            console.error('Error rescheduling:', error);
            this.showNotification('Error rescheduling reminder', 'error');
        }
    }

    snoozeReminder() {
        // Simple snooze for 5 minutes
        setTimeout(() => {
            if (this.currentReminderMedicine) {
                this.showReminderModal(this.currentReminderMedicine);
            }
        }, 5 * 60 * 1000);
        
        this.hideReminderModal();
        this.showNotification('Reminder snoozed for 5 minutes', 'info');
    }

    // API Methods
    async apiCall(endpoint, method = 'GET', data = null) {
        const url = `http://localhost:5000${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'API call failed');
        }

        return result;
    }

    // Utility Methods
    showNotification(message, type = 'info') {
        // Simple notification implementation
        alert(`${type.toUpperCase()}: ${message}`);
    }

    logout() {
        localStorage.removeItem('meditrack_token');
        localStorage.removeItem('meditrack_user');
        this.token = null;
        this.currentUser = null;
        this.medicines = [];
        this.voiceAlerts = [];
        this.history = [];

        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
        }

        this.showLandingPage();
    }
}

// Global app instance
const app = new MediTrackApp();

// Utility functions for global access
function switchContentSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show target section
    document.getElementById(sectionId).classList.add('active');

    // Activate corresponding menu item
    const menuItem = document.querySelector(`.menu-item[data-target="${sectionId}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }

    // Load section-specific data
    if (sectionId === 'dashboard-section') {
        app.loadMedicines();
    } else if (sectionId === 'history-section') {
        app.loadHistory();
    } else if (sectionId === 'voice-alerts-section') {
        app.loadVoiceAlerts();
    } else if (sectionId === 'profile-section') {
        app.loadProfile();
    }
}

// Setup menu navigation
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            switchContentSection(target);
        });
    });
});