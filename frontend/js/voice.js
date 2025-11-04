// Voice recording functionality
class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.audioBlob = null;
        
        this.setupRecordingEventListeners();
    }

    setupRecordingEventListeners() {
        document.getElementById('startRecordingBtn').addEventListener('click', () => {
            this.startRecording();
        });

        document.getElementById('stopRecordingBtn').addEventListener('click', () => {
            this.stopRecording();
        });

        document.getElementById('playRecordingBtn').addEventListener('click', () => {
            this.playRecording();
        });

        document.getElementById('saveRecordingBtn').addEventListener('click', () => {
            this.saveRecording();
        });
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(this.audioBlob);
                document.getElementById('audioPlayer').src = audioUrl;
                document.getElementById('recordedAudio').style.display = 'block';
                document.getElementById('playRecordingBtn').disabled = false;
                document.getElementById('saveRecordingBtn').disabled = false;

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            // Update UI
            document.getElementById('recordingVisualizer').innerHTML = 
                '<i class="fas fa-circle" style="color: red; animation: pulse 1s infinite;"></i> Recording... Speak now';
            document.getElementById('startRecordingBtn').disabled = true;
            document.getElementById('stopRecordingBtn').disabled = false;

            // Add pulse animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            app.showNotification('Error accessing microphone. Please check permissions.', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;

            // Update UI
            document.getElementById('recordingVisualizer').innerHTML = 
                '<i class="fas fa-check-circle" style="color: green;"></i> Recording complete';
            document.getElementById('startRecordingBtn').disabled = false;
            document.getElementById('stopRecordingBtn').disabled = true;
        }
    }

    playRecording() {
        const audioPlayer = document.getElementById('audioPlayer');
        if (audioPlayer.src) {
            audioPlayer.play();
        }
    }

    async saveRecording() {
        if (!this.audioBlob) {
            app.showNotification('No recording to save', 'error');
            return;
        }

        try {
            const btn = document.getElementById('saveRecordingBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            // Convert blob to file
            const file = new File([this.audioBlob], `recording-${Date.now()}.wav`, {
                type: 'audio/wav'
            });

            const formData = new FormData();
            formData.append('voiceFile', file);

            const response = await fetch('http://localhost:5000/api/voice/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${app.token}`
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                app.showNotification('Recording saved successfully!', 'success');
                
                // Reset recording UI
                this.resetRecordingUI();
                
                // Reload voice alerts
                await app.loadVoiceAlerts();

            } else {
                throw new Error(data.message);
            }

        } catch (error) {
            console.error('Error saving recording:', error);
            app.showNotification('Failed to save recording', 'error');
        } finally {
            const btn = document.getElementById('saveRecordingBtn');
            btn.innerHTML = '<i class="fas fa-save"></i> Save Recording';
            btn.disabled = false;
        }
    }

    resetRecordingUI() {
        this.audioBlob = null;
        document.getElementById('audioPlayer').src = '';
        document.getElementById('recordedAudio').style.display = 'none';
        document.getElementById('playRecordingBtn').disabled = true;
        document.getElementById('saveRecordingBtn').disabled = true;
        document.getElementById('recordingVisualizer').innerHTML = 
            '<i class="fas fa-microphone"></i> Click record to start recording your voice';
    }
}

// Initialize voice recorder
const voiceRecorder = new VoiceRecorder();