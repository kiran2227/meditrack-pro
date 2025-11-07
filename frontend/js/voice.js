// frontend/js/voice.js – FINAL VERSION (by assistant)
// ✅ Continuous playback (no gap)
// ✅ Plays uploaded or recorded voice infinitely until dismissed
// ✅ Falls back to text-to-speech when no audio file exists
// ✅ Works with both Add and Edit medicine flows
// ✅ Clean error handling and UI updates

class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.recordingStream = null;
        this.isRecording = false;

        this.setupRecordingEventListeners();
    }

    setupRecordingEventListeners() {
        // Add medicine recording
        document.getElementById('startRecordingBtn')?.addEventListener('click', () => this.startRecording('add'));
        document.getElementById('stopRecordingBtn')?.addEventListener('click', () => this.stopRecording('add'));
        document.getElementById('playRecordingBtn')?.addEventListener('click', () => this.playRecording('add'));
        document.getElementById('saveRecordingBtn')?.addEventListener('click', () => this.saveRecording('add'));

        // Edit medicine recording
        document.getElementById('editStartRecordingBtn')?.addEventListener('click', () => this.startRecording('edit'));
        document.getElementById('editStopRecordingBtn')?.addEventListener('click', () => this.stopRecording('edit'));
        document.getElementById('editPlayRecordingBtn')?.addEventListener('click', () => this.playRecording('edit'));
        document.getElementById('editSaveRecordingBtn')?.addEventListener('click', () => this.saveRecording('edit'));
    }

    async startRecording(type = 'add') {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showNotification('Your browser does not support recording.', 'error');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(this.audioBlob);
                const audioPlayer = document.getElementById(type === 'edit' ? 'editAudioPlayer' : 'audioPlayer');
                if (audioPlayer) audioPlayer.src = audioUrl;

                const recordedAudio = document.getElementById(type === 'edit' ? 'editRecordedAudio' : 'recordedAudio');
                if (recordedAudio) recordedAudio.style.display = 'block';

                stream.getTracks().forEach(track => track.stop());
                this.updateRecordingButtons(type, false, true, true);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateRecordingButtons(type, true, false, false);

            const visualizer = document.getElementById(type === 'edit' ? 'editRecordingVisualizer' : 'recordingVisualizer');
            if (visualizer) {
                visualizer.innerHTML = '<div style="color:red;"><i class="fas fa-circle"></i> Recording... Speak clearly</div>';
            }

        } catch (error) {
            console.error('Error starting recording:', error);
            this.showNotification('Failed to access microphone.', 'error');
        }
    }

    stopRecording(type = 'add') {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            const visualizer = document.getElementById(type === 'edit' ? 'editRecordingVisualizer' : 'recordingVisualizer');
            if (visualizer) {
                visualizer.innerHTML = '<div style="color:green;"><i class="fas fa-check-circle"></i> Recording complete</div>';
            }
        }
    }

    playRecording(type = 'add') {
        const audioPlayer = document.getElementById(type === 'edit' ? 'editAudioPlayer' : 'audioPlayer');
        if (audioPlayer && audioPlayer.src) {
            audioPlayer.play().catch(err => {
                console.error('Audio playback error:', err);
                this.showNotification('Error playing recording.', 'error');
            });
        }
    }

    async saveRecording(type = 'add') {
        if (!this.audioBlob) {
            this.showNotification('No recording to save.', 'error');
            return;
        }

        const userId = window.app?.currentUser?.id;
        if (!userId) {
            this.showNotification('Please log in first.', 'error');
            return;
        }

        try {
            const file = new File([this.audioBlob], `voice-alert-${Date.now()}.webm`, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('voiceFile', file);
            formData.append('alertName', `Voice for ${type === 'edit' ? document.getElementById('editMedicineName')?.value : document.getElementById('medicineName')?.value}`);

            const saveBtn = document.getElementById(type === 'edit' ? 'editSaveRecordingBtn' : 'saveRecordingBtn');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                saveBtn.disabled = true;
            }

            const response = await fetch('http://localhost:5000/api/voice/upload', {
                method: 'POST',
                headers: { 'User-ID': userId },
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                this.showNotification('Voice alert saved successfully!', 'success');
                if (type === 'add') {
                    window.app.dashboardManager.voiceAlertId = data.voiceAlert.id;
                } else {
                    window.app.dashboardManager.editVoiceAlertId = data.voiceAlert.id;
                }
            } else {
                throw new Error(data.message || 'Upload failed');
            }
        } catch (err) {
            console.error('Error saving recording:', err);
            this.showNotification('Failed to save recording.', 'error');
        } finally {
            const saveBtn = document.getElementById(type === 'edit' ? 'editSaveRecordingBtn' : 'saveRecordingBtn');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Recording';
                saveBtn.disabled = false;
            }
        }
    }

    updateRecordingButtons(type, recording = false, stopped = false, saved = false) {
        const prefix = type === 'edit' ? 'edit' : '';
        const start = document.getElementById(`${prefix}StartRecordingBtn`);
        const stop = document.getElementById(`${prefix}StopRecordingBtn`);
        const play = document.getElementById(`${prefix}PlayRecordingBtn`);
        const save = document.getElementById(`${prefix}SaveRecordingBtn`);
        if (start) start.disabled = recording;
        if (stop) stop.disabled = !recording;
        if (play) play.disabled = !stopped;
        if (save) save.disabled = !saved;
    }

    showNotification(message, type = 'info') {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// 🔊 Continuous Voice Loop Logic (used by app.js)
window.playContinuousVoice = async function (medicine) {
    try {
        // Try to find uploaded or recorded voice
        let voiceUrl = null;
        if (medicine.voice_alert_id) {
            const res = await fetch('http://localhost:5000/api/voice', {
                headers: { 'User-ID': window.app?.currentUser?.id || '' }
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.voiceAlerts)) {
                const v = data.voiceAlerts.find(x => x.id === medicine.voice_alert_id);
                if (v && v.file_name)
                    voiceUrl = `http://localhost:5000/uploads/voice-alerts/${v.file_name}`;
            }
        }

        if (voiceUrl) {
            const audio = new Audio(voiceUrl);
            audio.loop = true;
            audio.volume = 1.0;
            await audio.play().catch(err => console.warn('Autoplay prevented:', err));
            window.activeVoiceAudio = audio;
            console.log('🎧 Playing uploaded/recorded voice in loop');
        } else {
            // fallback to TTS loop
            console.log('🗣️ No uploaded voice found — using TTS fallback');
            window.activeVoiceAudio = null;
            window.ttsActive = true;
            while (window.ttsActive && window.app.isReminderActive() && window.app.currentReminderMedicine?.id === medicine.id) {
                const msg = new SpeechSynthesisUtterance(`Reminder: time to take your ${medicine.name}, dosage ${medicine.dosage}`);
                msg.rate = 0.95;
                msg.pitch = 1;
                msg.volume = 1;
                speechSynthesis.cancel();
                speechSynthesis.speak(msg);
                await new Promise(r => setTimeout(r, 3000)); // small gap
            }
        }
    } catch (error) {
        console.error('Voice loop error:', error);
    }
};

window.stopContinuousVoice = function () {
    if (window.activeVoiceAudio) {
        try {
            window.activeVoiceAudio.pause();
            window.activeVoiceAudio.currentTime = 0;
        } catch (e) {}
        window.activeVoiceAudio = null;
    }
    if (window.ttsActive) {
        window.ttsActive = false;
        try { speechSynthesis.cancel(); } catch (e) {}
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.voiceRecorder = new VoiceRecorder();
    console.log('🎤 VoiceRecorder initialized (final version)');
});
