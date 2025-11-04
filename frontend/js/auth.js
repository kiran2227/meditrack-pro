// Authentication functionality
class AuthManager {
    constructor() {
        this.setupAuthEventListeners();
    }

    setupAuthEventListeners() {
        // Login form
        document.getElementById('loginBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form
        document.getElementById('registerBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Enter key support
        document.getElementById('loginPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });

        document.getElementById('confirmPassword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleRegister();
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            app.logout();
        });
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Basic validation
        if (!email || !password) {
            this.showAuthError('Please fill in all fields');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showAuthError('Please enter a valid email address');
            return;
        }

        const btn = document.getElementById('loginBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            btn.disabled = true;

            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // Store token and user data
                localStorage.setItem('meditrack_token', data.token);
                localStorage.setItem('meditrack_user', JSON.stringify(data.user));
                
                // Update app state
                app.token = data.token;
                app.currentUser = data.user;
                
                // Show dashboard
                app.showDashboard();
            } else {
                this.showAuthError(data.message || 'Login failed');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showAuthError('Connection failed. Please check if the server is running.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const age = document.getElementById('registerAge').value;
        const medicalHistory = document.getElementById('registerMedicalHistory').value;
        const guardianName = document.getElementById('registerGuardianName').value;
        const guardianContact = document.getElementById('registerGuardianContact').value;

        // Validation
        if (!name || !email || !password) {
            this.showAuthError('Please fill in all required fields');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showAuthError('Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            this.showAuthError('Password must be at least 6 characters long');
            return;
        }

        const btn = document.getElementById('registerBtn');
        const originalText = btn.innerHTML;

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            btn.disabled = true;

            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    age: age || null,
                    medical_history: medicalHistory || null,
                    guardian_name: guardianName || null,
                    guardian_contact: guardianContact || null
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showAuthSuccess('Account created successfully! Please login.');
                
                // Clear form
                document.getElementById('registerName').value = '';
                document.getElementById('registerEmail').value = '';
                document.getElementById('registerPassword').value = '';
                document.getElementById('registerAge').value = '';
                document.getElementById('registerMedicalHistory').value = '';
                document.getElementById('registerGuardianName').value = '';
                document.getElementById('registerGuardianContact').value = '';
                
                // Switch to login tab
                app.switchAuthTab('login');
            } else {
                this.showAuthError(data.message || 'Registration failed');
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.showAuthError('Connection failed. Please check if the server is running.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showAuthError(message) {
        this.showAuthMessage(message, 'error');
    }

    showAuthSuccess(message) {
        this.showAuthMessage(message, 'success');
    }

    showAuthMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message auth-${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
        `;

        // Add styles
        messageDiv.style.cssText = `
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            background: ${type === 'error' ? '#fef2f2' : '#f0fdf4'};
            color: ${type === 'error' ? '#dc2626' : '#16a34a'};
            border: 1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'};
        `;

        // Insert message
        const authBody = document.querySelector('.auth-body');
        authBody.insertBefore(messageDiv, authBody.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Initialize auth manager
const authManager = new AuthManager();