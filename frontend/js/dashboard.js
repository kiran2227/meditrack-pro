// Dashboard functionality for medicines and profile
class DashboardManager {
    constructor() {
        this.setupDashboardEventListeners();
    }

    setupDashboardEventListeners() {
        // Add medicine form
        document.getElementById('addMedicineForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddMedicine();
        });

        // Profile form
        document.getElementById('profileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUpdateProfile();
        });

        // Export history
        document.getElementById('exportHistoryBtn').addEventListener('click', () => {
            this.exportHistory();
        });

        // Apply history filters
        document.getElementById('applyHistoryFilter').addEventListener('click', () => {
            this.applyHistoryFilters();
        });

        // Voice file upload
        document.getElementById('voiceFileInput').addEventListener('change', (e) => {
            this.handleVoiceFileUpload(e.target.files[0]);
        });

        // Drag and drop for voice files
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
            uploadArea.style.background = 'var(--primary-light)';
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--gray-300)';
            uploadArea.style.background = 'white';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--gray-300)';
            uploadArea.style.background = 'white';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleVoiceFileUpload(files[0]);
            }
        });
    }

    async handleAddMedicine() {
        const name = document.getElementById('medicineName').value.trim();
        const dosage = document.getElementById('medicineDosage').value.trim();
        const time = document.getElementById('medicineTime').value;
        const frequency = document.getElementById('medicineFrequency').value;
        const stock = document.getElementById('medicineStock').value;
        const refill = document.getElementById('medicineRefill').value;

        if (!name || !dosage || !time) {
            app.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const btn = document.getElementById('saveMedicineBtn');
        const originalText = btn.innerHTML;

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            await app.apiCall('/api/medicines', 'POST', {
                name,
                dosage,
                time,
                frequency,
                stock: stock || 0,
                refill_reminder: refill || 0
            });

            app.showNotification('Medicine added successfully!', 'success');
            
            // Clear form
            document.getElementById('addMedicineForm').reset();
            
            // Reload medicines
            await app.loadMedicines();
            
            // Switch back to dashboard
            switchContentSection('dashboard-section');

        } catch (error) {
            console.error('Error adding medicine:', error);
            app.showNotification('Failed to add medicine', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async handleUpdateProfile() {
        const name = document.getElementById('profileName').value.trim();
        const age = document.getElementById('profileAge').value;
        const medicalHistory = document.getElementById('profileMedicalHistory').value;
        const guardianName = document.getElementById('profileGuardianName').value;
        const guardianContact = document.getElementById('profileGuardianContact').value;

        if (!name) {
            app.showNotification('Name is required', 'error');
            return;
        }

        const btn = document.getElementById('saveProfileBtn');
        const originalText = btn.innerHTML;

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            btn.disabled = true;

            await app.apiCall('/api/users/profile', 'PUT', {
                name,
                age: age || null,
                medical_history: medicalHistory || null,
                guardian_name: guardianName || null,
                guardian_contact: guardianContact || null
            });

            app.showNotification('Profile updated successfully!', 'success');
            
            // Update app state
            app.currentUser.name = name;
            app.currentUser.age = age;
            app.currentUser.medical_history = medicalHistory;
            app.currentUser.guardian_name = guardianName;
            app.currentUser.guardian_contact = guardianContact;
            
            // Update UI
            document.getElementById('userName').textContent = name;

        } catch (error) {
            console.error('Error updating profile:', error);
            app.showNotification('Failed to update profile', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async markMedicineAsTaken(medicineId) {
        try {
            const notes = prompt('Add any notes (optional):') || '';
            
            await app.apiCall(`/api/medicines/${medicineId}/taken`, 'POST', {
                notes
            });

            app.showNotification('Medicine marked as taken!', 'success');
            await app.loadMedicines();
            await app.loadHistory();

        } catch (error) {
            console.error('Error marking medicine as taken:', error);
            app.showNotification('Failed to update medicine', 'error');
        }
    }

    async deleteMedicine(medicineId) {
        if (!confirm('Are you sure you want to delete this medicine?')) {
            return;
        }

        try {
            await app.apiCall(`/api/medicines/${medicineId}`, 'DELETE');
            
            app.showNotification('Medicine deleted successfully!', 'success');
            await app.loadMedicines();

        } catch (error) {
            console.error('Error deleting medicine:', error);
            app.showNotification('Failed to delete medicine', 'error');
        }
    }

    async handleVoiceFileUpload(file) {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('audio/')) {
            app.showNotification('Please select an audio file', 'error');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            app.showNotification('File size must be less than 10MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('voiceFile', file);

        try {
            // Show upload progress
            const uploadArea = document.getElementById('uploadArea');
            const uploadProgress = document.getElementById('uploadProgress');
            const progressFill = document.getElementById('progressFill');
            const uploadStatus = document.getElementById('uploadStatus');

            uploadArea.style.display = 'none';
            uploadProgress.style.display = 'block';
            progressFill.style.width = '0%';
            uploadStatus.textContent = 'Uploading...';

            // Simulate progress (in real app, you'd use XMLHttpRequest for progress events)
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 5;
                progressFill.style.width = `${progress}%`;
                if (progress >= 90) {
                    clearInterval(progressInterval);
                }
            }, 100);

            const response = await fetch('http://localhost:5000/api/voice/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${app.token}`
                },
                body: formData
            });

            clearInterval(progressInterval);
            progressFill.style.width = '100%';

            const data = await response.json();

            if (data.success) {
                uploadStatus.textContent = 'Upload successful!';
                app.showNotification('Voice alert uploaded successfully!', 'success');
                
                // Reload voice alerts
                await app.loadVoiceAlerts();
                
                // Reset upload area
                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                    uploadArea.style.display = 'block';
                    document.getElementById('voiceFileInput').value = '';
                }, 1000);
            } else {
                throw new Error(data.message);
            }

        } catch (error) {
            console.error('Upload error:', error);
            app.showNotification('Failed to upload voice alert', 'error');
            
            // Reset upload area
            document.getElementById('uploadProgress').style.display = 'none';
            document.getElementById('uploadArea').style.display = 'block';
        }
    }

    async deleteVoiceAlert(alertId) {
        if (!confirm('Are you sure you want to delete this voice alert?')) {
            return;
        }

        try {
            // Note: You would need to implement this endpoint in the backend
            await app.apiCall(`/api/voice/${alertId}`, 'DELETE');
            
            app.showNotification('Voice alert deleted successfully!', 'success');
            await app.loadVoiceAlerts();

        } catch (error) {
            console.error('Error deleting voice alert:', error);
            app.showNotification('Failed to delete voice alert', 'error');
        }
    }

    async exportHistory() {
        try {
            const response = await fetch('http://localhost:5000/api/export?format=csv', {
                headers: {
                    'Authorization': `Bearer ${app.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `meditrack-history-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            app.showNotification('History exported successfully!', 'success');

        } catch (error) {
            console.error('Export error:', error);
            app.showNotification('Failed to export history', 'error');
        }
    }

    async applyHistoryFilters() {
        const range = document.getElementById('historyRange').value;
        const status = document.getElementById('historyStatus').value;

        try {
            let url = `/api/history?range=${range}`;
            if (status !== 'all') {
                url += `&status=${status}`;
            }

            const response = await app.apiCall(url, 'GET');
            if (response.success) {
                app.history = response.history || [];
                app.updateHistoryTable();
            }
        } catch (error) {
            console.error('Error applying filters:', error);
            app.showNotification('Failed to apply filters', 'error');
        }
    }
}

// Initialize dashboard manager
const dashboardManager = new DashboardManager();

// Make methods globally available for onclick handlers
window.app = app;

// Medicine actions
app.markMedicineAsTaken = async function(medicineId) {
    await dashboardManager.markMedicineAsTaken(medicineId);
};

app.deleteMedicine = async function(medicineId) {
    await dashboardManager.deleteMedicine(medicineId);
};

app.deleteVoiceAlert = async function(alertId) {
    await dashboardManager.deleteVoiceAlert(alertId);
};

app.rescheduleReminder = async function(minutes) {
    await dashboardManager.rescheduleReminder(minutes);
};