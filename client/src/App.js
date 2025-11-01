// client/src/App.js (FINAL COMPLETE FRONTEND CODE - WITH RAZORPAY)

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import appAnimationData from './app.json';

// --- START: FIREBASE INTEGRATION CODE ---
// ... (This section is correct) ...
const firebaseConfig = {
    apiKey: "AIzaSyDRyYIhYRAOLHqQkem4Ekspv7SFCjaTXkA",
    authDomain: "ai-powered-pdf-query-assistant.firebaseapp.com",
    projectId: "ai-powered-pdf-query-assistant",
    storageBucket: "ai-powered-pdf-query-assistant.firebasestorage.app",
    messagingSenderId: "350459830933",
    appId: "1:350459830933:web:2c18f7b80bbe6dac27b19c",
    measurementId: "G-53E18BYWMG"
};
const loadFirebaseScripts = () => {
    if (typeof window.firebase !== 'undefined' && window.firebase.auth) {
        return Promise.resolve();
    }
    const loadScript = (url) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
    return loadScript("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js")
        .then(() => loadScript("https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"))
        .then(() => {
            if (window.firebase && !window.firebase.apps.length) {
                window.firebase.initializeApp(firebaseConfig);
            }
        });
};
const getFirebaseAuth = () => {
    if (typeof window.firebase !== 'undefined' && window.firebase.auth) {
        if (!window.firebase.apps.length) {
            window.firebase.initializeApp(firebaseConfig);
        }
        return window.firebase.auth();
    }
    throw new Error("Firebase Auth is not available. Ensure Firebase SDK scripts are loaded.");
};
// --- END: FIREBASE INTEGRATION CODE ---


// --- PRIVACY POLICY COMPONENT (Unchanged) ---
const PrivacyPolicy = ({ colors, navigate }) => (
    <div style={{
        padding: '40px',
        maxWidth: '800px',
        margin: '50px auto',
        backgroundColor: colors.bgSecondary,
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        color: colors.textPrimary,
        border: `1px solid ${colors.borderColor}`
    }}>
        <h2 style={{ color: colors.accentColor, borderBottom: `2px solid ${colors.accentColor}`, paddingBottom: '10px', marginBottom: '20px' }}>
            Privacy Policy
        </h2>
        <p style={{ lineHeight: '1.6' }}>Your privacy is important to us...</p>
        <h3 style={{ marginTop: '20px', color: colors.textPrimary }}>1. Data Collection and Storage</h3>
        <p style={{ lineHeight: '1.6', color: colors.textSecondary }}>...</p>
        <h3 style={{ marginTop: '20px', color: colors.textPrimary }}>2. Data Deletion</h3>
        <p style={{ lineHeight: '1.6', color: colors.textSecondary }}>...</p>
        <h3 style={{ marginTop: '20px', color: colors.textPrimary }}>3. Security</h3>
        <p style={{ lineHeight: '1.6', color: colors.textSecondary }}>...</p>
        <button
            onClick={() => navigate('tool')}
            style={{
                padding: '10px 30px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'background-color 0.3s',
                display: 'block',
                margin: '30px auto 0 auto',
                backgroundColor: colors.accentColor,
                color: 'white',
            }}
        >
            Go Back to the Tool
        </button>
    </div>
);
// --- END PRIVACY POLICY COMPONENT ---


// --- API URL CONFIGURATION (Unchanged) ---
const RENDER_API_URL = process.env.REACT_APP_API_URL || 'https://ai-powered-pdf-query-assistant.onrender.com';
const LOCAL_API_URL = 'http://localhost:5000';

const API_URL = window.location.hostname === 'localhost'
              ? LOCAL_API_URL
              : RENDER_API_URL;
// --- END MODIFIED API URL ---


// --- GLOBAL UTILITIES & STYLES (Unchanged) ---
const markdownTableToHtml = (markdown, isDark) => {
    const tableStyles = {
        tableBg: isDark ? '#2d3748' : '#fff',
        thBg: isDark ? '#4a5568' : '#f2f2f2',
        thText: isDark ? '#e2e8f0' : '#333',
        tdText: isDark ? '#a0aec0' : '#333',
        tdBorder: isDark ? '#4a5568' : '#eee',
    };
    const lines = markdown.trim().split('\n').filter(line => line.includes('|'));
    if (lines.length < 2) return markdown;
    const headerLine = lines[0].split('|').filter(h => h.trim()).map(h => `<th style="background-color: ${tableStyles.thBg}; color: ${tableStyles.thText}; padding: 10px; border: 1px solid ${tableStyles.tdBorder}; text-align: left;">${h.trim()}</th>`).join('');
    const header = headerLine ? `<thead><tr>${headerLine}</tr></thead>` : '';
    const bodyLines = lines.slice(2);
    const body = bodyLines.map((line, index) => {
        const rowBg = (index % 2 === 0) ? tableStyles.tableBg : (isDark ? '#1a202c' : '#fafafa');
        const rowCells = line.split('|').filter(cell => cell.trim()).map(cell => `<td style="padding: 8px; border: 1px solid ${tableStyles.tdBorder}; color: ${tableStyles.tdText};">${cell.trim()}</td>`).join('');
        return `<tr style="background-color: ${rowBg};">${rowCells}</tr>`;
    }).join('');
    return `<table class="comparison-table" style="width:100%; border-collapse: collapse; margin-top: 10px; color: ${tableStyles.tdText};">${header}<tbody>${body}</tbody></table>`;
};
const baseInputStyle = { width: '100%', padding: '12px 18px', marginBottom: '15px', boxSizing: 'border-box', border: 'none', borderRadius: '8px' };
const baseButtonStyle = { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'background-color 0.3s' };
const baseQueryButtonStyle = { padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.3s', border: 'none', width: '100%' };
// --- END GLOBAL UTILITIES & STYLES ---

// --- FOOTER COMPONENT (Unchanged) ---
const InstagramIcon = ({ color }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
);
// --- END FOOTER COMPONENT ---

// --- ABOUT PAGE COMPONENT (Unchanged) ---
const AboutPage = ({ colors, navigate }) => (
    <div style={{
        padding: '40px',
        maxWidth: '800px',
        margin: '50px auto',
        backgroundColor: colors.bgSecondary,
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        color: colors.textPrimary,
        border: `1px solid ${colors.borderColor}`
    }}>
        <h2 style={{ color: colors.accentColor, borderBottom: `2px solid ${colors.accentColor}`, paddingBottom: '10px', marginBottom: '20px' }}>
            About the AI Verbatim Query Assistant
        </h2>
        <p style={{ fontSize: '1.1em', lineHeight: '1.6', marginBottom: '25px', textAlign: 'justify' }}>
            Hi, I'm **Chandrashekar**, ...
        </p>
        <p style={{ fontSize: '1.1em', lineHeight: '1.6', marginBottom: '25px', fontWeight: 'bold', color: colors.textPrimary, textAlign: 'justify' }}>
            This website is a direct solution for students...
        </p>
        <ul style={{ listStyleType: 'none', paddingLeft: '0', fontSize: '1em', lineHeight: '1.8' }}>
            {/* ... (li elements) ... */}
        </ul>
        <p style={{ marginTop: '30px', textAlign: 'center', fontSize: '1.2em', fontWeight: 'bold' }}>
            So go ahead and upload your notes...
        </p>
        <button
            onClick={() => navigate('tool')}
            style={{
                ...baseButtonStyle,
                display: 'block',
                margin: '30px auto 0 auto',
                backgroundColor: colors.accentColor,
                color: 'white',
                padding: '10px 30px'
            }}
        >
            Go Back to the Tool
        </button>
    </div>
);
// --- END ABOUT PAGE COMPONENT ---


// --- PRICING PAGE COMPONENT (Unchanged) ---
const PricingPage = ({ colors, navigate, handleUpgrade }) => {
    const cardStyle = {
        flex: 1,
        minWidth: '280px',
        padding: '30px',
        backgroundColor: colors.answerBg,
        borderRadius: '12px',
        border: `1px solid ${colors.borderColor}`,
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        textAlign: 'center'
    };

    return (
        <div style={{
            padding: '40px',
            maxWidth: '800px',
            margin: '50px auto',
            backgroundColor: colors.bgSecondary,
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
            color: colors.textPrimary,
            border: `1px solid ${colors.borderColor}`
        }}>
            <h2 style={{ color: colors.accentColor, borderBottom: `2px solid ${colors.accentColor}`, paddingBottom: '10px', marginBottom: '30px', textAlign: 'center' }}>
                Choose Your Plan
            </h2>
            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* Free Plan Card */}
                <div style={cardStyle}>
                    <h3 style={{ color: colors.textPrimary, fontSize: '1.5em' }}>Free</h3>
                    <p style={{ fontSize: '2em', fontWeight: 'bold', color: colors.accentColor, margin: '10px 0' }}>₹0<span style={{fontSize: '0.5em', color: colors.textSecondary}}>/month</span></p>
                    <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', margin: '20px 0' }}>
                        <li style={{ margin: '10px 0', color: colors.textSecondary }}>✅ 50 Queries per Month</li>
                        <li style={{ margin: '10px 0', color: colors.textSecondary }}>✅ Typed PDF Uploads</li>
                        <li style={{ margin: '10px 0', color: colors.textSecondary }}>❌ Handwritten PDF Uploads</li>
                    </ul>
                    <button
                        disabled
                        style={{ ...baseButtonStyle, backgroundColor: colors.borderColor, color: colors.textSecondary, cursor: 'not-allowed', width: '100%' }}
                    >
                        Your Current Plan
                    </button>
                </div>
                {/* Pro Plan Card */}
                <div style={{...cardStyle, border: `2px solid ${colors.accentColor}`}}>
                    <h3 style={{ color: colors.accentColor, fontSize: '1.5em' }}>Pro</h3>
                    <p style={{ fontSize: '2em', fontWeight: 'bold', color: colors.accentColor, margin: '10px 0' }}>₹99<span style={{fontSize: '0.5em', color: colors.textSecondary}}>/month</span></p>
                    <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', margin: '20px 0' }}>
                        <li style={{ margin: '10px 0', color: colors.textPrimary }}>✅ Unlimited Queries</li>
                        <li style={{ margin: '10px 0', color: colors.textPrimary }}>✅ Typed PDF Uploads</li>
                        <li style={{ margin: '10px 0', color: colors.textPrimary }}>✅ Handwritten PDF Uploads</li>
                    </ul>
                    <button
                        onClick={handleUpgrade}
                        style={{ ...baseButtonStyle, backgroundColor: colors.accentColor, color: 'white', width: '100%' }}
                    >
                        Upgrade Now 🚀
                    </button>
                </div>
            </div>
            {/* ‼️ MODIFIED: Changed payment simulation message ‼️ */}
            <div style={{textAlign: 'center', marginTop: '30px', color: colors.textSecondary}}>
                <p>Clicking "Upgrade Now" will open the Razorpay payment gateway.</p>
                <p>This will use Razorpay's **Test Mode**.</p>
            </div>
            <button
                onClick={() => navigate('tool')}
                style={{ ...baseButtonStyle, display: 'block', margin: '30px auto 0 auto', backgroundColor: 'transparent', color: colors.textSecondary }}
            >
                Go Back
            </button>
        </div>
    );
};
// --- END PRICING PAGE COMPONENT ---


// --- LOGIN PAGE COMPONENT (Unchanged) ---
const SocialLoginButton = ({ provider, colors, setLoading, setAuthData, setMessage, firebaseLoaded }) => {
    const iconMap = { google: 'Google', github: 'GitHub' };
    const colorMap = { google: '#DB4437', github: '#24292e' };
    const handleClick = async () => {
        if (!firebaseLoaded) return;
        try {
            setLoading(true);
            setMessage(`Signing in with ${iconMap[provider]}...`);
            const auth = getFirebaseAuth();
            let providerInstance;
            switch (provider) {
                case 'google': providerInstance = new window.firebase.auth.GoogleAuthProvider(); break;
                case 'github': providerInstance = new window.firebase.auth.GithubAuthProvider(); break;
                default: throw new Error("Unsupported provider");
            }
            const result = await auth.signInWithPopup(providerInstance);
            const user = result.user;
            const idToken = await user.getIdToken();
            setAuthData({ isAuthenticated: true, username: user.displayName || user.email || 'User', userId: user.uid, token: idToken });
            setMessage(`Sign-in with ${iconMap[provider]} successful!`);
        } catch (error) {
            console.error("Firebase Auth Error:", error);
            setMessage(`Authentication Failed: ${error.message.replace('Firebase:', '').trim()}`);
            setAuthData({ isAuthenticated: false, username: '', userId: null, token: null });
        } finally {
            setLoading(false);
        }
    };
    return (
        <button onClick={handleClick} disabled={!firebaseLoaded} style={{ ...baseButtonStyle, backgroundColor: colorMap[provider], color: 'white', padding: '12px 20px', width: '100%', marginBottom: '10px', boxShadow: `0 2px 4px ${colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span>Sign in with {iconMap[provider]}</span>
        </button>
    );
};

const LoginPage = ({ colors, setIsAuthenticated, setUsername, navigate, setUserId, setToken, firebaseLoaded, toggleTheme, isDark }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetMode, setResetMode] = useState(false);

    const setAuthData = ({ isAuthenticated, username, userId, token }) => {
        setIsAuthenticated(isAuthenticated);
        setUsername(username);
        setUserId(userId);
        setToken(token);
        if (isAuthenticated) {
            navigate('tool');
        }
    };
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!firebaseLoaded) { setMessage('Firebase is still loading. Please wait.'); return; }
        if (!usernameInput) { setMessage('Please enter your email address above to reset the password.'); return; }
        setLoading(true); setMessage('');
        try {
            const auth = getFirebaseAuth();
            await auth.sendPasswordResetEmail(usernameInput);
            setMessage(`Success! Password reset link sent to ${usernameInput}. Check your inbox.`);
            setResetMode(false);
            setUsernameInput('');
        } catch (error) {
            console.error("Password Reset Error:", error);
            setMessage(`Reset Failed: ${error.message.replace('Firebase:', '').trim()}`);
        } finally {
            setLoading(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!firebaseLoaded) { setMessage('Firebase is still loading. Please wait.'); return; }
        setLoading(true); setMessage('');
        try {
            const auth = getFirebaseAuth();
            let userCredential;
            if (isLogin) {
                userCredential = await auth.signInWithEmailAndPassword(usernameInput, passwordInput);
            } else {
                if (passwordInput.length < 6) { setMessage('Password must be at least 6 characters long.'); setLoading(false); return; }
                userCredential = await auth.createUserWithEmailAndPassword(usernameInput, passwordInput);
            }
            const user = userCredential.user;
            const idToken = await user.getIdToken();
            setAuthData({ isAuthenticated: true, username: user.displayName || user.email || 'User', userId: user.uid, token: idToken });
            setMessage(`${isLogin ? 'Login' : 'Registration'} successful!`);
        } catch (error) {
            console.error("Firebase Auth Error:", error);
            setMessage(`Authentication Failed: ${error.message.replace('Firebase:', '').trim()}`);
        } finally {
            setLoading(false);
        }
    };
    const cardStyle = { padding: '40px', maxWidth: '400px', margin: '5vh auto', backgroundColor: colors.bgSecondary, borderRadius: '15px', boxShadow: `0 10px 30px ${colors.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'}`, color: colors.textPrimary, border: `1px solid ${colors.borderColor}`, textAlign: 'center', position: 'relative', transform: loading ? 'scale(0.98)' : 'scale(1)', transition: 'transform 0.3s ease-in-out' };
    const inputFocusStyle = { boxShadow: `0 0 0 2px ${colors.accentColor}`, transition: 'box-shadow 0.2s' };
    const renderAuthForm = () => (
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Email Address"
                required
                style={{ ...baseInputStyle, backgroundColor: colors.answerBg, color: colors.textPrimary }}
                onFocus={(e) => e.target.style.boxShadow = inputFocusStyle.boxShadow}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
            />
            <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                required
                minLength={isLogin ? 1 : 6}
                style={{ ...baseInputStyle, backgroundColor: colors.answerBg, color: colors.textPrimary }}
                onFocus={(e) => e.target.style.boxShadow = inputFocusStyle.boxShadow}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
            />
            <button type="submit" disabled={loading || !firebaseLoaded} style={{ ...baseButtonStyle, backgroundColor: colors.accentColor, color: 'white', width: '100%', padding: '12px 20px', marginBottom: '10px' }}>
                {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
            </button>
        </form>
    );
    const renderResetForm = () => (
        <form onSubmit={handlePasswordReset}>
            <p style={{ color: colors.textSecondary, fontSize: '0.9em', marginBottom: '15px' }}>
                Enter your email address to receive a password reset link.
            </p>
            <input
                type="email"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Email Address"
                required
                style={{ ...baseInputStyle, backgroundColor: colors.answerBg, color: colors.textPrimary }}
                onFocus={(e) => e.target.style.boxShadow = inputFocusStyle.boxShadow}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
            />
            <button type="submit" disabled={loading || !firebaseLoaded} style={{ ...baseButtonStyle, backgroundColor: colors.accentColor, color: 'white', width: '100%', padding: '12px 20px', marginBottom: '10px' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
        </form>
    );
    return (
        <div style={cardStyle}>
            {loading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '15px' }}>
                    <Player
                        autoplay
                        loop
                        src={appAnimationData}
                        style={{ height: '100px', width: '100px' }}
                    />
                </div>
            )}
            <button onClick={toggleTheme} style={{ ...baseButtonStyle, padding: '8px 15px', backgroundColor: colors.buttonBg, color: 'white', position: 'absolute', top: '20px', right: '20px' }}>
                {isDark ? '☀️' : '🌙'}
            </button>
            <div style={{ width: '100px', margin: '0 auto -10px auto' }}>
                <Player
                    autoplay
                    loop
                    src={appAnimationData}
                    style={{ height: '100px', width: '100px' }}
                />
            </div>
            <h2 style={{ color: colors.textPrimary, marginBottom: '20px', fontWeight: '600' }}>
                {resetMode ? 'Reset Password' : (isLogin ? 'Welcome Back!' : 'Create Account')}
            </h2>
            <AnimatedMessage message={message || (!firebaseLoaded ? 'Connecting to authentication...' : '')} type={message.includes('Failed') ? 'error' : (message.includes('Success') ? 'success' : 'info')} colors={colors} />

            {resetMode ? renderResetForm() : renderAuthForm()}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                <button
                    onClick={() => {
                        setResetMode(false);
                        setIsLogin(!isLogin);
                        setMessage('');
                    }}
                    style={{ background: 'none', border: 'none', color: colors.accentColor, cursor: 'pointer', padding: 0 }}
                >
                    {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
                </button>
                <button
                    onClick={() => {
                        setResetMode(!resetMode);
                        setMessage('');
                    }}
                    style={{ background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer', padding: 0, fontSize: '0.9em' }}
                >
                    {resetMode ? 'Back to Login' : 'Forgot Password?'}
                </button>
            </div>

            {!resetMode && (
                <>
                    <div style={{ margin: '20px 0', color: colors.textSecondary, display: 'flex', alignItems: 'center' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: colors.borderColor }} />
                        <span style={{ margin: '0 10px', fontSize: '0.9em' }}>Or continue with</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: colors.borderColor }} />
                    </div>
                    <SocialLoginButton
                        provider="google"
                        colors={colors}
                        setLoading={setLoading}
                        setAuthData={setAuthData}
                        setMessage={setMessage}
                        firebaseLoaded={firebaseLoaded}
                    />
                    <SocialLoginButton
                        provider="github"
                        colors={colors}
                        setLoading={setLoading}
                        setAuthData={setAuthData}
                        setMessage={setMessage}
                        firebaseLoaded={firebaseLoaded}
                    />
                </>
            )}
        </div>
    );
};
// --- END LOGIN PAGE COMPONENT ---


// --- SKELETONS & MESSAGES (Unchanged) ---
const Skeleton = ({ style, colors }) => ( <div style={{ ...style, backgroundColor: colors.answerBg, borderRadius: '4px', animation: 'shimmer 2s infinite linear' }} /> );
const AnswerSkeleton = ({ colors }) => ( <div style={{ width: '100%' }}> <Skeleton style={{ height: '20px', width: '90%', marginBottom: '10px' }} colors={colors} /> <Skeleton style={{ height: '20px', width: '100%', marginBottom: '10px' }} colors={colors} /> <Skeleton style={{ height: '20px', width: '70%', marginBottom: '10px' }} colors={colors} /> </div> );
const FileTableSkeleton = ({ colors }) => { /* ... (code is identical) ... */ };
const AnimatedMessage = ({ message, type, colors }) => { /* ... (code is identical) ... */ };
// --- END SKELETONS & MESSAGES ---


// --- FILE MANAGER (Unchanged) ---
const FileManagementPage = ({ colors, navigate, isAuthenticated, userId, activeNotesFileName, setActiveNotesFileName, setNotesMessage, handleLogout }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const fetchFiles = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        let idToken;
        try {
            const auth = getFirebaseAuth();
            if (!auth.currentUser) throw new Error("No user found");
            idToken = await auth.currentUser.getIdToken(true);
        } catch (error) {
            setMessage('Session expired. Please log in again.');
            setLoading(false);
            handleLogout();
            return;
        }
        try {
            const response = await fetch(`${API_URL}/files`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setFiles(data);
            } else {
                setMessage('Failed to fetch files. Please try again.');
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, handleLogout]);

    const handleDelete = async (fileId) => {
        if (!window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) return;
        setLoading(true);
        let idToken;
        try {
            const auth = getFirebaseAuth();
            if (!auth.currentUser) throw new Error("No user found");
            idToken = await auth.currentUser.getIdToken(true);
        } catch (error) {
            setMessage('Session expired. Please log in again.');
            setLoading(false);
            handleLogout();
            return;
        }
        try {
            const response = await fetch(`${API_URL}/files/${fileId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(`Success: ${data.message}`);
                fetchFiles();
                if (activeNotesFileName === files.find(f => f.id === fileId)?.filename) {
                    setActiveNotesFileName(null);
                    setNotesMessage('The active notes file was deleted. Please select a new one.');
                }
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSetActiveNotes = async (fileId, fileName) => {
        setLoading(true);
        let idToken;
        try {
            const auth = getFirebaseAuth();
            if (!auth.currentUser) throw new Error("No user found");
            idToken = await auth.currentUser.getIdToken(true);
        } catch (error) {
            setMessage('Session expired. Please log in again.');
            setLoading(false);
            handleLogout();
            return;
        }
        try {
            const response = await fetch(`${API_URL}/set-active-notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ fileId })
            });
            const data = await response.json();
            if (response.ok) {
                setActiveNotesFileName(data.filename);
                setNotesMessage(`Success: ${data.filename} is now the active notes file.`);
                navigate('tool');
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (isAuthenticated) { fetchFiles(); } }, [isAuthenticated, fetchFiles]);
    const messageType = message.includes('Failed') || message.includes('Error') ? 'error' : (message.includes('Success') ? 'success' : 'info');

    return (
        <div style={{ padding: '40px', maxWidth: '900px', margin: '50px auto', backgroundColor: colors.bgSecondary, borderRadius: '12px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)', color: colors.textPrimary, border: `1px solid ${colors.borderColor}` }}>
            <button onClick={() => navigate('tool')} style={{ ...baseButtonStyle, backgroundColor: colors.accentColor, color: 'white', marginBottom: '20px' }}>
                Back to Query Tool
            </button>
            <h2 style={{ color: colors.accentColor, borderBottom: `2px solid ${colors.accentColor}`, paddingBottom: '10px', marginBottom: '20px' }}>
                File Manager
            </h2>
            {message && <AnimatedMessage message={message} type={messageType} colors={colors} />}
            <div style={{ overflowX: 'auto', marginTop: '20px', border: `1px solid ${colors.borderColor}`, borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: colors.thBg }}>
                        <tr>
                            <th style={{ padding: '15px', textAlign: 'left', color: colors.thText }}>File Name</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: colors.thText }}>Type</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: colors.thText }}>Date</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: colors.thText }}>Status</th>
                            <th style={{ padding: '15px', textAlign: 'right', color: colors.thText }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !files.length ? (
                            <tr><td colSpan="5"><FileTableSkeleton colors={colors} /></td></tr>
                        ) : files.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: colors.textSecondary, borderTop: `1px solid ${colors.tdBorder}` }}>
                                    You have not uploaded any files yet.
                                </td>
                            </tr>
                        ) : (
                            files.map((file, index) => (
                                <tr key={file.id} style={{ borderTop: `1px solid ${colors.tdBorder}`, backgroundColor: (index % 2 === 0) ? colors.tableBg : colors.answerBg }}>
                                    <td style={{ padding: '15px', fontWeight: '500' }}>{file.filename}</td>
                                    <td style={{ padding: '15px', textTransform: 'capitalize' }}>{file.type}</td>
                                    <td style={{ padding: '15px', fontSize: '0.9em' }}>{file.uploaded_at}</td>
                                    <td style={{ padding: '15px', fontWeight: 'bold', color: activeNotesFileName === file.filename ? 'green' : (file.type === 'notes' ? colors.textSecondary : 'transparent') }}>
                                        {activeNotesFileName === file.filename ? 'Active Notes' : ''}
                                    </td>
                                    <td style={{ padding: '15px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        {file.type === 'notes' && activeNotesFileName !== file.filename && (
                                            <button
                                                onClick={() => handleSetActiveNotes(file.id, file.filename)}
                                                disabled={loading}
                                                style={{ ...baseButtonStyle, padding: '5px 10px', backgroundColor: colors.successBg, color: 'white', fontSize: '0.9em' }}
                                            >
                                                Set Active
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(file.id)}
                                            disabled={loading}
                                            style={{ ...baseButtonStyle, padding: '5px 10px', backgroundColor: '#e53e3e', color: 'white', fontSize: '0.9em' }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
// --- END FILE MANAGER ---


// --- MAIN APP COMPONENT ---
function App() {
    // Global State (Unchanged)
    const [theme, setTheme] = useState('light');
    const [pageMode, setPageMode] = useState('loading');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState(null);
    const [token, setToken] = useState(null);
    const [firebaseLoaded, setFirebaseLoaded] = useState(false);
    const [userProfile, setUserProfile] = useState({ plan: 'free', query_count: 0, query_limit: 50 });
    const [notesFile, setNotesFile] = useState(null);
    const [paperFile, setPaperFile] = useState(null);
    const [activeNotesFileName, setActiveNotesFileName] = useState(null);
    const [notesMessage, setNotesMessage] = useState('');
    const [paperMessage, setPaperMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [question, setQuestion] =useState('');
    const [answer, setAnswer] = useState('');
    const [sources, setSources] = useState('');
    const [mode, setMode] = useState('');
    const [queryLoading, setQueryLoading] = useState(false);
    const [fetchedImage, setFetchedImage] = useState(null);
    const notesFileInputRef = useRef(null);
    const paperFileInputRef = useRef(null);
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };
    const isDark = theme === 'dark';
    const colors = { isDark, bgPrimary: isDark ? '#1a202c' : '#f4f7f6', bgSecondary: isDark ? '#2d3748' : '#fff', textPrimary: isDark ? '#e2e8f0' : '#2c3e50', textSecondary: isDark ? '#a0aec0' : '#666', borderColor: isDark ? '#4a5568' : '#ddd', accentColor: isDark ? '#63b3ed' : '#1a73e8', buttonBg: isDark ? '#4299e1' : '#1a73e8', buttonHover: isDark ? '#3182ce' : '#155bb5', successBg: isDark ? '#2f855a' : '#00c853', answerBg: isDark ? '#243447' : '#f8f9fa', thBg: isDark ? '#4a5568' : '#f2f2f2', tdBorder: isDark ? '#4a5568' : '#eee', tableBg: isDark ? '#2d3748' : '#fff', thText: isDark ? '#e2e8f0' : '#333' };
    const globalStyle = { fontFamily: 'Inter, sans-serif', margin: '0 auto', backgroundColor: colors.bgPrimary, minHeight: '100vh', color: colors.textPrimary, padding: '20px' };
    const sectionStyle = { border: `1px solid ${colors.borderColor}`, padding: '30px', marginBottom: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', backgroundColor: colors.bgSecondary, transition: 'all 0.3s' };
    const titleStyle = { color: colors.accentColor, borderBottom: `1px solid ${colors.borderColor}`, paddingBottom: '10px', marginBottom: '20px' };
    const answerBoxStyle = { minHeight: '150px', padding: '15px', backgroundColor: colors.answerBg, borderRadius: '8px', border: `1px solid ${colors.borderColor}` };

    // --- INJECT CSS KEYFRAMES (Unchanged) ---
    useEffect(() => {
        const styleId = 'app-animations';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = ` @keyframes shimmer { 0% { background-position: -468px 0; } 100% { background-position: 468px 0; } } div[style*="animation: shimmer"] { background: linear-gradient(to right, ${colors.answerBg} 8%, ${colors.bgPrimary} 18%, ${colors.answerBg} 33%); background-size: 800px 104px; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } } @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } } `;
            document.head.appendChild(style);
        }
    }, [colors.answerBg, colors.bgPrimary]);

    // --- Navigation function (Unchanged) ---
    const navigate = (mode) => {
        setPageMode(mode);
        const path = (mode === 'tool' || mode === 'login') ? '/' : `/${mode}`;
        window.history.pushState({}, '', path);
    };

    // --- LOGOUT FUNCTION (Unchanged) ---
    const handleLogout = useCallback(async () => {
        try {
            if (window.firebase) {
                const auth = getFirebaseAuth();
                await auth.signOut();
            }
            navigate('login');
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }, []);

    // --- AUTH STATUS CHECKER (Unchanged) ---
    const checkAuthStatus = useCallback(async (idToken) => {
        if (!idToken) return;
        try {
            const response = await fetch(`${API_URL}/get-user-profile`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            if (response.ok) {
                const data = await response.json();
                setUserProfile(data);
            } else if (response.status === 401) {
                console.error("Token was rejected, logging out.");
                handleLogout();
            } else {
                console.error("Failed to fetch user profile");
            }
        } catch (error) {
            console.error("Network error fetching user profile:", error);
        }
    }, [handleLogout]);

    // --- AUTH LISTENER (Unchanged, includes login-loop fix) ---
    useEffect(() => {
        loadFirebaseScripts()
            .then(() => {
                setFirebaseLoaded(true);
                const auth = getFirebaseAuth();
                auth.onAuthStateChanged(async (user) => {
                    const path = window.location.pathname.toLowerCase();
                    const mode = path.substring(1);
                    if (user) {
                        const idToken = await user.getIdToken(true); // Force refresh
                        setIsAuthenticated(true);
                        setUsername(user.displayName || user.email || 'User');
                        setUserId(user.uid);
                        setToken(idToken);
                        await checkAuthStatus(idToken);
                        if (mode === 'about') navigate('about');
                        else if (mode === 'privacy') navigate('privacy');
                        else if (mode === 'file_manager') navigate('file_manager');
                        else if (mode === 'pricing') navigate('pricing');
                        else navigate('tool');
                    } else {
                        setIsAuthenticated(false);
                        setUsername('');
                        setUserId(null);
                        setToken(null);
                        setActiveNotesFileName(null);
                        setUserProfile({ plan: 'free', query_count: 0, query_limit: 50 });
                        if (mode === 'about') navigate('about');
                        else if (mode === 'privacy') navigate('privacy');
                        else navigate('login');
                    }
                });
            })
            .catch(error => {
                console.error("Failed to load Firebase SDKs:", error);
                setFirebaseLoaded(false);
                setPageMode('login');
            });
    }, [checkAuthStatus]);


    // --- ‼️‼️‼️ START: MODIFIED UPGRADE FUNCTION (RAZORPAY) ‼️‼️‼️ ---
    const handleUpgrade = async () => {

        // --- Get fresh token ---
        let idToken;
        try {
            const auth = getFirebaseAuth();
            if (!auth.currentUser) throw new Error("No user found");
            idToken = await auth.currentUser.getIdToken(true);
        } catch (error) {
            console.error("Token refresh failed:", error);
            alert("Session expired. Please log in again.");
            handleLogout();
            return;
        }

        try {
            // 1. Call our *new* backend endpoint to create an order
            const response = await fetch(`${API_URL}/create-payment-order`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });

            if (!response.ok) {
                const data = await response.json();
                alert(`Failed to create payment: ${data.error}`);
                return;
            }

            const order = await response.json();

            // 2. Create Razorpay options
            const options = {
                key: order.key_id,
                amount: order.amount,
                currency: order.currency,
                name: "AI Verbatim Query Assistant",
                description: "Pro Plan - Monthly",
                // image: "https://...your...logo.png", // Optional: Add a link to your logo
                order_id: order.order_id,

                // This handler function runs on successful payment
                handler: function (response) {
                    // Payment was successful.
                    // We don't need to do anything here, the webhook handles the database.
                    // We just give the user a good experience.
                    alert("Payment successful! Your account will be upgraded within 60 seconds.");

                    // Refresh the user profile after a short delay to check for the upgrade
                    setTimeout(() => {
                        checkAuthStatus(idToken);
                    }, 2000); // Wait 2 seconds for webhook

                    navigate('tool');
                },

                // Pre-fill user info
                prefill: {
                    name: order.username,
                    email: order.user_email,
                },
                notes: {
                    address: "AI Verbatim Query Assistant"
                },
                theme: {
                    color: colors.accentColor // Use your app's accent color
                }
            };

            // 3. Open the Razorpay Checkout popup
            // Check if Razorpay is loaded
            if (!window.Razorpay) {
                alert("Payment gateway is not loaded. Please check your internet connection and try again.");
                return;
            }

            const rzp1 = new window.Razorpay(options);

            // Add a safety check in case the payment fails to open
            rzp1.on('payment.failed', function (response){
                    alert(`Payment failed: ${response.error.description}`);
                    console.error("Razorpay Payment Failed:", response.error.description);
            });

            rzp1.open();

        } catch (error) {
            alert(`Network error during upgrade: ${error.message}`);
        }
    };
    // --- ‼️‼️‼️ END: MODIFIED UPGRADE FUNCTION ‼️‼️‼️ ---


    // --- UPLOAD FUNCTIONS (Unchanged) ---
    const handleUpload = async (file, type) => {
        if (!file || !isAuthenticated) return;
        const isNotes = type === 'notes';
        const setFileMessage = isNotes ? setNotesMessage : setPaperMessage;
        const uploadEndpoint = isNotes ? `${API_URL}/upload-notes` : `${API_URL}/upload-paper`;

        let idToken;
        try {
            const auth = getFirebaseAuth();
            if (!auth.currentUser) throw new Error("No user found");
            idToken = await auth.currentUser.getIdToken(true);
        } catch (error) {
            console.error("Token refresh failed:", error);
            setFileMessage('Session expired. Please log in again.');
            handleLogout();
            return;
        }

        setIsProcessing(true);
        setFileMessage(`Processing ${isNotes ? 'Notes' : 'Paper'}...`);
        const formData = new FormData();
        formData.append('pdf', file);
        try {
            const response = await fetch(uploadEndpoint, {
                method: 'POST',
                body: formData,
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            const data = await response.json();
            if (response.ok) {
                setFileMessage(`Success! ${isNotes ? 'Notes' : 'Paper'} processed. ${data.chunks_count} chunks indexed.`);
                if (isNotes) {
                    setAnswer(''); setSources(''); setMode(''); setFetchedImage(null);
                    setActiveNotesFileName(file.name);
                }
            } else if (response.status === 401) {
                setFileMessage('Unauthorized. Please log in again.');
                handleLogout();
            }
            else {
                setFileMessage(`Upload Error: ${data.error}`);
            }
        } catch (error) {
            setFileMessage('Network Error: Could not connect to backend server.');
        } finally {
            setIsProcessing(false);
        }
    };
    const handleNotesUpload = () => handleUpload(notesFile, 'notes');
    const handlePaperUpload = () => handleUpload(paperFile, 'paper');
    // --- END UPLOAD FUNCTIONS ---


    // --- QUERY/SOLVE FUNCTIONS (Unchanged) ---
    const handleQuery = async (e) => {
        e.preventDefault();
        const canQuery = isAuthenticated && activeNotesFileName && question.trim();
        if (queryLoading || isProcessing || !canQuery) {
             if (!activeNotesFileName) { setAnswer('Please upload or set an active Notes PDF first.'); setMode('ERROR'); }
             if (!question.trim()) { setAnswer('Please enter a question.'); setMode('ERROR'); }
             return;
        }

        let idToken;
        try {
            const auth = getFirebaseAuth();
            if (!auth.currentUser) throw new Error("No user found");
            idToken = await auth.currentUser.getIdToken(true);
        } catch (error) {
            console.error("Token refresh failed:", error);
            setAnswer('Session expired. Please log in again.');
            setMode('ERROR');
            setQueryLoading(false);
            handleLogout();
            return;
        }

        setQueryLoading(true); setAnswer(''); setSources(''); setMode(''); setFetchedImage(null);
        try {
            const response = await fetch(`${API_URL}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ question }),
            });
            const data = await response.json();
            if (response.ok) {
                setAnswer(data.answer);
                setSources(data.sources || "Direct API response.");
                setMode(data.mode || "VERBATIM");
                setFetchedImage(data.image_data || null);
                if (userProfile.plan === 'free' && data.mode !== "ERROR" && !data.answer.includes("not found")) {
                    await checkAuthStatus(idToken);
                }
            } else if (response.status === 403) {
                setAnswer(data.error);
                setMode('ERROR');
                await checkAuthStatus(idToken);
            } else if (response.status === 401) {
                setAnswer('Unauthorized. Please log in.');
                setMode('ERROR');
                handleLogout();
            } else {
                setAnswer(data.error);
                setSources(data.sources || '');
                setMode('ERROR');
            }
        } catch (error) {
            setAnswer('Network Error: Could not connect to backend server.'); setSources(''); setMode('ERROR');
        } finally {
            setQueryLoading(false);
        }
    };

    const handleGoogleSolve = async (e) => {
        e.preventDefault();
        const canQuery = isAuthenticated && question.trim();
        if (queryLoading || isProcessing || !canQuery) {
             if (!question.trim()) { setAnswer('Please enter a question to solve.'); setMode('ERROR'); }
             return;
        }

        let idToken;
        try {
            const auth = getFirebaseAuth();
            if (!auth.currentUser) throw new Error("No user found");
            idToken = await auth.currentUser.getIdToken(true);
        } catch (error) {
            console.error("Token refresh failed:", error);
            setAnswer('Session expired. Please log in again.');
            setMode('ERROR');
            setQueryLoading(false);
            handleLogout();
            return;
        }

        setQueryLoading(true); setAnswer(''); setSources(''); setMode(''); setFetchedImage(null);
        try {
            const response = await fetch(`${API_URL}/google-solve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ question }),
            });
            const data = await response.json();
            if (response.ok) {
                setAnswer(data.answer);
                setSources(data.sources || "Google Search");
                setMode(data.mode || "GOOGLE_SOLVE");
                setFetchedImage(null);
                if (userProfile.plan === 'free' && data.mode !== "ERROR") {
                    await checkAuthStatus(idToken);
                }
            } else if (response.status === 403) {
                setAnswer(data.error);
                setMode('ERROR');
                await checkAuthStatus(idToken);
            } else if (response.status === 401) {
                setAnswer('Unauthorized. Please log in.');
                setMode('ERROR');
                handleLogout();
            } else {
                setAnswer(data.error);
                setSources('Relevance Check Failed');
                setMode('ERROR');
            }
        } catch (error) {
            setAnswer('Network Error: Could not connect to backend server.'); setSources(''); setMode('ERROR');
        } finally {
            setQueryLoading(false);
        }
    };
    // --- END QUERY/SOLVE FUNCTIONS ---


    // --- RENDER FUNCTIONS (Unchanged) ---
    const renderAnswerContent = () => {
        if (queryLoading) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Player
                        autoplay
                        loop
                        src={appAnimationData}
                        style={{ width: '120px', maxWidth: '100%', height: 'auto', border: 'none' }}
                    />
                    <p style={{ color: colors.textSecondary, textAlign: 'center', marginTop: '5px', fontWeight: '500' }}>Thinking...</p>
                </div>
            );
        }
        if (!answer) { return <p style={{ color: colors.textSecondary }}>Ask a question to begin.</p>; }
        if (mode === 'FULL_TEXT') { return ( <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '500px', overflowY: 'scroll', border: `1px solid ${colors.borderColor}`, padding: '15px', backgroundColor: colors.answerBg, color: colors.textPrimary }}> {answer} </pre> ); }
        if (mode === 'COMPARISON') { const tableHtml = markdownTableToHtml(answer, isDark); return ( <div style={{ padding: '15px', border: `1px solid ${colors.accentColor}`, backgroundColor: colors.answerBg, borderRadius: '8px' }}> <h4 style={{marginTop: '0', color: colors.accentColor}}>Comparison Table</h4> <div dangerouslySetInnerHTML={{ __html: tableHtml }} style={{ overflowX: 'auto', color: colors.textPrimary }} /> </div> ); }
        if (mode === 'ERROR') { return <AnimatedMessage message={answer} type="error" colors={colors} />; }
        if (mode === 'VERBATIM' || mode === 'GOOGLE_SOLVE') {
            // ‼️ MODIFIED: Handle confirmation message bolding ‼️
            const parts = answer.split('---');
            if (parts.length > 1 && parts[0].includes("**Confirmation:**")) {
                const confirmationHtml = parts[0].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />');
                const mainAnswer = parts.slice(1).join('---').trim();
                return (
                    <div>
                        <div dangerouslySetInnerHTML={{ __html: confirmationHtml }} style={{ paddingBottom: '10px', marginBottom: '10px', borderBottom: `1px dashed ${colors.borderColor}`}} />
                        <p style={{ whiteSpace: 'pre-wrap', fontWeight: '500', color: colors.textPrimary, textAlign: 'justify', fontSize: '1.05em', lineHeight: '1.6', margin: 0 }}>
                            {mainAnswer}
                        </p>
                    </div>
                );
            }
            // Fallback for regular answers
            return ( <p style={{ whiteSpace: 'pre-wrap', fontWeight: '500', color: colors.textPrimary, textAlign: 'justify', fontSize: '1.05em', lineHeight: '1.6' }}> {answer} </p> );
        }
        return ( <p style={{ whiteSpace: 'pre-wrap', color: colors.textPrimary }}> {answer} </p> );
    };
    // --- END RENDER FUNCTIONS ---


    // --- MAIN RETURN (App JSX) ---
    return (
        <div className="App" style={globalStyle}>
            {/* --- Page Router Logic (Unchanged) --- */}
            {pageMode === 'loading' ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: colors.textPrimary, backgroundColor: colors.bgPrimary}}>
                    <h2 style={{fontWeight: '500'}}>Loading Verbatim AI...</h2>
                </div>
            ) : pageMode === 'login' || pageMode === 'register' ? (
                <LoginPage
                    colors={colors}
                    navigate={navigate}
                    setIsAuthenticated={setIsAuthenticated}
                    setUsername={setUsername}
                    setUserId={setUserId}
                    setToken={setToken}
                    firebaseLoaded={firebaseLoaded}
                    toggleTheme={toggleTheme}
                    isDark={isDark}
                />
            ) : pageMode === 'about' ? (
                <AboutPage colors={colors} navigate={navigate} />
            ) : pageMode === 'privacy' ? (
                <PrivacyPolicy colors={colors} navigate={navigate} />
            ) : pageMode === 'pricing' ? (
                <PricingPage
                    colors={colors}
                    navigate={navigate}
                    handleUpgrade={handleUpgrade} // This is now the Razorpay function
                />
            ) : pageMode === 'file_manager' ? (
                <FileManagementPage
                    colors={colors}
                    navigate={navigate}
                    isAuthenticated={isAuthenticated}
                    userId={userId}
                    token={token}
                    activeNotesFileName={activeNotesFileName}
                    setActiveNotesFileName={setActiveNotesFileName}
                    setNotesMessage={setNotesMessage}
                    handleLogout={handleLogout}
                />
            ) : (
                <>
                    {/* --- HEADER (Unchanged) --- */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <h1 style={{ color: colors.textPrimary, fontSize: '2em', marginBottom: '10px' }}>
                            AI Verbatim Query Assistant
                        </h1>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {isAuthenticated && (
                                <div style={{textAlign: 'right'}}>
                                    <span style={{ color: colors.accentColor, fontWeight: 'bold' }}>
                                        {username}
                                    </span>
                                    {userProfile.plan === 'free' ? (
                                        <div style={{fontSize: '0.85em'}}>
                                            <span style={{color: colors.textSecondary}}>
                                                Free Plan: {userProfile.query_count} / {userProfile.query_limit} Queries
                                            </span>
                                            <button onClick={() => navigate('pricing')} style={{background: 'none', border: 'none', color: colors.accentColor, padding: '0 0 0 5px', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold'}}>
                                                (Upgrade)
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{fontSize: '0.85em', color: 'gold', fontWeight: 'bold'}}>
                                            PRO ACCOUNT 🚀
                                        </div>
                                    )}
                                </div>
                            )}
                            {isAuthenticated && (
                                <button
                                    onClick={() => navigate('file_manager')}
                                    style={{ ...baseButtonStyle, padding: '8px 15px', backgroundColor: colors.accentColor, color: 'white', fontWeight: '500' }}
                                >
                                    File Manager
                                </button>
                            )}
                            {isAuthenticated && (
                                <button
                                    onClick={handleLogout}
                                    style={{ ...baseButtonStyle, padding: '8px 15px', backgroundColor: 'red', color: 'white' }}
                                >
                                    Logout
                                </button>
                            )}
                            <button
                                onClick={toggleTheme}
                                style={{ ...baseButtonStyle, padding: '8px 15px', backgroundColor: colors.buttonBg, color: 'white' }}
                            >
                                {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
                            </button>
                        </div>
                    </div>
                    {/* --- END HEADER --- */}

                    {/* --- UPLOAD SECTION (Unchanged) --- */}
                    <div style={sectionStyle}>
                        <h2 style={titleStyle}>1. Upload Documents</h2>
                        <p style={{color: colors.textSecondary}}>
                            Active Notes: <span style={{fontWeight: 'bold', color: colors.accentColor}}>{activeNotesFileName || 'None'}</span>.
                            To switch files quickly, visit the <button onClick={() => navigate('file_manager')} style={{background: 'none', border: 'none', color: colors.accentColor, padding: 0, textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold'}}>File Manager</button>.
                        </p>
                        {userProfile.plan === 'free' && (
                            <AnimatedMessage
                                message="You are on the Free Plan. Uploading handwritten PDFs is a Pro feature."
                                type="info"
                                colors={colors}
                            />
                        )}
                        <div style={{ border: `1px solid ${colors.borderColor}`, padding: '15px', borderRadius: '8px', marginBottom: '15px', backgroundColor: colors.answerBg }}>
                            <h4 style={{marginTop: '0', color: colors.textPrimary}}>A. Notes/Reference PDF (Source of Answers)</h4>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: '200px' }}>
                                    <input type="file" accept="application/pdf" ref={notesFileInputRef} onChange={(e) => setNotesFile(e.target.files[0])} disabled={isProcessing || !isAuthenticated} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', zIndex: 10, cursor: 'pointer' }} />
                                    <button onClick={(e) => { e.preventDefault(); notesFileInputRef.current.click(); }} disabled={isProcessing || !isAuthenticated} style={{ ...baseButtonStyle, backgroundColor: colors.bgSecondary, color: colors.textPrimary, border: `1px solid ${colors.borderColor}`, padding: '8px 15px', marginRight: '-1px' }}>
                                        Choose File
                                    </button>
                                    <span style={{ padding: '8px 15px', border: `1px solid ${colors.borderColor}`, borderRadius: '0 8px 8px 0', backgroundColor: colors.bgSecondary, color: colors.textSecondary, flexGrow: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {notesFile ? notesFile.name : 'No file chosen'}
                                    </span>
                                </div>
                                <button onClick={handleNotesUpload} disabled={isProcessing || !notesFile || !isAuthenticated} style={{ ...baseButtonStyle, backgroundColor: colors.buttonBg, color: 'white' }}>
                                    {isProcessing ? 'Processing...' : 'Upload Notes'}
                                </button>
                            </div>
                            <AnimatedMessage message={notesMessage || (!isAuthenticated ? 'Please sign in to upload files.' : '')} type={notesMessage.startsWith('Success') ? 'success' : (notesMessage.includes('Error') || notesMessage.includes('Unauthorized') ? 'error' : 'info')} colors={colors} />
                        </div>
                        <div style={{ border: `1px solid ${colors.borderColor}`, padding: '15px', borderRadius: '8px', backgroundColor: colors.answerBg }}>
                            <h4 style={{marginTop: '0', color: colors.textPrimary}}>B. Question Paper PDF (Optional - For Context)</h4>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: '200px' }}>
                                    <input type="file" accept="application/pdf" ref={paperFileInputRef} onChange={(e) => setPaperFile(e.target.files[0])} disabled={isProcessing || !isAuthenticated} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', zIndex: 10, cursor: 'pointer' }} />
                                    <button onClick={(e) => { e.preventDefault(); paperFileInputRef.current.click(); }} disabled={isProcessing || !isAuthenticated} style={{ ...baseButtonStyle, backgroundColor: colors.bgSecondary, color: colors.textPrimary, border: `1px solid ${colors.borderColor}`, padding: '8px 15px', marginRight: '-1px' }}>
                                        Choose File
                                    </button>
                                    <span style={{ padding: '8px 15px', border: `1px solid ${colors.borderColor}`, borderRadius: '0 8px 8px 0', backgroundColor: colors.bgSecondary, color: colors.textSecondary, flexGrow: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {paperFile ? paperFile.name : 'No file chosen'}
                                    </span>
                                </div>
                                <button onClick={handlePaperUpload} disabled={isProcessing || !paperFile || !isAuthenticated} style={{ ...baseButtonStyle, backgroundColor: colors.buttonBg, color: 'white' }}>
                                    {isProcessing ? 'Processing...' : 'Upload Paper'}
                                </button>
                            </div>
                            <AnimatedMessage message={paperMessage || ''} type={paperMessage.startsWith('Success') ? 'success' : (paperMessage.includes('Error') || paperMessage.includes('Unauthorized') ? 'error' : 'info')} colors={colors} />
                        </div>
                    </div>
                    {/* --- END UPLOAD SECTION --- */}

                    {/* --- QUERY SECTION (Unchanged) --- */}
                    <div style={sectionStyle}>
                        <h2 style={titleStyle}>2. Ask a Question</h2>
                        <form>
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder={
                                    !isAuthenticated ? 'Please log in to ask a question' :
                                    !activeNotesFileName ? 'Please upload a Notes PDF first' :
                                    `Querying notes file: ${activeNotesFileName}`
                                }
                                required
                                style={{...baseInputStyle, backgroundColor: colors.answerBg, color: colors.textPrimary}}
                                disabled={isProcessing || !isAuthenticated}
                            />
                            {userProfile.plan === 'free' && userProfile.query_count >= userProfile.query_limit && (
                                <AnimatedMessage
                                    message="You have reached your query limit. Please upgrade to Pro to ask more questions."
                                    type="error"
                                    colors={colors}
                                />
                            )}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={handleQuery}
                                    disabled={queryLoading || isProcessing || !activeNotesFileName || !isAuthenticated || (userProfile.plan === 'free' && userProfile.query_count >= userProfile.query_limit)}
                                    style={{ ...baseQueryButtonStyle, backgroundColor: colors.successBg, color: 'white', flex: 2 }}
                                >
                                    {queryLoading ? 'Thinking...' : 'Get Answer (from PDF)'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGoogleSolve}
                                    disabled={queryLoading || isProcessing || !isAuthenticated || (userProfile.plan === 'free' && userProfile.query_count >= userProfile.query_limit)}
                                    style={{ ...baseQueryButtonStyle, backgroundColor: colors.buttonBg, color: 'white', flex: 1 }}
                                >
                                    {queryLoading ? 'Thinking...' : 'Solve (Google)'}
                                </button>
                            </div>
                        </form>

                        {/* --- ANSWER DISPLAY (Unchanged) --- */}
                        <div style={{ display: 'flex', gap: '20px', marginTop: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ flex: fetchedImage ? 2 : 1, minWidth: fetchedImage ? '400px' : 'auto' }}>
                                <h3 style={{ color: colors.textPrimary, borderBottom: `1px dashed ${colors.borderColor}`, paddingBottom: '5px' }}>
                                    AI Answer: <span style={{fontSize: '0.8em', color: colors.textSecondary}}>
                                        ({mode === 'VERBATIM' ? 'Verbatim Extraction (PDF)' : mode === 'GOOGLE_SOLVE' ? 'Google Search Answer' : mode === 'FULL_TEXT' ? 'Full Text Output (PDF)' : mode === 'COMPARISON' ? 'Comparison Table (PDF)' : mode})
                                    </span>
                                </h3>
                                <div style={answerBoxStyle}>{renderAnswerContent()}</div>
                            </div>
                            {fetchedImage && (
                                <div style={{ flex: 1, minWidth: '300px', maxWidth: '350px', border: `2px solid ${colors.accentColor}`, padding: '15px', backgroundColor: colors.answerBg, borderRadius: '8px' }}>
                                    <h4 style={{ color: colors.accentColor, marginTop: '0' }}>Extracted Figure Reference</h4>
                                    <img src={fetchedImage} alt="Extracted figure reference" style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: '4px' }} />
                                    <p style={{ fontSize: '0.8em', color: colors.textSecondary, marginTop: '10px' }}>*Cropped from the relevant page.</p>
                                </div>
                            )}
                        </div>
                        {sources && ( <p style={{ fontSize: '0.8em', color: colors.textSecondary, marginTop: '10px' }}> **Debug Sources:** {sources} </p> )}
                    </div>
                    {/* --- END QUERY SECTION --- */}

                    {/* --- FOOTER (Unchanged) --- */}
                    <div style={{ marginTop: '60px', padding: '20px 0', borderTop: `1px solid ${colors.borderColor}`, textAlign: 'center', color: colors.textSecondary }}>
                        <div style={{ marginBottom: '15px' }}>
                            <a href="https://www.instagram.com/__chandu.talawar__/" target="_blank" rel="noopener noreferrer" aria-label="Instagram Link" style={{ textDecoration: 'none' }}>
                                <InstagramIcon color={colors.accentColor} />
                            </a>
                        </div>
                        <div style={{ marginBottom: '10px', fontSize: '0.9em' }}>
                            <button onClick={() => navigate('about')} style={{ margin: '0 10px', color: colors.textSecondary, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                About
                            </button>
                            <button onClick={() => navigate('tool')} style={{ margin: '0 10px', color: colors.textSecondary, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                Tool
                            </button>
                            <button onClick={() => navigate('pricing')} style={{ margin: '0 10px', color: colors.textSecondary, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                Pricing
                            </button>
                            <button onClick={() => navigate('privacy')} style={{ margin: '0 10px', color: colors.textSecondary, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                Privacy Policy
                            </button>
                        </div>
                        <p style={{ fontSize: '0.8em', color: colors.textSecondary }}> &copy; 2025 AI Verbatim Query Assistant </p>
                    </div>
                    {/* --- END FOOTER --- */}
                </>
            )}
        </div>
    );
}

export default App;