class DashboardManager {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.isRecording = false;
        this.voiceAlertId = null;
        this.editingMedicineId = null;
        
        this.editMediaRecorder = null;
        this.editAudioChunks = [];
        this.editAudioBlob = null;
        this.isEditRecording = false;
        this.editVoiceAlertId = null;
        
        this.setupDashboardEventListeners();
    }

    setupDashboardEventListeners() {
        // Add medicine form
        const addMedicineForm = document.getElementById('addMedicineForm');
        if (addMedicineForm) {
            addMedicineForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddMedicine();
            });
        }

        // Edit medicine form
        const editMedicineForm = document.getElementById('editMedicineForm');
        if (editMedicineForm) {
            editMedicineForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateMedicine();
            });
        }

        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateProfile();
            });
        }

        // Export history
        const exportBtn = document.getElementById('exportHistoryBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportHistory();
            });
        }

        // Apply history filter
        const applyFilterBtn = document.getElementById('applyHistoryFilter');
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => {
                this.applyHistoryFilters();
            });
        }

        // File upload previews
        this.setupFileUploadListeners();
        
        // Voice recording setup
        this.setupVoiceRecording();
        this.setupEditVoiceRecording();
        
        // Duration type toggle
        this.setupDurationToggle();
    }

    setupDurationToggle() {
        const durationTypeSelect = document.getElementById('medicineDurationType');
        if (durationTypeSelect) {
            durationTypeSelect.addEventListener('change', () => {
                this.toggleCustomDaysInput();
            });
        }
    }

    toggleCustomDaysInput() {
        const typeSelect = document.getElementById('medicineDurationType');
        const customDaysGroup = document.getElementById('customDaysGroup');
        if (!typeSelect || !customDaysGroup) return;

        if (typeSelect.value === 'custom') {
            customDaysGroup.style.display = 'block';
        } else {
            customDaysGroup.style.display = 'none';
            const daysInput = document.getElementById('customDays');
            if (daysInput) daysInput.value = '';
        }
    }

    setupFileUploadListeners() {
        const medicinePhotoInput = document.getElementById('medicinePhotoInput');
        if (medicinePhotoInput) {
            medicinePhotoInput.addEventListener('change', (e) => {
                this.handleMedicinePhotoPreview(e.target.files[0]);
            });
        }

        const editMedicinePhotoInput = document.getElementById('editMedicinePhotoInput');
        if (editMedicinePhotoInput) {
            editMedicinePhotoInput.addEventListener('change', (e) => {
                this.handleEditMedicinePhotoPreview(e.target.files[0]);
            });
        }

        const profilePhotoInput = document.getElementById('profilePhotoInput');
        if (profilePhotoInput) {
            profilePhotoInput.addEventListener('change', (e) => {
                this.handleProfilePhotoPreview(e.target.files[0]);
            });
        }

        const voiceFileInput = document.getElementById('voiceFileInput');
        if (voiceFileInput) {
            voiceFileInput.addEventListener('change', (e) => {
                this.handleVoiceFilePreview(e.target.files[0]);
            });
        }

        const editVoiceFileInput = document.getElementById('editVoiceFileInput');
        if (editVoiceFileInput) {
            editVoiceFileInput.addEventListener('change', (e) => {
                this.handleEditVoiceFilePreview(e.target.files[0]);
            });
        }
    }

    setupVoiceRecording() {
        const voiceAlertType = document.getElementById('voiceAlertType');
        if (voiceAlertType) {
            voiceAlertType.addEventListener('change', () => {
                this.handleVoiceTypeChange('add');
            });
        }

        // Recording buttons
        const startBtn = document.getElementById('startRecordingBtn');
        const stopBtn = document.getElementById('stopRecordingBtn');
        const playBtn = document.getElementById('playRecordingBtn');
        const saveBtn = document.getElementById('saveRecordingBtn');

        if (startBtn) startBtn.addEventListener('click', () => this.startRecording());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopRecording());
        if (playBtn) playBtn.addEventListener('click', () => this.playRecording());
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveRecording());
    }

    setupEditVoiceRecording() {
        const editVoiceAlertType = document.getElementById('editVoiceAlertType');
        if (editVoiceAlertType) {
            editVoiceAlertType.addEventListener('change', () => {
                this.handleVoiceTypeChange('edit');
            });
        }

        // Edit recording buttons
        const startBtn = document.getElementById('editStartRecordingBtn');
        const stopBtn = document.getElementById('editStopRecordingBtn');
        const playBtn = document.getElementById('editPlayRecordingBtn');
        const saveBtn = document.getElementById('editSaveRecordingBtn');

        if (startBtn) startBtn.addEventListener('click', () => this.startEditRecording());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopEditRecording());
        if (playBtn) playBtn.addEventListener('click', () => this.playEditRecording());
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveEditRecording());
    }

    handleVoiceTypeChange(type) {
        const prefix = type === 'edit' ? 'edit' : '';
        const recordingSection = document.getElementById(`${prefix}RecordingSection`);
        const uploadVoiceSection = document.getElementById(`${prefix}UploadVoiceSection`);

        if (recordingSection) recordingSection.style.display = 'none';
        if (uploadVoiceSection) uploadVoiceSection.style.display = 'none';

        const voiceType = document.getElementById(`${prefix}VoiceAlertType`).value;
        
        if (voiceType === 'record') {
            if (recordingSection) recordingSection.style.display = 'block';
            this.resetRecordingUI(type);
        } else if (voiceType === 'upload') {
            if (uploadVoiceSection) uploadVoiceSection.style.display = 'block';
        }
    }

    // Recording methods for add medicine
    async startRecording() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showNotification('Your browser does not support audio recording', 'error');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { 
                    type: 'audio/wav' 
                });
                
                const audioUrl = URL.createObjectURL(this.audioBlob);
                const audioPlayer = document.getElementById('audioPlayer');
                if (audioPlayer) {
                    audioPlayer.src = audioUrl;
                }
                
                const recordedAudio = document.getElementById('recordedAudio');
                if (recordedAudio) {
                    recordedAudio.style.display = 'block';
                }
                
                document.getElementById('playRecordingBtn').disabled = false;
                document.getElementById('saveRecordingBtn').disabled = false;

                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            const visualizer = document.getElementById('recordingVisualizer');
            if (visualizer) {
                visualizer.innerHTML = 
                    '<i class="fas fa-circle" style="color: red; animation: blink 1s infinite;"></i> Recording... Speak your reminder message now';
            }
            
            document.getElementById('startRecordingBtn').disabled = true;
            document.getElementById('stopRecordingBtn').disabled = false;

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showNotification('Error accessing microphone. Please check permissions.', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;

            const visualizer = document.getElementById('recordingVisualizer');
            if (visualizer) {
                visualizer.innerHTML = 
                    '<i class="fas fa-check-circle" style="color: green;"></i> Recording complete!';
            }
            
            document.getElementById('startRecordingBtn').disabled = false;
            document.getElementById('stopRecordingBtn').disabled = true;
        }
    }

    playRecording() {
        const audioPlayer = document.getElementById('audioPlayer');
        if (audioPlayer && audioPlayer.src) {
            audioPlayer.play();
        }
    }

    async saveRecording() {
        if (!this.audioBlob) {
            this.showNotification('No recording to save. Please record a message first.', 'error');
            return;
        }

        try {
            const user = this.getCurrentUser();
            if (!user) {
                this.showNotification('Please login first', 'error');
                return;
            }

            const alertName = document.getElementById('alertName')?.value || `Voice Alert ${new Date().toLocaleString()}`;
            
            const formData = new FormData();
            formData.append('voiceFile', this.audioBlob, `${alertName}.wav`);
            formData.append('alertName', alertName);

            const result = await app.apiCall('/api/voice/upload', 'POST', formData, true);
            

            if (result.success) {
                this.showNotification('Voice alert saved successfully!', 'success');
                this.voiceAlertId = result.voiceAlert.id;
                console.log("🎤 Recorded voice saved with ID:", this.voiceAlertId);
                this.resetRecordingUI();
                document.getElementById('voiceAlertType').value = 'record';
            } else {
                this.showNotification(result.message || 'Failed to save voice alert', 'error');
            }

        } catch (error) {
            console.error('Error saving recording:', error);
            this.showNotification('Error saving recording. Please try again.', 'error');
        }
    }

    resetRecordingUI() {
        this.audioBlob = null;
        this.audioChunks = [];
        const visualizer = document.getElementById('recordingVisualizer');
        if (visualizer) {
            visualizer.innerHTML = 
                '<i class="fas fa-microphone"></i> Click "Start Recording" to record your voice alert';
        }
        
        const recordedAudio = document.getElementById('recordedAudio');
        if (recordedAudio) {
            recordedAudio.style.display = 'none';
        }
        
        document.getElementById('startRecordingBtn').disabled = false;
        document.getElementById('stopRecordingBtn').disabled = true;
        document.getElementById('playRecordingBtn').disabled = true;
        document.getElementById('saveRecordingBtn').disabled = true;
    }

    // Recording methods for edit medicine
    async startEditRecording() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showNotification('Your browser does not support audio recording', 'error');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            this.editMediaRecorder = new MediaRecorder(stream);
            this.editAudioChunks = [];

            this.editMediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.editAudioChunks.push(event.data);
                }
            };

            this.editMediaRecorder.onstop = () => {
                this.editAudioBlob = new Blob(this.editAudioChunks, { 
                    type: 'audio/wav' 
                });
                
                const audioUrl = URL.createObjectURL(this.editAudioBlob);
                const audioPlayer = document.getElementById('editAudioPlayer');
                if (audioPlayer) {
                    audioPlayer.src = audioUrl;
                }
                
                const recordedAudio = document.getElementById('editRecordedAudio');
                if (recordedAudio) {
                    recordedAudio.style.display = 'block';
                }
                
                document.getElementById('editPlayRecordingBtn').disabled = false;
                document.getElementById('editSaveRecordingBtn').disabled = false;

                stream.getTracks().forEach(track => track.stop());
            };

            this.editMediaRecorder.start();
            this.isEditRecording = true;

            const visualizer = document.getElementById('editRecordingVisualizer');
            if (visualizer) {
                visualizer.innerHTML = 
                    '<i class="fas fa-circle" style="color: red; animation: blink 1s infinite;"></i> Recording... Speak your reminder message now';
            }
            
            document.getElementById('editStartRecordingBtn').disabled = true;
            document.getElementById('editStopRecordingBtn').disabled = false;

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showNotification('Error accessing microphone. Please check permissions.', 'error');
        }
    }

    stopEditRecording() {
        if (this.editMediaRecorder && this.isEditRecording) {
            this.editMediaRecorder.stop();
            this.isEditRecording = false;

            const visualizer = document.getElementById('editRecordingVisualizer');
            if (visualizer) {
                visualizer.innerHTML = 
                    '<i class="fas fa-check-circle" style="color: green;"></i> Recording complete!';
            }
            
            document.getElementById('editStartRecordingBtn').disabled = false;
            document.getElementById('editStopRecordingBtn').disabled = true;
        }
    }

    playEditRecording() {
        const audioPlayer = document.getElementById('editAudioPlayer');
        if (audioPlayer && audioPlayer.src) {
            audioPlayer.play();
        }
    }

    async saveEditRecording() {
        if (!this.editAudioBlob) {
            this.showNotification('No recording to save. Please record a message first.', 'error');
            return;
        }

        try {
            const user = this.getCurrentUser();
            if (!user) {
                this.showNotification('Please login first', 'error');
                return;
            }

            const alertName = document.getElementById('editAlertName')?.value || `Voice Alert ${new Date().toLocaleString()}`;
            
            const formData = new FormData();
            formData.append('voiceFile', this.editAudioBlob, `${alertName}.wav`);
            formData.append('alertName', alertName);

            const result = await app.apiCall('/api/voice/upload', 'POST', formData, true);
           // const result = await response.json();

            if (result.success) {
                this.showNotification('Voice alert saved successfully!', 'success');
                this.editVoiceAlertId = result.voiceAlert.id;
                this.resetEditRecordingUI();
                document.getElementById('editVoiceAlertType').value = 'record';
            } else {
                this.showNotification(result.message || 'Failed to save voice alert', 'error');
            }

        } catch (error) {
            console.error('Error saving recording:', error);
            this.showNotification('Error saving recording. Please try again.', 'error');
        }
    }

    resetEditRecordingUI() {
        this.editAudioBlob = null;
        this.editAudioChunks = [];
        const visualizer = document.getElementById('editRecordingVisualizer');
        if (visualizer) {
            visualizer.innerHTML = 
                '<i class="fas fa-microphone"></i> Click "Start Recording" to record your voice alert';
        }
        
        const recordedAudio = document.getElementById('editRecordedAudio');
        if (recordedAudio) {
            recordedAudio.style.display = 'none';
        }
        
        document.getElementById('editStartRecordingBtn').disabled = false;
        document.getElementById('editStopRecordingBtn').disabled = true;
        document.getElementById('editPlayRecordingBtn').disabled = true;
        document.getElementById('editSaveRecordingBtn').disabled = true;
    }

    // File preview handlers
    handleMedicinePhotoPreview(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('medicinePhotoPreview');
                if (preview) {
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="Medicine Preview" style="max-width: 200px; max-height: 200px; border-radius: var(--radius); border: 1px solid var(--gray-200);">
                        <p style="margin-top: 8px; color: var(--gray-600); font-size: 12px;">${file.name}</p>
                    `;
                }
            };
            reader.readAsDataURL(file);
        }
    }

    handleEditMedicinePhotoPreview(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('editMedicinePhotoPreview');
                if (preview) {
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="Medicine Preview" style="max-width: 200px; max-height: 200px; border-radius: var(--radius); border: 1px solid var(--gray-200);">
                        <p style="margin-top: 8px; color: var(--gray-600); font-size: 12px;">${file.name}</p>
                    `;
                }
            };
            reader.readAsDataURL(file);
        }
    }

    handleProfilePhotoPreview(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('profilePhotoPreview');
                if (preview) {
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="Profile Preview" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary);">
                        <p style="margin-top: 8px; color: var(--gray-600); font-size: 12px;">${file.name}</p>
                    `;
                }
            };
            reader.readAsDataURL(file);
        }
    }

    handleVoiceFilePreview(file) {
        if (file) {
            const fileName = document.getElementById('alertName');
            if (fileName && !fileName.value) {
                fileName.value = file.name.replace(/\.[^/.]+$/, "");
            }
            this.showNotification(`Voice file selected: ${file.name}`, 'success');
        }
    }

    handleEditVoiceFilePreview(file) {
        if (file) {
            const fileName = document.getElementById('editAlertName');
            if (fileName && !fileName.value) {
                fileName.value = file.name.replace(/\.[^/.]+$/, "");
            }
            this.showNotification(`Voice file selected: ${file.name}`, 'success');
        }
    }

    // Medicine CRUD operations
    async handleAddMedicine() {
        try {
            const formData = new FormData();
            const user = this.getCurrentUser();
            
            if (!user) {
                this.showNotification('Please login first', 'error');
                return;
            }

            // Get frequency and times
            const frequency = document.getElementById('medicineFrequency').value;
            const time1 = document.getElementById('medicineTime1').value;
            const time2 = document.getElementById('medicineTime2').value;
            const time3 = document.getElementById('medicineTime3').value;

            if (!time1) {
                this.showNotification('Please enter at least one time', 'error');
                return;
            }

            // Duration handling
            const durationType = document.getElementById('medicineDurationType')?.value;
            let endDate = null;
            if (durationType === 'week') {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                endDate = d.toISOString().split("T")[0];
            } else if (durationType === 'custom') {
                const customDays = parseInt(document.getElementById('customDays')?.value || 0);
                if (customDays > 0) {
                    const d = new Date();
                    d.setDate(d.getDate() + customDays);
                    endDate = d.toISOString().split("T")[0];
                }
            }
            formData.append('end_date', endDate || '');

            // Add basic medicine data with multiple times
            formData.append('name', document.getElementById('medicineName').value);
            formData.append('dosage', document.getElementById('medicineDosage').value);
            formData.append('frequency', frequency);
            formData.append('medicineTime1', time1);
            formData.append('medicineTime2', time2 || '');
            formData.append('medicineTime3', time3 || '');
            formData.append('stock', document.getElementById('medicineStock').value || '0');
            formData.append('refill_reminder', document.getElementById('medicineRefill').value || '0');
            
            const voiceAlertType = document.getElementById('voiceAlertType').value;
            formData.append('voice_alert_type', voiceAlertType);
            if (voiceAlertType === 'record' && this.voiceAlertId) {
                formData.append('voice_alert_id', this.voiceAlertId);
            }

            // Add medicine photo if exists
            const medicinePhotoInput = document.getElementById('medicinePhotoInput');
            if (medicinePhotoInput && medicinePhotoInput.files[0]) {
                formData.append('medicinePhoto', medicinePhotoInput.files[0]);
            }
            
            // Add voice file if exists
            const voiceFileInput = document.getElementById('voiceFileInput');
            if (voiceFileInput && voiceFileInput.files[0]) {
                formData.append('voiceFile', voiceFileInput.files[0]);
                formData.append('alertName', document.getElementById('alertName').value || `Voice for ${document.getElementById('medicineName').value}`);
            }

            const btn = document.querySelector('#addMedicineForm button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            const result = await app.apiCall('/api/medicines', 'POST', formData, true);
            // const result = await response.json();

            if (result.success) {
                this.showNotification(`Medicine added successfully with ${result.medicineIds?.length || 1} reminder(s)!`, 'success');
                this.resetMedicineForm();
                switchContentSection('dashboard-section');
                if (window.app && window.app.loadMedicines) {
                    window.app.loadMedicines(); // Refresh dashboard immediately
                }
            } else {
                this.showNotification(result.message || 'Failed to add medicine', 'error');
            }

        } catch (error) {
            console.error('Error adding medicine:', error);
            this.showNotification('Error adding medicine. Please try again.', 'error');
        } finally {
            const btn = document.querySelector('#addMedicineForm button[type="submit"]');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-save"></i> Save Medicine';
                btn.disabled = false;
            }
        }
    }

    async loadMedicineForEdit(medicineId) {
        try {
            const user = this.getCurrentUser();
            if (!user) {
                this.showNotification('Please login first', 'error');
                return;
            }

            const result = await app.apiCall(`/api/medicines/${medicineId}`, 'GET');
           // const result = await response.json();

            if (result.success) {
                const medicine = result.medicine;
                this.editingMedicineId = medicineId;

                // Populate edit form
                document.getElementById('editMedicineId').value = medicine.id;
                document.getElementById('editMedicineName').value = medicine.name;
                document.getElementById('editMedicineDosage').value = medicine.dosage;
                document.getElementById('editMedicineTime').value = medicine.time;
                document.getElementById('editMedicineFrequency').value = medicine.frequency;
                document.getElementById('editMedicineStock').value = medicine.stock;
                document.getElementById('editMedicineRefill').value = medicine.refill_reminder;
                document.getElementById('editVoiceAlertType').value = medicine.voice_alert_type;

                // Handle medicine photo preview
                if (medicine.medicine_photo) {
                    document.getElementById('editMedicinePhotoPreview').innerHTML = `
                        <img src="http://localhost:5000/uploads/medicine-photos/${medicine.medicine_photo}" alt="Medicine Preview" style="max-width: 200px; max-height: 200px; border-radius: var(--radius); border: 1px solid var(--gray-200);">
                    `;
                }

                // Show/hide recording sections based on voice alert type
                this.handleVoiceTypeChange('edit');

                // Switch to edit section
                switchContentSection('edit-medicine-section');

            } else {
                this.showNotification(result.message || 'Failed to load medicine', 'error');
            }
        } catch (error) {
            console.error('Error loading medicine for edit:', error);
            this.showNotification('Error loading medicine', 'error');
        }
    }

    async handleUpdateMedicine() {
        try {
            const formData = new FormData();
            const user = this.getCurrentUser();
            
            if (!user) {
                this.showNotification('Please login first', 'error');
                return;
            }

            if (!this.editingMedicineId) {
                this.showNotification('No medicine selected for editing', 'error');
                return;
            }

            // Add basic medicine data
            formData.append('name', document.getElementById('editMedicineName').value);
            formData.append('dosage', document.getElementById('editMedicineDosage').value);
            formData.append('time', document.getElementById('editMedicineTime').value);
            formData.append('frequency', document.getElementById('editMedicineFrequency').value);
            formData.append('stock', document.getElementById('editMedicineStock').value || '0');
            formData.append('refill_reminder', document.getElementById('editMedicineRefill').value || '0');
            
            const voiceAlertType = document.getElementById('editVoiceAlertType').value;
            formData.append('voice_alert_type', voiceAlertType);
            if (voiceAlertType === 'record' && this.editVoiceAlertId) {
                formData.append('voice_alert_id', this.editVoiceAlertId);
            }
            
            // Add medicine photo if exists
            const medicinePhotoInput = document.getElementById('editMedicinePhotoInput');
            if (medicinePhotoInput && medicinePhotoInput.files[0]) {
                formData.append('medicinePhoto', medicinePhotoInput.files[0]);
            }
            
            // Add voice file if exists
            const voiceFileInput = document.getElementById('editVoiceFileInput');
            if (voiceFileInput && voiceFileInput.files[0]) {
                formData.append('voiceFile', voiceFileInput.files[0]);
                formData.append('alertName', document.getElementById('editAlertName').value || `Voice for ${document.getElementById('editMedicineName').value}`);
            }

            const btn = document.querySelector('#editMedicineForm button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            btn.disabled = true;

            const result= await app.apiCall(`/api/medicines/${this.editingMedicineId}`, 'PUT', formData, true);
           

            if (result.success) {
                this.showNotification('Medicine updated successfully!', 'success');
                this.resetEditMedicineForm();
                switchContentSection('dashboard-section');
                if (window.app && window.app.loadMedicines) {
                    window.app.loadMedicines(); // Refresh dashboard immediately
                }
            } else {
                this.showNotification(result.message || 'Failed to update medicine', 'error');
            }

        } catch (error) {
            console.error('Error updating medicine:', error);
            this.showNotification('Error updating medicine. Please try again.', 'error');
        } finally {
            const btn = document.querySelector('#editMedicineForm button[type="submit"]');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-save"></i> Update Medicine';
                btn.disabled = false;
            }
        }
    }

    resetMedicineForm() {
        const form = document.getElementById('addMedicineForm');
        if (form) form.reset();
        
        const preview = document.getElementById('medicinePhotoPreview');
        if (preview) {
            preview.innerHTML = '<i class="fas fa-pills" style="font-size:48px;color:var(--gray-400);"></i>';
        }
        
        const recordingSection = document.getElementById('recordingSection');
        if (recordingSection) recordingSection.style.display = 'none';
        
        const uploadVoiceSection = document.getElementById('uploadVoiceSection');
        if (uploadVoiceSection) uploadVoiceSection.style.display = 'none';
        
        document.getElementById('voiceAlertType').value = 'default';
        
        this.resetRecordingUI();
        this.voiceAlertId = null;
        
        // Reset time inputs based on frequency
        toggleTimeInputs();
        // Reset duration inputs
        this.toggleCustomDaysInput();
    }

    resetEditMedicineForm() {
        const form = document.getElementById('editMedicineForm');
        if (form) form.reset();
        
        const preview = document.getElementById('editMedicinePhotoPreview');
        if (preview) {
            preview.innerHTML = '<i class="fas fa-pills" style="font-size:48px;color:var(--gray-400);"></i>';
        }
        
        const recordingSection = document.getElementById('editRecordingSection');
        if (recordingSection) recordingSection.style.display = 'none';
        
        const uploadVoiceSection = document.getElementById('editUploadVoiceSection');
        if (uploadVoiceSection) uploadVoiceSection.style.display = 'none';
        
        document.getElementById('editVoiceAlertType').value = 'default';
        
        this.resetEditRecordingUI();
        this.editVoiceAlertId = null;
        this.editingMedicineId = null;
    }

    async handleUpdateProfile() {
        try {
            const formData = new FormData();
            const user = this.getCurrentUser();
            
            if (!user) {
                this.showNotification('Please login first', 'error');
                return;
            }

            formData.append('name', document.getElementById('profileName').value);
            formData.append('age', document.getElementById('profileAge').value);
            formData.append('medical_history', document.getElementById('profileMedicalHistory').value);
            formData.append('guardian_name', document.getElementById('profileGuardianName').value);
            formData.append('guardian_contact', document.getElementById('profileGuardianContact').value);
            
            // Add profile photo if exists
            const profilePhotoInput = document.getElementById('profilePhotoInput');
            if (profilePhotoInput && profilePhotoInput.files[0]) {
                formData.append('profilePhoto', profilePhotoInput.files[0]);
            }

            const btn = document.getElementById('saveProfileBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            const result= await app.apiCall('/api/users/profile', 'PUT', formData, true);
            //const result = await response.json();

            if (result.success) {
                this.showNotification('Profile updated successfully!', 'success');
                // Update current user data
                if (window.app) {
                    window.app.setCurrentUser(result.user);
                }
                this.loadProfileData();
            } else {
                this.showNotification(result.message || 'Failed to update profile', 'error');
            }

        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification('Error updating profile: ' + (error.message || 'Please try again'), 'error');
        } finally {
            const btn = document.getElementById('saveProfileBtn');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-save"></i> Update Profile';
                btn.disabled = false;
            }
        }
    }

    loadProfileData() {
        const user = this.getCurrentUser();
        if (user) {
            document.getElementById('profileName').value = user.name || '';
            document.getElementById('profileEmail').value = user.email || '';
            document.getElementById('profileAge').value = user.age || '';
            document.getElementById('profileMedicalHistory').value = user.medical_history || '';
            document.getElementById('profileGuardianName').value = user.guardian_name || '';
            document.getElementById('profileGuardianContact').value = user.guardian_contact || '';
            
            // Load profile photo if exists
            const preview = document.getElementById('profilePhotoPreview');
            if (preview) {
                if (user.profile_photo) {
                    preview.innerHTML = `
                        <img src="http://localhost:5000/uploads/profile-photos/${user.profile_photo}" alt="Profile Photo" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary);">
                    `;
                } else {
                    preview.innerHTML = `
                        <i class="fas fa-user" style="font-size:48px;color:var(--gray-400);"></i>
                    `;
                }
            }
        }
    }

    async exportHistory() {
        try {
            const user = this.getCurrentUser();
            if (!user) {
                this.showNotification('Please login first', 'error');
                return;
            }

            const btn = document.getElementById('exportHistoryBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            btn.disabled = true;

            const response = await fetch('http://localhost:5000/api/export/history', {
                headers: {
                    'user-id': user.id
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `meditrack-history-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showNotification('History exported successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Failed to export history', 'error');
            }
        } catch (error) {
            console.error('Error exporting history:', error);
            this.showNotification('Error exporting history. Please try again.', 'error');
        } finally {
            const btn = document.getElementById('exportHistoryBtn');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-download"></i> Export Logs';
                btn.disabled = false;
            }
        }
    }

    async applyHistoryFilters() {
        try {
            const range = document.getElementById('historyRange').value;
            const status = document.getElementById('historyStatus').value;
            
            const user = this.getCurrentUser();
            if (!user) return;

            let url = `http://localhost:5000/api/history?range=${range}&status=${status}`;
            
            const response = await fetch(url, {
                headers: {
                    'user-id': user.id
                }
            });

            const result = await response.json();

            if (result.success) {
                if (window.app) {
                    window.app.history = result.history;
                    window.app.updateHistoryTable();
                }
                this.showNotification('Filters applied successfully!', 'success');
            }
        } catch (error) {
            console.error('Error applying filters:', error);
            this.showNotification('Error applying filters', 'error');
        }
    }

    getCurrentUser() {
        return window.app ? window.app.currentUser : null;
    }

    showNotification(message, type = 'info') {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            // Fallback notification
            const toast = document.getElementById('notificationToast');
            if (toast) {
                toast.textContent = message;
                toast.className = `toast show ${type}`;
                setTimeout(() => {
                    toast.className = 'toast';
                }, 5000);
            } else {
                alert(`${type.toUpperCase()}: ${message}`);
            }
        }
    }

    // API helper method

}

// Enhanced Main application initialization
class MediTrackApp {
    constructor() {
        this.currentUser = null;
        this.medicines = [];
        this.history = [];
        this.reminderInterval = null;
        this.currentReminderMedicine = null;
        this.reminderLoopInterval = null;
        this.dashboardManager = null;
        this.lowStockShownToday = false;
        
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.startReminderChecker();
        this.dashboardManager = new DashboardManager();
        
        // Initialize frequency system
        this.initializeFrequencySystem();
    }

    initializeFrequencySystem() {
        // Add event listener to frequency dropdown
        const frequencySelect = document.getElementById('medicineFrequency');
        if (frequencySelect) {
            frequencySelect.addEventListener('change', toggleTimeInputs);
        }
        
        // Initialize on page load
        toggleTimeInputs();
    }

    checkAuthentication() {
        const userData = localStorage.getItem('meditrack_user');
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.showDashboard();
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.showLandingPage();
            }
        } else {
            this.showLandingPage();
        }
    }

    setupEventListeners() {
        // Navigation
        const landingLoginBtn = document.getElementById('landingLoginBtn');
        const landingRegisterBtn = document.getElementById('landingRegisterBtn');
        const heroGetStartedBtn = document.getElementById('heroGetStartedBtn');
        
        if (landingLoginBtn) landingLoginBtn.addEventListener('click', () => this.showAuthPage('login'));
        if (landingRegisterBtn) landingRegisterBtn.addEventListener('click', () => this.showAuthPage('register'));
        if (heroGetStartedBtn) heroGetStartedBtn.addEventListener('click', () => this.showAuthPage('register'));
        
        // Auth tabs
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        if (loginTab) loginTab.addEventListener('click', () => this.switchAuthTab('login'));
        if (registerTab) registerTab.addEventListener('click', () => this.switchAuthTab('register'));

        // Menu navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', function() {
                const target = this.getAttribute('data-target');
                switchContentSection(target);
            });
        });

        // Modal buttons
        const markTakenBtn = document.getElementById('markTakenBtn');
        const showCustomRemindBtn = document.getElementById('showCustomRemindBtn');
        const setCustomReminderBtn = document.getElementById('setCustomReminderBtn');
        const snoozeBtn = document.getElementById('snoozeBtn');

        if (markTakenBtn) markTakenBtn.addEventListener('click', () => this.handleMedicineAction('taken'));
        if (showCustomRemindBtn) showCustomRemindBtn.addEventListener('click', () => this.showCustomRemindOptions());
        if (setCustomReminderBtn) setCustomReminderBtn.addEventListener('click', () => this.setCustomReminder());
        if (snoozeBtn) snoozeBtn.addEventListener('click', () => this.snoozeReminder());

        // Close modal when clicking outside
        const reminderModal = document.getElementById('reminderModal');
        if (reminderModal) {
            reminderModal.addEventListener('click', (e) => {
                if (e.target.id === 'reminderModal') {
                    this.hideReminderModal();
                }
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
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
        
        if (this.currentUser) {
            document.getElementById('userName').textContent = this.currentUser.name;
            document.getElementById('userAvatar').textContent = this.currentUser.name.charAt(0).toUpperCase();
        }
        
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
                this.loadHistory()
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
                this.checkLowStockMedicines();
                this.showLowStockBanner();
            }
        } catch (error) {
            console.error('Error loading medicines:', error);
        }
    }

    async loadHistory() {
        try {
            const response = await this.apiCall('/api/history', 'GET');
            if (response.success) {
                this.history = response.history || [];
                this.updateHistoryTable();
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    updateMedicineTable() {
        const tableBody = document.getElementById('medicineTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (this.medicines.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--gray-500);">
                        <i class="fas fa-pills" style="font-size: 3rem; margin-bottom: 16px; display: block;"></i>
                        <h3>No medicines added yet</h3>
                        <p>Add your first medicine to get started with reminders</p>
                        <button class="btn btn-primary" onclick="switchContentSection('add-medicine-section')" style="margin-top: 16px;">
                            <i class="fas fa-plus"></i> Add Your First Medicine
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        this.medicines.slice().reverse().forEach((medicine, index) => {
            const row = document.createElement('tr');
            const statusBadge = this.getStatusBadge(medicine.status);
            const voiceAlert = medicine.voice_alert_type === 'record' ? 'Custom' : 
                              medicine.voice_alert_type === 'upload' ? 'Uploaded' : 'Default';
            
            // Calculate days left until expiry
            const daysLeft = medicine.end_date
                ? Math.ceil((new Date(medicine.end_date) - new Date()) / (1000 * 60 * 60 * 24))
                : null;

            let expiryText = 'Lifetime';
            if (daysLeft !== null) {
                if (daysLeft <= 0) expiryText = '<span style="color: red;">Expired</span>';
                else if (daysLeft <= 3) expiryText = `<span style="color: orange;">${daysLeft} day(s) left</span>`;
                else expiryText = `<span style="color: green;">${daysLeft} day(s) left</span>`;
            }

            row.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${medicine.medicine_photo ? 
                            `<img src="http://localhost:5000/uploads/medicine-photos/${medicine.medicine_photo}" 
                                  alt="${medicine.name}" 
                                  style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">` :
                            `<div style="width: 40px; height: 40px; background: var(--gray-200); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-pills" style="color: var(--gray-500);"></i>
                            </div>`
                        }
                        <div>
                            <div style="font-weight: 600;">${medicine.name}</div>
                            ${medicine.stock > 0 ? `<div style="font-size: 12px; color: var(--gray-500);">Stock: ${medicine.stock}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>${medicine.dosage}</td>
                <td>
                    <div style="font-weight: 600;">${medicine.time}</div>
                    <div style="font-size: 12px; color: var(--gray-500); text-transform: capitalize;">${medicine.frequency}</div>
                </td>
                <td>${expiryText}</td>
                <td>
                    <span class="status-badge ${voiceAlert === 'Custom' ? 'status-taken' : voiceAlert === 'Uploaded' ? 'status-pending' : 'status-missed'}">
                        ${voiceAlert}
                    </span>
                </td>
                <td>${statusBadge}</td>
                <td class="action-buttons">
                    <button class="btn btn-success btn-sm" onclick="app.markMedicineAsTaken('${medicine.id}')" ${medicine.status === 'taken' ? 'disabled' : ''}>
                        <i class="fas fa-check"></i> ${medicine.status === 'taken' ? 'Taken' : 'Mark Taken'}
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="app.editMedicine('${medicine.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="app.deleteMedicine('${medicine.id}')">
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

        // Show due medicines alert
        this.updateDueMedicinesAlert();
    }

    updateDueMedicinesAlert() {
        const dueMedicinesAlert = document.getElementById('dueMedicinesAlert');
        const dueMedicinesList = document.getElementById('dueMedicinesList');
        
        const dueMedicines = this.medicines.filter(medicine => {
            if (medicine.status !== 'pending') return false;
            
            const now = new Date();
            const medicineTime = new Date();
            const [hours, minutes] = medicine.time.split(':');
            medicineTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // Consider medicine due if it's within the next 30 minutes or overdue
            const timeDiff = medicineTime.getTime() - now.getTime();
            return timeDiff <= 30 * 60 * 1000 && timeDiff > -5 * 60 * 1000; // Due in next 30 mins or up to 5 mins overdue
        });

        if (dueMedicines.length > 0) {
            dueMedicinesList.innerHTML = dueMedicines.map(medicine => `
                <div style="display: flex; justify-content: between; align-items: center; padding: 12px; background: var(--gray-50); border-radius: 6px; margin-bottom: 8px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${medicine.name}</div>
                        <div style="font-size: 14px; color: var(--gray-600);">${medicine.dosage} at ${medicine.time}</div>
                    </div>
                    <button class="btn btn-success btn-sm" onclick="app.markMedicineAsTaken('${medicine.id}')">
                        <i class="fas fa-check"></i> Taken
                    </button>
                </div>
            `).join('');
            dueMedicinesAlert.style.display = 'block';
        } else {
            dueMedicinesAlert.style.display = 'none';
        }
    }

    updateHistoryTable() {
        const tableBody = document.getElementById('historyTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (this.history.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--gray-500);">
                        <i class="fas fa-history" style="font-size: 3rem; margin-bottom: 16px; display: block;"></i>
                        <h3>No history yet</h3>
                        <p>Your medication history will appear here</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.history.forEach(record => {
            const row = document.createElement('tr');
            
            // Proper date formatting for history
            const date = new Date(record.created_at);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            const scheduledTime = record.scheduled_time;
            const actualTime = record.actual_time && record.actual_time !== 'null' ? record.actual_time : '-';
            const statusBadge = this.getStatusBadge(record.status);

            row.innerHTML = `
                <td>${formattedDate}</td>
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

    getStatusBadge(status) {
        const badges = {
            'taken': '<span class="status-badge status-taken"><i class="fas fa-check-circle"></i> Taken</span>',
            'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>',
            'missed': '<span class="status-badge status-missed"><i class="fas fa-times-circle"></i> Missed</span>',
            'rescheduled': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Rescheduled</span>'
        };
        return badges[status] || badges.pending;
    }

    // Enhanced Reminder System
    startReminderChecker() {
        this.reminderInterval = setInterval(() => {
            this.checkDueMedicines();
        }, 30000); // Check every 30 seconds

        // Also check immediately
        this.checkDueMedicines();
    }

    async checkDueMedicines() {
        if (!this.currentUser) return;

        try {
            const response = await this.apiCall('/api/reminders', 'GET');
            if (response.success && response.reminders.length > 0) {
                const activeReminder = response.reminders[0];
                if (!this.isReminderActive() || this.currentReminderMedicine?.id !== activeReminder.id) {
                    this.showReminderModal(activeReminder);
                    
                    // Check for low stock and show alert
                    if (activeReminder.stock <= activeReminder.refill_reminder && activeReminder.refill_reminder > 0) {
                        this.showLowStockAlert(activeReminder);
                    }
                }
            }
            
            // Also check for any low stock medicines
            await this.checkLowStockMedicines();
            
        } catch (error) {
            console.error('Error checking reminders:', error);
        }
    }

    // Enhanced continuous reminder popup (custom voice + photo)
    showReminderModal(medicine) {
        const modal = document.getElementById('reminderModal');
        const content = document.getElementById('reminderContent');
        const customRemindSection = document.getElementById('customRemindLater');
        customRemindSection.style.display = 'none';

        const imgSrc = medicine.medicine_photo
            ? `http://localhost:5000/uploads/medicine-photos/${medicine.medicine_photo}`
            : "images/default-pill.png";

        content.innerHTML = `
            <div style="text-align: center; padding: 20px 0;">
                <img src="${imgSrc}" alt="${medicine.name}" 
                    style="width:100px;height:100px;border-radius:12px;margin-bottom:10px;">
                <h3 style="margin-bottom: 8px; color: var(--gray-900);">Time to take your medicine!</h3>
                <p style="font-size: 1.2rem; color: var(--gray-700); margin-bottom: 8px;">
                    <strong>${medicine.name}</strong> - ${medicine.dosage}
                </p>
                <p style="color: var(--gray-600);">Scheduled for: ${medicine.time}</p>
                <p style="color: var(--gray-500); font-size: 0.9rem; margin-top: 10px;">
                    <i class="fas fa-info-circle"></i> Voice reminder will keep playing until you respond
                </p>
            </div>
        `;

        modal.classList.add('active');
        this.currentReminderMedicine = medicine;
        document.body.style.overflow = 'hidden';

        // Play continuous voice
        this.startVoiceLoop(medicine);

        // Button events
        document.getElementById('markTakenBtn').onclick = async () => {
            await this.markMedicineAsTaken(medicine.id);
            this.hideReminderModal();
        };

        document.getElementById('showCustomRemindBtn').onclick = () => {
            this.showCustomRemindOptions();
        };

        document.getElementById('snoozeBtn').onclick = () => {
            this.snoozeReminder();
        };
    }

    // Close modal + stop voice
    hideReminderModal() {
        const modal = document.getElementById('reminderModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        this.stopVoiceLoop();

        if (this.currentReminderMedicine) {
            this.apiCall(`/api/reminders/${this.currentReminderMedicine.id}`, 'DELETE')
                .catch(err => console.error('Error clearing reminder:', err));
        }

        this.currentReminderMedicine = null;
    }

 startVoiceLoop(medicine) {
    this.stopVoiceLoop(); // clear old loop first
    this.playVoiceAlert(medicine);

    // Repeat when audio ends
    if (this.currentAudio) {
        this.currentAudio.onended = () => {
            if (this.isReminderActive() && this.currentReminderMedicine?.id === medicine.id) {
                this.playVoiceAlert(medicine);
            }
        };
    }
}


    stopVoiceLoop() {
        if (this.reminderLoopInterval) {
            clearInterval(this.reminderLoopInterval);
            this.reminderLoopInterval = null;
        }
        
        // Stop any ongoing speech
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
    }

    playVoiceAlert(medicine) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(
                `Reminder: Time to take your ${medicine.name}, dosage: ${medicine.dosage}. Please take your medicine now.`
            );
            
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            speechSynthesis.speak(utterance);
        }
    }

    async checkLowStockMedicines() {
        try {
            const lowStockMedicines = this.medicines.filter(med => 
                med.stock <= med.refill_reminder && med.refill_reminder > 0 && med.stock > 0
            );
            
            if (lowStockMedicines.length > 0 && !this.lowStockShownToday) {
                this.showLowStockNotification(lowStockMedicines);
                this.lowStockShownToday = true;
                
                // Reset daily flag at midnight
                this.resetDailyAlerts();
            }
        } catch (error) {
            console.error('Error checking low stock:', error);
        }
    }

    // Show dismissible banner for low stock medicines
    async showLowStockBanner() {
        try {
            const response = await this.apiCall('/api/low-stock', 'GET');
            if (!response.success || response.medicines.length === 0) return;

            // Remove existing banner
            const oldBanner = document.getElementById('lowStockBanner');
            if (oldBanner) oldBanner.remove();

            const container = document.createElement('div');
            container.id = 'lowStockBanner';
            container.style.cssText = `
                background: #fff8e1;
                border: 1px solid #ffecb3;
                border-radius: 10px;
                padding: 12px 16px;
                margin: 10px auto;
                width: 90%;
                max-width: 900px;
                color: #8d6e00;
                font-size: 15px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            const medsList = response.medicines.map(m => `<strong>${m.name}</strong> (${m.stock} left)`).join(', ');
            container.innerHTML = `
                <div>
                    <i class="fas fa-exclamation-triangle" style="margin-right:8px;color:#f39c12;"></i>
                    <strong>Low Stock:</strong> ${medsList}
                </div>
                <button id="dismissLowStockBtn" style="
                    background: transparent;
                    border: none;
                    color: #8d6e00;
                    font-weight: bold;
                    cursor: pointer;
                ">Dismiss</button>
            `;

            const dashboardSection = document.getElementById('dashboard-section');
            const titleElement = dashboardSection.querySelector('.section-title');

            if (titleElement) {
                titleElement.insertAdjacentElement('afterend', container);
            } else {
                dashboardSection.prepend(container);
            }

            document.getElementById('dismissLowStockBtn').addEventListener('click', () => {
                container.remove();
                localStorage.setItem('lowStockDismissedToday', new Date().toDateString());
            });

        } catch (err) {
            console.error('Error showing low stock banner:', err);
        }
    }

    // Show list of low stock medicines
    async showLowStockList() {
        const response = await this.apiCall('/api/low-stock', 'GET');
        if (!response.success || response.medicines.length === 0) {
            return this.showNotification('No low stock medicines found.', 'info');
        }

        let html = `<h3>Low Stock Medicines</h3><ul style="margin-top:10px;">`;
        response.medicines.forEach(m => {
            html += `<li><strong>${m.name}</strong> - ${m.stock} left</li>`;
        });
        html += `</ul>`;
        this.showPopupModal(html);
    }

    // Show list of missed medicines
    async showMissedList() {
        const response = await this.apiCall('/api/missed', 'GET');
        if (!response.success || response.medicines.length === 0) {
            return this.showNotification('No missed medicines in last 12 hrs.', 'info');
        }

        let html = `<h3>Missed Medicines (12+ hrs late)</h3><ul style="margin-top:10px;">`;
        response.medicines.forEach(m => {
            html += `<li><strong>${m.name}</strong> - Scheduled at ${m.time}</li>`;
        });
        html += `</ul>`;
        this.showPopupModal(html);
    }

    // Show list of taken medicines
    async showTakenList() {
        const taken = this.medicines.filter(m => m.status === 'taken');
        if (taken.length === 0) {
            return this.showNotification('No medicines taken yet today.', 'info');
        }

        let html = `<h3>Medicines Taken Today</h3><ul style="margin-top:10px;">`;
        taken.forEach(m => {
            html += `<li><strong>${m.name}</strong> - ${m.dosage} at ${m.time}</li>`;
        });
        html += `</ul>`;
        this.showPopupModal(html);
    }

    // Show list of pending medicines
    async showPendingList() {
        const pending = this.medicines.filter(m => m.status === 'pending');
        if (pending.length === 0) {
            return this.showNotification('No pending medicines at the moment.', 'info');
        }

        let html = `<h3>Pending Medicines</h3><ul style="margin-top:10px;">`;
        pending.forEach(m => {
            html += `<li><strong>${m.name}</strong> - ${m.dosage} at ${m.time}</li>`;
        });
        html += `</ul>`;
        this.showPopupModal(html);
    }

    // Reusable popup modal
    showPopupModal(content) {
        const modal = document.createElement('div');
        modal.className = 'popup-overlay';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.4);
            display: flex; justify-content: center; align-items: center;
            z-index: 9999;
        `;
        modal.innerHTML = `
            <div style="background: white; padding: 20px 25px; border-radius: 10px; max-width: 400px; text-align: center;">
                ${content}
                <br>
                <button id="closePopupBtn" style="margin-top:15px;padding:8px 16px;border:none;background:#007bff;color:white;border-radius:6px;cursor:pointer;">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('closePopupBtn').onclick = () => modal.remove();
    }

    resetDailyAlerts() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const timeUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            this.lowStockShownToday = false;
            this.resetDailyAlerts(); // Schedule next reset
        }, timeUntilMidnight);
    }

    showLowStockAlert(medicine) {
        const alertHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 10px 0;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <i class="fas fa-exclamation-triangle" style="color: #f39c12;"></i>
                    <strong style="color: #856404;">Low Stock Alert</strong>
                </div>
                <p style="margin: 0; color: #856404;">
                    <strong>${medicine.name}</strong> is running low! Only <strong>${medicine.stock}</strong> doses remaining.
                </p>
            </div>
        `;
        
        // Add to reminder modal
        const reminderContent = document.getElementById('reminderContent');
        if (reminderContent) {
            reminderContent.insertAdjacentHTML('beforeend', alertHTML);
        }
    }

    showLowStockNotification(medicines) {
        console.log('🟡 Low stock banner already handles notification.');
    }

    isReminderActive() {
        return document.getElementById('reminderModal').classList.contains('active');
    }

    async handleMedicineAction(action) {
        if (!this.currentReminderMedicine) return;

        try {
            if (action === 'taken') {
                await this.markMedicineAsTaken(this.currentReminderMedicine.id);
            }

            this.hideReminderModal();
            this.showNotification('Medicine updated successfully!', 'success');
        } catch (error) {
            console.error('Error handling medicine action:', error);
            this.showNotification('Error updating medicine', 'error');
        }
    }

    showCustomRemindOptions() {
        const customRemindSection = document.getElementById('customRemindLater');
        customRemindSection.style.display = 'block';
    }

    async setCustomReminder() {
        const minutesInput = document.getElementById('customMinutes');
        const minutes = parseInt(minutesInput.value);
        
        if (!minutes || minutes < 1 || minutes > 1440) {
            this.showNotification('Please enter a valid number of minutes (1-1440)', 'error');
            return;
        }

        await this.rescheduleReminder(minutes);
    }

    async rescheduleReminder(minutes) {
        if (!this.currentReminderMedicine) return;

        try {
            await this.apiCall(`/api/medicines/${this.currentReminderMedicine.id}/reschedule`, 'POST', {
                remindInMinutes: minutes
            });

            this.hideReminderModal();
            this.showNotification(`Reminder set for ${minutes} minutes from now`, 'success');
            await this.loadMedicines(); // Refresh dashboard
            await this.loadHistory();   // Sync history table
            
        } catch (error) {
            console.error('Error rescheduling:', error);
            this.showNotification('Error rescheduling reminder', 'error');
        }
    }

    snoozeReminder() {
        this.rescheduleReminder(5);
    }

    // API Methods
 async apiCall(endpoint, method = 'GET', data = null, isFormData = false) {
    const url = `http://localhost:5000${endpoint}`;
    const user = JSON.parse(localStorage.getItem('meditrack_user'));
    const headers = { 'User-ID': user?.id || '' };

    // Only add Content-Type for JSON
    if (!isFormData && method !== 'GET') {
        headers['Content-Type'] = 'application/json';
    }

    const options = { method, headers, mode: 'cors' };
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = isFormData ? data : JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const text = await response.text(); // read raw response

        let result;
        try {
            result = JSON.parse(text);
        } catch {
            // Non-JSON backend reply (happens sometimes with form uploads)
            console.warn('⚠️ Non-JSON response received:', text);
            result = { success: true, message: 'Request processed successfully (non-JSON)' };
        }

        // Treat any 2xx as success, not only 200
        if (response.status >= 200 && response.status < 300) {
            return result;
        } else {
            return {
                success: false,
                message: result?.message || `HTTP ${response.status} ${response.statusText}`
            };
        }
    } catch (err) {
        console.error('❌ API CALL ERROR:', err);
        return { success: false, message: err.message || 'Network error' };
    }
}


    // Enhanced Notification System
    showNotification(message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        if (!toast) {
            // Create toast if it doesn't exist
            const toastElement = document.createElement('div');
            toastElement.id = 'notificationToast';
            toastElement.className = `toast show ${type}`;
            toastElement.textContent = message;
            document.body.appendChild(toastElement);
            
            setTimeout(() => {
                toastElement.remove();
            }, 5000);
            return;
        }

        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            toast.className = 'toast';
        }, 5000);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    setCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('meditrack_user', JSON.stringify(user));
    }

    logout() {
        localStorage.removeItem('meditrack_user');
        this.currentUser = null;
        this.medicines = [];
        this.history = [];

        // Clear all intervals
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
            this.reminderInterval = null;
        }
        
        if (this.reminderLoopInterval) {
            clearInterval(this.reminderLoopInterval);
            this.reminderLoopInterval = null;
        }

        this.showLandingPage();
        this.showNotification('Logged out successfully!', 'success');
    }
}

// Global app instance
const app = new MediTrackApp();

// Utility functions for global access
// Section Switcher (final working version)
function switchContentSection(sectionId) {
    console.log("Switching to:", sectionId);

    // Find all content sections (inside .main-content)
    const sections = document.querySelectorAll('.main-content .content-section');
    sections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none'; // ensure it's hidden
    });

    // Activate the correct section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block'; // ensure it's visible
    }

    // Update active sidebar highlight
    const menuItems = document.querySelectorAll('.sidebar .menu-item');
    menuItems.forEach(item => {
        const target = item.getAttribute('data-target');
        item.classList.toggle('active', target === sectionId);
    });

    // Optional: reload data if necessary
    if (sectionId === 'dashboard-section') {
        app.loadMedicines();
    } else if (sectionId === 'history-section') {
        app.loadHistory();
    } else if (sectionId === 'profile-section') {
        app.dashboardManager.loadProfileData();
    }
}

// Frequency time inputs handler - FIXED
function toggleTimeInputs() {
    const frequency = document.getElementById('medicineFrequency')?.value;
    const time2Group = document.getElementById('time2Group');
    const time3Group = document.getElementById('time3Group');
    
    if (!frequency || !time2Group || !time3Group) return;
    
    // Hide all optional time inputs first
    time2Group.style.display = 'none';
    time3Group.style.display = 'none';
    
    // Show based on frequency
    if (frequency === 'twice' || frequency === 'thrice') {
        time2Group.style.display = 'block';
    }
    if (frequency === 'thrice') {
        time3Group.style.display = 'block';
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

// Make methods globally available
window.app = app;
window.switchContentSection = switchContentSection;
window.toggleTimeInputs = toggleTimeInputs;

// Unified upload click bindings — prevents multiple popups
(function setupUploadTriggers() {
    const uploadMappings = [
        ['medicinePhotoUploadArea', 'medicinePhotoInput'],
        ['editMedicinePhotoUploadArea', 'editMedicinePhotoInput'],
        ['voiceFileUploadArea', 'voiceFileInput'],
        ['editVoiceFileUploadArea', 'editVoiceFileInput'],
        ['profilePhotoUploadBtn', 'profilePhotoInput']
    ];

    uploadMappings.forEach(([triggerId, inputId]) => {
        const trigger = document.getElementById(triggerId);
        const input = document.getElementById(inputId);
        if (trigger && input) {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // prevent bubbling to body listeners
                input.click();
            });
        }
    });
})();

// Medicine actions
app.markMedicineAsTaken = async function(medicineId) {
    try {
        // Disable button immediately to prevent multiple clicks
        const row = document.querySelector(`button[onclick*="${medicineId}"]`)?.closest('tr');
        if (row) {
            const takenBtn = row.querySelector('.btn-success');
            if (takenBtn) {
                takenBtn.disabled = true;
                takenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }
        }

        const notes = prompt('Add any notes (optional):') || '';
        
        const response = await app.apiCall(`/api/medicines/${medicineId}/taken`, 'POST', {
            notes
        });

        if (response.success) {
            app.showNotification('Medicine marked as taken! Stock updated.', 'success');
            await app.loadMedicines();
            await app.loadHistory();
        } else {
            app.showNotification(response.message, 'error');
        }

    } catch (error) {
        console.error('Error marking medicine as taken:', error);
        app.showNotification('Failed to update medicine', 'error');
    } finally {
        // Re-enable buttons after processing
        setTimeout(async () => {
            await app.loadMedicines();
            await app.loadHistory();
        }, 1000);
    }
};

app.editMedicine = async function(medicineId) {
    app.dashboardManager.loadMedicineForEdit(medicineId);
};

app.deleteMedicine = async function(medicineId) {
    if (!confirm('Are you sure you want to delete this medicine? This action cannot be undone.')) {
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
};

// // Click handlers for summary cards
// app.showTakenList = () => app.showTakenList();
// app.showPendingList = () => app.showPendingList();
// app.showMissedList = () => app.showMissedList();
// app.showLowStockList = () => app.showLowStockList();
// Medicine actions
app.markMedicineAsTaken = async function(medicineId) {
    try {
        // Disable button immediately to prevent multiple clicks
        const row = document.querySelector(`button[onclick*="${medicineId}"]`)?.closest('tr');
        if (row) {
            const takenBtn = row.querySelector('.btn-success');
            if (takenBtn) {
                takenBtn.disabled = true;
                takenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }
        }

        const notes = prompt('Add any notes (optional):') || '';
        
        const response = await app.apiCall(`/api/medicines/${medicineId}/taken`, 'POST', {
            notes
        });

        if (response.success) {
            app.showNotification('Medicine marked as taken! Stock updated.', 'success');
            await app.loadMedicines();
            await app.loadHistory();
        } else {
            app.showNotification(response.message, 'error');
        }

    } catch (error) {
        console.error('Error marking medicine as taken:', error);
        app.showNotification('Failed to update medicine', 'error');
    } finally {
        // Re-enable buttons after processing
        setTimeout(async () => {
            await app.loadMedicines();
            await app.loadHistory();
        }, 1000);
    }
};

app.editMedicine = async function(medicineId) {
    app.dashboardManager.loadMedicineForEdit(medicineId);
};

app.deleteMedicine = async function(medicineId) {
    if (!confirm('Are you sure you want to delete this medicine? This action cannot be undone.')) {
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
};

// FIXED: Proper click handlers for summary cards - remove circular references
// These functions are already defined in the MediTrackApp class, so we don't need to reassign them
// The onclick handlers in HTML will call the existing methods directly