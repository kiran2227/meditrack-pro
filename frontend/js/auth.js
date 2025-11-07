// // Authentication functionality
// class AuthManager {
//     constructor() {
//         this.setupAuthEventListeners();
//     }

//     setupAuthEventListeners() {
//         // Login form
//         document.getElementById('loginBtn').addEventListener('click', (e) => {
//             e.preventDefault();
//             this.handleLogin();
//         });

//         // Register form
//         document.getElementById('registerBtn').addEventListener('click', (e) => {
//             e.preventDefault();
//             this.handleRegister();
//         });

//         // Enter key support
//         document.getElementById('loginPassword').addEventListener('keypress', (e) => {
//             if (e.key === 'Enter') {
//                 this.handleLogin();
//             }
//         });

//         // Logout
//         document.getElementById('logoutBtn').addEventListener('click', () => {
//             this.handleLogout();
//         });
//     }

//     async handleLogin() {
//         const email = document.getElementById('loginEmail').value.trim();
//         const password = document.getElementById('loginPassword').value;

//         // Basic validation
//         if (!email || !password) {
//             this.showAuthError('Please fill in all fields');
//             return;
//         }

//         if (!this.isValidEmail(email)) {
//             this.showAuthError('Please enter a valid email address');
//             return;
//         }

//         const btn = document.getElementById('loginBtn');
//         const originalText = btn.innerHTML;
        
//         try {
//             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
//             btn.disabled = true;

//             console.log('🔐 Attempting login...');
            
//             const response = await fetch('http://localhost:5000/api/auth/login', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ email, password })
//             });

//             const data = await response.json();
//             console.log('📨 Login response:', data);

//             if (data.success) {
//                 this.showAuthSuccess('Login successful!');
                
//                 // Store user data in localStorage
//                 localStorage.setItem('meditrack_user', JSON.stringify(data.user));
                
//                 // Update app state
//                 app.currentUser = data.user;
                
//                 // Show dashboard after a short delay
//                 setTimeout(() => {
//                     app.showDashboard();
//                 }, 1000);
                
//             } else {
//                 this.showAuthError(data.message || 'Login failed');
//             }

//         } catch (error) {
//             console.error('💥 Login error:', error);
//             this.showAuthError('Connection failed. Please check if the server is running.');
//         } finally {
//             btn.innerHTML = originalText;
//             btn.disabled = false;
//         }
//     }

//     async handleRegister() {
//         const name = document.getElementById('registerName').value.trim();
//         const email = document.getElementById('registerEmail').value.trim();
//         const password = document.getElementById('registerPassword').value;
//         const age = document.getElementById('registerAge').value;
//         const medicalHistory = document.getElementById('registerMedicalHistory').value;
//         const guardianName = document.getElementById('registerGuardianName').value;
//         const guardianContact = document.getElementById('registerGuardianContact').value;

//         // Validation
//         if (!name || !email || !password) {
//             this.showAuthError('Please fill in all required fields');
//             return;
//         }

//         if (!this.isValidEmail(email)) {
//             this.showAuthError('Please enter a valid email address');
//             return;
//         }

//         if (password.length < 6) {
//             this.showAuthError('Password must be at least 6 characters long');
//             return;
//         }

//         const btn = document.getElementById('registerBtn');
//         const originalText = btn.innerHTML;

//         try {
//             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
//             btn.disabled = true;

//             console.log('📝 Attempting registration...');

//             const response = await fetch('http://localhost:5000/api/auth/register', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                     name,
//                     email,
//                     password,
//                     age: age || null,
//                     medical_history: medicalHistory || null,
//                     guardian_name: guardianName || null,
//                     guardian_contact: guardianContact || null
//                 })
//             });

//             const data = await response.json();
//             console.log('📨 Register response:', data);

//             if (data.success) {
//                 this.showAuthSuccess('Account created successfully! Please login.');
                
//                 // Clear form
//                 document.getElementById('registerName').value = '';
//                 document.getElementById('registerEmail').value = '';
//                 document.getElementById('registerPassword').value = '';
//                 document.getElementById('registerAge').value = '';
//                 document.getElementById('registerMedicalHistory').value = '';
//                 document.getElementById('registerGuardianName').value = '';
//                 document.getElementById('registerGuardianContact').value = '';
                
//                 // Switch to login tab
//                 app.switchAuthTab('login');
//             } else {
//                 this.showAuthError(data.message || 'Registration failed');
//             }

//         } catch (error) {
//             console.error('💥 Registration error:', error);
//             this.showAuthError('Connection failed. Please check if the server is running.');
//         } finally {
//             btn.innerHTML = originalText;
//             btn.disabled = false;
//         }
//     }

//     handleLogout() {
//         localStorage.removeItem('meditrack_user');
//         app.currentUser = null;
//         app.medicines = [];
//         app.showLandingPage();
//         this.showAuthSuccess('Logged out successfully!');
//     }

//     isValidEmail(email) {
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         return emailRegex.test(email);
//     }

//     showAuthError(message) {
//         this.showAuthMessage(message, 'error');
//     }

//     showAuthSuccess(message) {
//         this.showAuthMessage(message, 'success');
//     }

//     showAuthMessage(message, type) {
//         // Remove existing messages
//         const existingMessage = document.querySelector('.auth-message');
//         if (existingMessage) {
//             existingMessage.remove();
//         }

//         // Create new message
//         const messageDiv = document.createElement('div');
//         messageDiv.className = `auth-message auth-${type}`;
//         messageDiv.innerHTML = `
//             <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
//             <span>${message}</span>
//         `;

//         // Add styles
//         messageDiv.style.cssText = `
//             padding: 12px 16px;
//             border-radius: 8px;
//             margin-bottom: 20px;
//             display: flex;
//             align-items: center;
//             gap: 8px;
//             font-weight: 500;
//             background: ${type === 'error' ? '#fef2f2' : '#f0fdf4'};
//             color: ${type === 'error' ? '#dc2626' : '#16a34a'};
//             border: 1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'};
//         `;

//         // Insert message
//         const authBody = document.querySelector('.auth-body');
//         if (authBody) {
//             authBody.insertBefore(messageDiv, authBody.firstChild);
//         }

//         // Auto-remove after 5 seconds
//         setTimeout(() => {
//             if (messageDiv.parentNode) {
//                 messageDiv.remove();
//             }
//         }, 5000);
//     }
// }

// // Initialize auth manager
// const authManager = new AuthManager();

// Enhanced Authentication functionality
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

        document.getElementById('registerPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleRegister();
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Enhanced validation
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

            console.log('🔐 Attempting login...');
            
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            console.log('📨 Login response:', data);

            if (data.success) {
                this.showAuthSuccess('Login successful! Redirecting...');
                
                // Store user data in localStorage
                localStorage.setItem('meditrack_user', JSON.stringify(data.user));
                
                // Update app state
                if (window.app) {
                    window.app.currentUser = data.user;
                }
                
                // Show dashboard after a short delay
                setTimeout(() => {
                    if (window.app && window.app.showDashboard) {
                        window.app.showDashboard();
                    }
                }, 1000);
                
            } else {
                this.showAuthError(data.message || 'Login failed. Please check your credentials.');
            }

        } catch (error) {
            console.error('💥 Login error:', error);
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

        // Enhanced validation
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

        if (name.length < 2) {
            this.showAuthError('Please enter a valid name');
            return;
        }

        const btn = document.getElementById('registerBtn');
        const originalText = btn.innerHTML;

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            btn.disabled = true;

            console.log('📝 Attempting registration...');

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
            console.log('📨 Register response:', data);

            if (data.success) {
                this.showAuthSuccess('Account created successfully! Please login with your credentials.');
                
                // Clear form
                document.getElementById('registerForm').reset();
                
                // Switch to login tab after delay
                setTimeout(() => {
                    if (window.app && window.app.switchAuthTab) {
                        window.app.switchAuthTab('login');
                    }
                }, 2000);
                
            } else {
                this.showAuthError(data.message || 'Registration failed. Please try again.');
            }

        } catch (error) {
            console.error('💥 Registration error:', error);
            this.showAuthError('Connection failed. Please check if the server is running.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    handleLogout() {
        // Clear all stored data
        localStorage.removeItem('meditrack_user');
        
        // Reset app state
        if (window.app) {
            window.app.currentUser = null;
            window.app.medicines = [];
            window.app.history = [];
            
            // Clear any active intervals
            if (window.app.reminderInterval) {
                clearInterval(window.app.reminderInterval);
            }
            if (window.app.reminderLoopInterval) {
                clearInterval(window.app.reminderLoopInterval);
            }
            
            window.app.showLandingPage();
        }
        
        this.showAuthSuccess('Logged out successfully!');
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
            animation: slideDown 0.3s ease;
        `;

        // Insert message
        const authBody = document.querySelector('.auth-body');
        if (authBody) {
            authBody.insertBefore(messageDiv, authBody.firstChild);
        }

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.authManager = new AuthManager();
});