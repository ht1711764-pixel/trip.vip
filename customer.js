// customer.js - Full Application Logic
import { 
    db, auth, googleProvider, 
    collection, doc, setDoc, getDoc, getDocs, 
    query, where, updateDoc, onSnapshot, 
    addDoc, orderBy, deleteDoc, limit,
    signInWithPopup, onAuthStateChanged, firebaseSignOut 
} from './firebase-init.js';

// ============================================================
//  GLOBALS
// ============================================================
let user = null;
let order = null;
let ratings = { service: 0, quality: 0, sales: 0 };
let feedInterval = null;
let unsubUser = null, unsubChat = null, unsubInjections = null, unsubNotifications = null;
let lang = localStorage.getItem('lang') || 'en';
let pendingInjections = [];
let lastSeenInterval = null;

const VIP_RATES = { 1: 0.005, 2: 0.007, 3: 0.008, 4: 0.010 };

// ============================================================
//  UTILITY FUNCTIONS
// ============================================================
function getVIP(userData) {
    if (userData?.manualVIPLevel && userData.manualVIPLevel > 0) return userData.manualVIPLevel;
    return 1;
}

function getRate(userData) {
    return VIP_RATES[getVIP(userData)] || 0.005;
}

function getVipClass(lv) {
    return lv === 1 ? 'vip-1' : lv === 2 ? 'vip-2' : lv === 3 ? 'vip-3' : 'vip-4';
}

function esc(s) {
    if (!s) return '';
    return s.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m] || m);
}

function getCache(key) {
    const cached = localStorage.getItem(key);
    if (cached) {
        try {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < 30000) return data.data;
        } catch (e) { /* ignore */ }
    }
    return null;
}

function setCache(key, data) {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

function toast(msg, err = false) {
    const el = document.createElement('div');
    el.className = `toast-msg${err ? ' error' : ''}`;
    el.innerHTML = `<i class="fas ${err ? 'fa-exclamation-triangle' : 'fa-circle-check'}"></i> ${msg}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

window.togglePw = function(id, btn) {
    const inp = document.getElementById(id);
    const icon = btn.querySelector('i');
    if (inp.type === 'password') {
        inp.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        inp.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

document.getElementById('loginToggle').onclick = function() {
    const inp = document.getElementById('loginPass');
    const icon = this.querySelector('i');
    if (inp.type === 'password') {
        inp.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        inp.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error fetching IP:', error);
        return null;
    }
}

function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.5) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round(height * maxWidth / width);
                        width = maxWidth;
                    } else {
                        width = Math.round(width * maxHeight / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================================
//  TRANSLATIONS
// ============================================================
const t = {
    en: {
        heroTitle: "Trip.com",
        heroSubtitle: "Travel & earn daily commissions.",
        s1: "Flights",
        s1d: "Worldwide",
        s2: "Hotels",
        s2d: "Luxury deals",
        s3: "Trains",
        s3d: "Premium",
        s4: "Tasks",
        s4d: "Earn up to 1%",
        loginBtn: "Login",
        registerBtn: "Register",
        aboutText: "About",
        backLogin: "Back",
        backReg: "Back",
        loginTagline: "Premium Task Ecosystem",
        forgotText: "Forgot Password?",
        regTitle: "Create Account",
        regNow: "Register Now",
        haveAccount: "Have account?",
        welcome: "Welcome",
        vipLabel: "VIP",
        balanceLabel: "Account Balance",
        rateLabel: "Rate",
        todayLabel: "Today",
        todayEarnLabel: "Today's Earnings",
        yesterdayLabel: "Yesterday",
        totalCommLabel: "Total Commission",
        rechargeText: "Recharge",
        withdrawText: "Withdraw",
        refLabel: "Referral Code",
        liveLabel: "Live Updates",
        exitText: "Exit",
        workTitle: "Tasks",
        progressLabel: "Task Progress",
        startOrder: "Start Order",
        orderTitle: "History",
        profileTitle: "Profile",
        creditLabel: "Credit",
        totalAssets: "Total Assets",
        todayOrders: "Today's Orders",
        todayEarnings: "Today's Earnings",
        totalCommission: "Total Commission",
        depositText: "Deposit",
        withdrawProfileText: "Withdraw",
        bindWallet: "Bind Wallet",
        personalDetails: "Personal Details",
        loanService: "Loan Service",
        rechargeHist: "Recharge History",
        withdrawHist: "Withdraw History",
        walletLabel: "Wallet",
        langLabel: "Language",
        signOut: "Sign Out",
        serviceTitle: "Support",
        sendText: "Send",
        navHome: "Home",
        navWork: "Work",
        navOrders: "Orders",
        navProfile: "Profile",
        navService: "Service",
        orderAmount: "Order Amount",
        profitEarned: "Profit",
        afterBalance: "After Balance",
        serviceQuality: "Service Quality",
        productQuality: "Product Quality",
        salesExperience: "Sales Experience",
        submitComplete: "Submit & Complete",
        processing: "Processing...",
        insufficient: "Insufficient Balance!",
        yourBalance: "Your Balance",
        needAdditional: "Need Additional",
        rechargeNow: "Recharge Now",
        close: "Close",
        submit: "Submit",
        cancel: "Cancel",
        uploadReceipt: "Upload receipt",
        enterAmount: "Enter valid amount",
        noRecords: "No records.",
        companyTitle: "About Trip.com",
        mission: "Our Mission",
        vision: "Our Vision",
        pendingOrder: "Pending Order!",
        pendingMsg: "Complete your current order first.",
        okay: "Okay",
        warning: "Warning",
        completed: "Completed",
        walletAddr: "USDT TRC20 Address",
        copy: "Copy",
        uploadPhoto: "Upload Photo",
        save: "Save",
        bonusOrder: "BONUS ORDER!",
        injectionMsg: "Special commission order from admin!",
        referralEarned: "Referral Bonus Earned!",
        rechargeWaiting: "Please wait, we are checking your payment."
    }
};

function applyLang(l) {
    lang = l;
    localStorage.setItem('lang', l);
    const d = t[l] || t.en;
    document.querySelectorAll('.lang-opt').forEach(el => {
        el.classList.toggle('active', el.dataset.lang === l);
    });
    const map = {
        heroTitle: d.heroTitle,
        heroSubtitle: d.heroSubtitle,
        s1: d.s1,
        s1d: d.s1d,
        s2: d.s2,
        s2d: d.s2d,
        s3: d.s3,
        s3d: d.s3d,
        s4: d.s4,
        s4d: d.s4d,
        loginBtn: d.loginBtn,
        registerBtn: d.registerBtn,
        aboutText: d.aboutText,
        backLogin: d.backLogin,
        backReg: d.backReg,
        loginTagline: d.loginTagline,
        forgotText: d.forgotText,
        regTitle: d.regTitle,
        regNow: d.regNow,
        haveAccount: d.haveAccount,
        welcome: d.welcome,
        vipLabel: d.vipLabel,
        balanceLabel: d.balanceLabel,
        rateLabel: d.rateLabel,
        todayLabel: d.todayLabel,
        todayEarnLabel: d.todayEarnLabel,
        yesterdayLabel: d.yesterdayLabel,
        totalCommLabel: d.totalCommLabel,
        rechargeText: d.rechargeText,
        withdrawText: d.withdrawText,
        refLabel: d.refLabel,
        liveLabel: d.liveLabel,
        exitText: d.exitText,
        workTitle: d.workTitle,
        progressLabel: d.progressLabel,
        startOrder: d.startOrder,
        orderTitle: d.orderTitle,
        profileTitle: d.profileTitle,
        creditLabel: d.creditLabel,
        totalAssets: d.totalAssets,
        todayOrders: d.todayOrders,
        todayEarnings: d.todayEarnings,
        totalCommission: d.totalCommission,
        depositText: d.depositText,
        withdrawProfileText: d.withdrawProfileText,
        bindWallet: d.bindWallet,
        personalDetails: d.personalDetails,
        loanService: d.loanService,
        rechargeHist: d.rechargeHist,
        withdrawHist: d.withdrawHist,
        walletLabel: d.walletLabel,
        langLabel: d.langLabel,
        signOut: d.signOut,
        serviceTitle: d.serviceTitle,
        sendText: d.sendText,
        navHome: d.navHome,
        navWork: d.navWork,
        navOrders: d.navOrders,
        navProfile: d.navProfile,
        navService: d.navService,
        orderAmount: d.orderAmount,
        profitEarned: d.profitEarned,
        afterBalance: d.afterBalance,
        serviceQuality: d.serviceQuality,
        productQuality: d.productQuality,
        salesExperience: d.salesExperience,
        submitComplete: d.submitComplete,
        processing: d.processing,
        insufficient: d.insufficient,
        yourBalance: d.yourBalance,
        needAdditional: d.needAdditional,
        rechargeNow: d.rechargeNow,
        close: d.close,
        submit: d.submit,
        cancel: d.cancel,
        uploadReceipt: d.uploadReceipt,
        enterAmount: d.enterAmount,
        noRecords: d.noRecords
    };
    for (const [id, val] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    }
    if (user) updateUI();
}

// ============================================================
//  AUTH FUNCTIONS
// ============================================================
async function handleGoogleLogin() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const gUser = result.user;
        const email = gUser.email;
        const username = email.split('@')[0];

        const userRef = doc(db, "users", gUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            user = { id: gUser.uid, ...userSnap.data() };
            toast(`Welcome back, ${user.username}`);
        } else {
            const ip = await getClientIP();
            const newUser = {
                id: gUser.uid,
                username: username,
                email: email,
                phone: '',
                password: '',
                withdrawPassword: '',
                balance: 0,
                invitationCode: 'GGL' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                superior: null,
                referralEarnings: 0,
                regTime: new Date().toISOString(),
                tasks: { completed: 0, total: 0 },
                orders: [],
                todayOrders: 0,
                todayEarnings: 0,
                totalCommission: 0,
                creditScore: 100,
                disabled: false,
                walletAddress: null,
                currentOrderObj: null,
                role: 'customer',
                lastSeen: Date.now(),
                authProvider: 'google',
                regIP: ip
            };
            await setDoc(userRef, newUser);
            user = { id: gUser.uid, ...newUser };
            toast(`Welcome, ${username}! Account created.`);
        }
        await finalizeLogin(user);
    } catch (error) {
        console.error("Google Login Error:", error);
        toast("Google Login failed: " + error.message, true);
    }
}

async function finalizeLogin(u) {
    if (!u.orders) u.orders = [];
    if (!u.tasks) u.tasks = { completed: 0, total: 0 };
    await saveUser();
    subscribeUser(u.id);
    subscribeInjections(u.id);
    subscribeChat();
    subscribeNotifications();
    startLastSeenUpdate();
    updateUI();
    const last = localStorage.getItem('lastPage');
    showPage(last && !['landing', 'login', 'register'].includes(last) ? last : 'home');
}

async function saveUser() {
    if (!user) return;
    const clean = { ...user };
    delete clean.orders;
    delete clean.pendingInjections;
    await setDoc(doc(db, "users", user.id), clean, { merge: true });
    localStorage.setItem('uid', user.id);
    await updateDoc(doc(db, "users", user.id), { lastSeen: Date.now() });
}

function startLastSeenUpdate() {
    if (lastSeenInterval) clearInterval(lastSeenInterval);
    lastSeenInterval = setInterval(async () => {
        if (user) {
            try {
                await updateDoc(doc(db, "users", user.id), { lastSeen: Date.now() });
            } catch (e) { /* silent */ }
        }
    }, 60000);
}

// ============================================================
//  SUBSCRIPTIONS
// ============================================================
function subscribeUser(uid) {
    if (unsubUser) unsubUser();
    unsubUser = onSnapshot(doc(db, "users", uid), async (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            user = { id: snap.id, ...data };
            if (!user.orders) user.orders = [];
            if (!user.tasks) user.tasks = { completed: 0, total: 0 };
            const injSnap = await getDocs(query(collection(db, "injections"), where("userId", "==", uid), where("used", "==", false)));
            pendingInjections = [];
            injSnap.forEach(d => pendingInjections.push({ id: d.id, ...d.data() }));
            if (pendingInjections.length) {
                pendingInjections.sort((a, b) => a.taskNumber - b.taskNumber);
                user.pendingInjections = pendingInjections;
                await saveUser();
            }
            updateUI();
            const indicator = document.getElementById('liveIndicator');
            indicator.style.display = 'flex';
            setTimeout(() => { indicator.style.display = 'none'; }, 1500);
        }
    });
}

function subscribeInjections(userId) {
    if (unsubInjections) unsubInjections();
    const q = query(collection(db, "injections"), where("userId", "==", userId), where("used", "==", false));
    unsubInjections = onSnapshot(q, async (snap) => {
        const injs = [];
        snap.forEach(d => injs.push({ id: d.id, ...d.data() }));
        if (injs.length > 0 && user) {
            injs.sort((a, b) => a.taskNumber - b.taskNumber);
            user.pendingInjections = injs;
            pendingInjections = injs;
            await saveUser();
            const d = t[lang] || t.en;
            toast(`✨ ${d.bonusOrder} ${d.injectionMsg}`);
            if (document.getElementById('pageWork').classList.contains('active-page')) refreshWork();
        }
    });
}

function subscribeChat() {
    if (unsubChat) unsubChat();
    const q = query(collection(db, "chatMessages"), orderBy("id", "asc"));
    unsubChat = onSnapshot(q, (snap) => {
        const isServicePage = document.getElementById('pageService').classList.contains('active-page');
        if (!isServicePage) return;

        const container = document.getElementById('chatMessages');
        if (!container || !user) return;

        const msgs = [];
        snap.forEach(d => {
            const m = d.data();
            if (m.type !== 'notification' && ((m.from === user.username && m.to === 'admin') || (m.from === 'admin' && m.to === user.username))) {
                msgs.push(m);
            }
        });
        msgs.sort((a, b) => a.id - b.id);

        container.innerHTML = msgs.length ? msgs.map(m => {
            const isSent = m.from === user.username;
            const msgTime = m.time ? new Date(m.time).toLocaleString([], { hour12: false }) : '';
            return `
                    <div class="chat-msg ${isSent ? 'sent' : 'received'}">
                        <div>${esc(m.text || '')}</div>
                        ${m.image ? `<img src="${m.image}" onclick="window.open(this.src)">` : ''}
                        <div class="time">${msgTime}</div>
                    </div>
                `;
        }).join('') : '<div style="text-align:center;padding:10px;color:var(--muted);">No messages yet</div>';

        container.scrollTop = container.scrollHeight;
    });
}

function subscribeNotifications() {
    if (unsubNotifications) unsubNotifications();
    if (!user) return;

    const q = query(collection(db, "chatMessages"),
        where("from", "==", "admin"),
        where("to", "==", user.username),
        where("type", "==", "notification"),
        orderBy("id", "asc")
    );

    unsubNotifications = onSnapshot(q, (snap) => {
        let newCount = 0;
        const msgs = [];
        snap.forEach(d => {
            const m = d.data();
            if (!m.read) {
                newCount++;
            }
            msgs.push(m);
        });

        const badge = document.getElementById('notifBadge');
        if (newCount > 0) {
            badge.innerText = newCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }

        window.__unreadAdminMessages = msgs.filter(m => !m.read);
    });
}

// ============================================================
//  NOTIFICATION BELL
// ============================================================
document.getElementById('notificationBtn').onclick = async () => {
    if (!user) return;
    const d = t[lang] || t.en;
    const msgs = window.__unreadAdminMessages || [];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    let html = `
            <div class="modal-box">
                <div class="modal-title"><i class="fas fa-bell" style="color:var(--gold);"></i> Admin Notifications</div>
        `;
    if (msgs.length === 0) {
        html += `<p style="color:var(--muted);text-align:center;padding:12px;">No new messages</p>`;
    } else {
        msgs.sort((a, b) => a.id - b.id);
        msgs.forEach(m => {
            const text = m.text || '';
            const parts = text.split('\n\n');
            const title = parts.length > 1 ? parts[0].replace('[NOTIFICATION] ', '') : 'Notification';
            const body = parts.length > 1 ? parts.slice(1).join('\n\n') : text.replace('[NOTIFICATION] ', '');

            html += `
                    <div class="chat-msg received" style="max-width:100%;margin-bottom:6px;background:#e8f5e9;border-color:var(--secondary);">
                        <div><strong style="color:var(--secondary);">${esc(title)}</strong></div>
                        <div style="white-space:pre-wrap;">${esc(body)}</div>
                        <div class="time">${m.time ? new Date(m.time).toLocaleString([], { hour12: false }) : ''}</div>
                    </div>
                `;
        });
    }
    html += `
            <button class="btn-primary" id="notifCloseBtn">${d.close}</button>
            </div>
        `;
    modal.innerHTML = html;
    document.body.appendChild(modal);

    modal.querySelector('#notifCloseBtn').onclick = async () => {
        document.body.removeChild(modal);
        if (msgs.length > 0) {
            for (let m of msgs) {
                const snap = await getDocs(query(collection(db, "chatMessages"), where("id", "==", m.id)));
                snap.forEach(d => {
                    updateDoc(doc(db, "chatMessages", d.id), { read: true });
                });
            }
            document.getElementById('notifBadge').style.display = 'none';
            window.__unreadAdminMessages = [];
        }
    };
};

// ============================================================
//  CHAT FUNCTIONS
// ============================================================
async function sendChat(text, img = null) {
    if (!user) return;
    await setDoc(doc(db, "chatMessages", (Date.now() + Math.random()).toString()), {
        id: Date.now() + Math.random(),
        from: user.username,
        to: 'admin',
        text: text || '',
        image: img,
        time: new Date().toISOString(),
        read: false,
        type: 'message'
    });
}

// ============================================================
//  NAVIGATION
// ============================================================
const pages = {
    landing: document.getElementById('pageLanding'),
    login: document.getElementById('pageLogin'),
    register: document.getElementById('pageRegister'),
    home: document.getElementById('pageHome'),
    work: document.getElementById('pageWork'),
    orders: document.getElementById('pageOrders'),
    profile: document.getElementById('pageProfile'),
    service: document.getElementById('pageService')
};
const bottomNav = document.getElementById('bottomNav');

function showPage(name) {
    if (!user && !['landing', 'login', 'register'].includes(name)) name = 'landing';
    Object.keys(pages).forEach(k => pages[k].classList.remove('active-page'));
    if (pages[name]) pages[name].classList.add('active-page');
    if (['landing', 'login', 'register'].includes(name)) bottomNav.classList.add('hidden-nav');
    else bottomNav.classList.remove('hidden-nav');
    if (!['landing', 'login', 'register'].includes(name)) localStorage.setItem('lastPage', name);
    if (name === 'home' || name === 'profile') updateUI();
    if (name === 'work') { updateUI();
        refreshWork(); }
    if (name === 'orders') updateUI();
    if (name === 'service') {
        if (unsubChat) unsubChat();
        subscribeChat();
    }
    startFeed();
}

document.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = () => {
        if (!user) { showPage('landing'); return; }
        document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        showPage(el.dataset.page);
    };
});

// ============================================================
//  UI UPDATE
// ============================================================
async function updateUI() {
    if (!user) return;
    const d = t[lang] || t.en;
    const orders = await getOrders(user.id);
    const balance = user.balance || 0;
    const vip = getVIP(user);
    const rate = getRate(user);
    const limit = user.tasks?.total || 0;
    const done = user.tasks?.completed || 0;
    const vipClass = getVipClass(vip);

    document.getElementById('homeName').innerText = user.username;
    document.getElementById('balanceAmount').innerText = `$ ${balance.toFixed(2)}`;
    document.getElementById('todayCount').innerText = done;
    document.getElementById('dailyMax').innerText = limit;
    document.getElementById('todayEarn').innerText = `$ ${(user.todayEarnings || 0).toFixed(4)}`;
    document.getElementById('totalComm').innerText = `$ ${(user.totalCommission || 0).toFixed(4)}`;
    document.getElementById('commRate').innerText = `${(rate * 100).toFixed(1)}%`;
    document.getElementById('homeVip').innerHTML = `<span class="${vipClass}">VIP ${vip}</span>`;
    document.getElementById('refCode').innerText = user.invitationCode || '------';
    document.getElementById('profileName').innerText = user.username;
    document.getElementById('profileVip').innerHTML = `<span class="${vipClass}">VIP ${vip}</span>`;
    document.getElementById('creditScore').innerText = user.creditScore || 100;
    document.getElementById('pTotalAssets').innerText = `$ ${balance.toFixed(2)}`;
    document.getElementById('pTodayOrders').innerText = done;
    document.getElementById('pTodayEarn').innerText = `$ ${(user.todayEarnings || 0).toFixed(4)}`;
    document.getElementById('pTotalComm').innerText = `$ ${(user.totalCommission || 0).toFixed(4)}`;
    document.getElementById('walletDisplay').innerText = user.walletAddress || 'Not set';
    document.getElementById('taskCounter').innerText = `${done}/${limit}`;
    document.getElementById('taskFill').style.width = limit ? `${(done / limit) * 100}%` : '0%';

    const av = document.getElementById('profileAvatar');
    if (av) {
        av.innerHTML = user.profilePhoto ? `<img src="${user.profilePhoto}" style="width:100%;height:100%;object-fit:cover;">` :
            '<i class="fas fa-user-circle" style="font-size:40px;color:#fff;"></i>';
    }

    const completed = orders.filter(o => o.status === 'completed');
    document.getElementById('ordersList').innerHTML = completed.length ? completed.slice(0, 20).map(o => `
            <div class="card">
                <div class="flex"><strong style="font-size:14px;">${o.name}</strong><span style="color:var(--secondary);font-size:11px;">${d.completed}</span></div>
                <div style="font-size:13px;">Amount: $ ${o.amount?.toFixed(2) || 0} | Profit: +$ ${(o.profit || 0).toFixed(4)}</div>
                <div style="font-size:11px;color:var(--muted);">${o.date || new Date(o.timestamp).toLocaleString()}</div>
            </div>
        `).join('') :
        `<div class="card"><div style="color:var(--muted);text-align:center;padding:12px;">${d.noRecords}</div></div>`;
}

// ============================================================
//  ORDERS FUNCTIONS
// ============================================================
async function getOrders(userId) {
    const cacheKey = `orders_${userId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;
    const snap = await getDocs(query(collection(db, "users", userId, "orders"), orderBy("timestamp", "desc"), limit(50)));
    const orders = [];
    snap.forEach(d => orders.push({ id: d.id, ...d.data() }));
    setCache(cacheKey, orders);
    return orders;
}

async function saveOrder(userId, data) {
    await addDoc(collection(db, "users", userId, "orders"), { ...data, timestamp: new Date().toISOString() });
}

async function loadCustomOrders() {
    const cached = getCache('customOrders');
    if (cached) return cached;
    const snap = await getDocs(collection(db, "customOrders"));
    const orders = [];
    snap.forEach(d => orders.push({ id: d.id, ...d.data() }));
    setCache('customOrders', orders);
    return orders;
}

async function markUsed(id) {
    await updateDoc(doc(db, "injections", id), { used: true, usedAt: new Date().toISOString() });
}

// ============================================================
//  ORDER DISPLAY
// ============================================================
async function displayOrder(o) {
    const d = t[lang] || t.en;
    const container = document.getElementById('orderDisplay');
    if (!container) return;
    const img = o.imageData ? `<img src="${o.imageData}" style="width:100%;height:100%;object-fit:contain;">` :
        '<i class="fas fa-box" style="font-size:32px;color:var(--secondary);"></i>';
    const isInj = o.isInjection || false;
    const after = (user.balance || 0) + o.netCommission;
    const insufficient = (user.balance || 0) < o.amount;
    const badge = isInj ? '<span class="injection-badge"><i class="fas fa-gift"></i> ' + d.bonusOrder + '</span>' : '';
    let injHtml = '';
    if (isInj && o.injectionDetails) {
        injHtml = `
                <div style="background:rgba(245,158,11,0.04);border-radius:12px;padding:8px;margin:8px 0;font-size:13px;">
                    <div class="flex"><span style="color:var(--muted);">Original:</span><span class="text-gold">$ ${o.injectionDetails.originalBalance.toFixed(2)}</span></div>
                    <div class="flex"><span style="color:var(--muted);">Added:</span><span class="text-gold">+ $ ${o.injectionDetails.extraAmount.toFixed(2)}</span></div>
                    <div class="flex"><span style="color:var(--muted);">Total:</span><span style="color:var(--secondary);font-weight:700;">$ ${o.amount.toFixed(2)}</span></div>
                    <div class="flex"><span style="color:var(--muted);">Commission:</span><span class="text-gold" style="font-size:16px;">+ $ ${o.netCommission.toFixed(4)}</span></div>
                </div>
            `;
    }
    container.innerHTML = `
            <div class="order-card ${isInj ? 'injection' : ''}">
                ${badge}
                <div class="order-img">${img}</div>
                <h3 style="color:var(--primary);font-size:17px;">${o.name}</h3>
                <div style="font-size:12px;color:var(--muted);">#${o.orderNumber}</div>
                ${injHtml}
                ${!injHtml ? `
                    <div class="flex" style="font-size:13px;"><span style="color:var(--muted);">${d.orderAmount}</span><span style="color:var(--secondary);font-weight:700;">$ ${o.amount.toFixed(2)}</span></div>
                    <div class="flex" style="font-size:13px;"><span style="color:var(--muted);">Commission (${o.rate.toFixed(2)}%)</span><span class="text-gold">+ $ ${o.netCommission.toFixed(4)}</span></div>
                ` : ''}
                <div class="flex" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:13px;">
                    <span style="color:var(--muted);">${d.afterBalance}</span>
                    <strong style="color:var(--secondary);font-size:16px;">$ ${after.toFixed(2)}</strong>
                </div>
                ${!insufficient ? `
                    <div style="margin-top:10px;">
                        <div style="color:var(--secondary);font-size:12px;">${d.serviceQuality}</div>
                        <div class="stars" data-cat="service"><i data-v="1" class="far fa-star"></i><i data-v="2" class="far fa-star"></i><i data-v="3" class="far fa-star"></i><i data-v="4" class="far fa-star"></i><i data-v="5" class="far fa-star"></i></div>
                    </div>
                    <div style="margin-top:6px;">
                        <div style="color:var(--secondary);font-size:12px;">${d.productQuality}</div>
                        <div class="stars" data-cat="quality"><i data-v="1" class="far fa-star"></i><i data-v="2" class="far fa-star"></i><i data-v="3" class="far fa-star"></i><i data-v="4" class="far fa-star"></i><i data-v="5" class="far fa-star"></i></div>
                    </div>
                    <div style="margin-top:6px;">
                        <div style="color:var(--secondary);font-size:12px;">${d.salesExperience}</div>
                        <div class="stars" data-cat="sales"><i data-v="1" class="far fa-star"></i><i data-v="2" class="far fa-star"></i><i data-v="3" class="far fa-star"></i><i data-v="4" class="far fa-star"></i><i data-v="5" class="far fa-star"></i></div>
                    </div>
                    <button class="btn-primary" id="submitOrderBtn" style="margin-top:10px;font-size:14px;">${d.submitComplete}</button>
                ` : `
                    <div style="margin-top:10px;padding:12px;background:rgba(220,38,38,0.04);border-radius:12px;border:1px solid rgba(220,38,38,0.08);">
                        <strong style="color:#dc2626;font-size:14px;">${d.insufficient}</strong>
                        <div style="font-size:13px;margin-top:4px;">
                            <div>💰 ${d.orderAmount}: $ ${o.amount.toFixed(2)}</div>
                            <div>💵 ${d.yourBalance}: $ ${(user.balance || 0).toFixed(2)}</div>
                            <div>🔴 ${d.needAdditional}: $ ${(o.amount - (user.balance || 0)).toFixed(2)}</div>
                        </div>
                        <button class="btn-primary" id="rechargeFromOrder" style="margin-top:8px;background:#10b981;color:#fff;font-size:13px;">${d.rechargeNow}</button>
                    </div>
                `}
            </div>
        `;
    order = o;
    ratings = { service: 0, quality: 0, sales: 0 };

    if (!insufficient) {
        container.querySelectorAll('.stars').forEach(el => {
            const cat = el.dataset.cat;
            const stars = el.querySelectorAll('i');
            stars.forEach(s => {
                s.onclick = function() {
                    const val = parseInt(this.dataset.v);
                    ratings[cat] = val;
                    stars.forEach((st, i) => {
                        st.className = i < val ? 'fas fa-star active' : 'far fa-star';
                    });
                };
            });
        });
        const submitBtn = document.getElementById('submitOrderBtn');
        if (submitBtn) {
            submitBtn.onclick = async function() {
                if (this.disabled) return;
                if (ratings.service === 0 || ratings.quality === 0 || ratings.sales === 0) {
                    toast("Please provide all ratings.", true);
                    return;
                }
                this.disabled = true;
                this.innerHTML = `<i class="fas fa-spinner fa-pulse"></i> ${d.processing}`;
                try {
                    const profit = order.netCommission;
                    if (!user.tasks) user.tasks = { completed: 0, total: 0 };
                    user.balance = (user.balance || 0) + profit;
                    user.todayEarnings = (user.todayEarnings || 0) + profit;
                    user.totalCommission = (user.totalCommission || 0) + profit;
                    user.tasks.completed = (user.tasks.completed || 0) + 1;
                    order.status = 'completed';
                    order.ratings = { ...ratings };
                    order.date = new Date().toLocaleString();
                    order.profit = profit;
                    await saveOrder(user.id, order);
                    user.currentOrderObj = null;
                    await saveUser();
                    order = null;
                    updateUI();
                    toast(`✅ +$ ${profit.toFixed(4)}`);
                    const limit = user.tasks.total || 0;
                    const done = user.tasks.completed || 0;
                    if (done >= limit && limit > 0) {
                        document.getElementById('orderDisplay').innerHTML = '';
                    } else {
                        await loadNextOrder();
                    }
                } catch (e) {
                    console.error(e);
                    toast("Error: " + e.message, true);
                }
                this.disabled = false;
                this.innerHTML = d.submitComplete;
            };
        }
    } else {
        const rb = document.getElementById('rechargeFromOrder');
        if (rb) rb.onclick = () => showRechargeModal();
    }
}

async function loadNextOrder() {
    const limit = user.tasks?.total || 0;
    const done = user.tasks?.completed || 0;
    if (done >= limit && limit > 0) {
        document.getElementById('orderDisplay').innerHTML = '';
        return;
    }
    const settings = await getDoc(doc(db, "systemSettings", "main"));
    const minBal = settings.exists() ? (settings.data().minBalanceForOrder || 10) : 10;
    if ((user.balance || 0) < minBal) {
        document.getElementById('orderDisplay').innerHTML =
            `<div class="card" style="border-color:#f59e0b;text-align:center;padding:16px;"><span style="color:#f59e0b;">⚠️ Insufficient balance. Please recharge.</span></div>`;
        return;
    }
    const nextTask = (user.tasks?.completed || 0) + 1;
    let inj = null;
    if (pendingInjections.length > 0) {
        inj = pendingInjections.find(i => i.taskNumber === nextTask);
        if (inj && !inj.used) {
            await markUsed(inj.id);
            pendingInjections = pendingInjections.filter(i => i.id !== inj.id);
            user.pendingInjections = pendingInjections;
            await saveUser();
        } else inj = null;
    }
    const templates = await loadCustomOrders();
    const tpl = templates.length ? templates[Math.floor(Math.random() * templates.length)] : { name: 'Default Order',
        image: null, price: 10 };
    const balance = user.balance || 0;
    const rate = getRate(user);
    let amount, net, isInj = false;
    if (inj) {
        amount = balance + (inj.extraAmount || 0);
        net = inj.commission > 0 ? inj.commission : (inj.commissionRate > 0 ? amount * (inj.commissionRate / 100) : amount *
            rate);
        isInj = true;
        const d = t[lang] || t.en;
        toast(`🎉 ${d.bonusOrder} ${d.injectionMsg}`);
    } else {
        const pct = 0.53 + Math.random() * 0.26;
        amount = parseFloat((balance * pct).toFixed(2));
        const gross = balance * rate;
        net = gross - (gross * 0.01);
    }
    const newOrder = {
        id: Date.now(),
        name: inj ? (inj.orderName || tpl.name) : tpl.name,
        imageData: inj?.imageData || tpl.image || null,
        amount: amount,
        netCommission: net,
        rate: inj?.commissionRate || (rate * 100),
        orderNumber: 'ORD' + Math.floor(Math.random() * 1e9),
        profit: net,
        isInjection: isInj,
        injectionDetails: isInj ? { extraAmount: inj?.extraAmount || 0, customCommission: net, originalBalance: balance,
            injectionId: inj?.id } : null
    };
    user.currentOrderObj = newOrder;
    await saveUser();
    displayOrder(newOrder);
}

function refreshWork() {
    if (!user) return;
    const limit = user.tasks?.total || 0;
    const done = user.tasks?.completed || 0;
    if (done >= limit && limit > 0) {
        document.getElementById('orderDisplay').innerHTML = '';
        return;
    }
    if (user.currentOrderObj && !user.currentOrderObj.completed) {
        displayOrder(user.currentOrderObj);
    } else if (order) {
        displayOrder(order);
    } else {
        if (done < limit && limit > 0) loadNextOrder();
    }
}

// ============================================================
//  RECHARGE MODAL
// ============================================================
function showRechargeModal() {
    const d = t[lang] || t.en;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-title"><i class="fas fa-plus-circle"></i> ${d.rechargeText}</div>
                <div class="wallet-box">
                    <div><div style="color:var(--muted);font-size:11px;">${d.walletAddr}</div><div class="addr" id="walletAddrDisplay">TCfRPvLHWkRCpaqyVkF2xaHTzqsrVr9oMf</div></div>
                    <button class="copy-btn" id="copyWalletBtn">${d.copy}</button>
                </div>
                <input type="number" class="input-glass" id="rechargeAmt" placeholder="Amount (USDT)" value="100">
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;">
                    <button class="btn-primary btn-sm" style="width:auto;flex:1;background:var(--bg);color:var(--text);border:1px solid var(--border);" data-amt="500">500</button>
                    <button class="btn-primary btn-sm" style="width:auto;flex:1;background:var(--bg);color:var(--text);border:1px solid var(--border);" data-amt="1000">1000</button>
                    <button class="btn-primary btn-sm" style="width:auto;flex:1;background:var(--bg);color:var(--text);border:1px solid var(--border);" data-amt="1500">1500</button>
                    <button class="btn-primary btn-sm" style="width:auto;flex:1;background:var(--bg);color:var(--text);border:1px solid var(--border);" data-amt="2000">2000</button>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;">
                    <div class="upload-area" style="padding:12px;flex:1;" id="receiptArea"><i class="fas fa-cloud-upload-alt"></i> ${d.uploadReceipt}<input type="file" id="receiptInput" accept="image/*" style="display:none;"></div>
                </div>
                <div id="receiptPreview" style="text-align:center;margin:6px 0;"></div>
                <button class="btn-primary" id="rechargeSubmitBtn">${d.submit}</button>
                <button class="btn-primary btn-outline" id="rechargeCancelBtn" style="margin-top:8px;">${d.cancel}</button>
                <div id="rechargeMsg" style="text-align:center;margin-top:6px;font-size:13px;"></div>
            </div>
        `;
    document.body.appendChild(modal);

    modal.querySelector("#copyWalletBtn").onclick = () => {
        navigator.clipboard.writeText('TCfRPvLHWkRCpaqyVkF2xaHTzqsrVr9oMf');
        toast("Copied!");
    };

    modal.querySelectorAll('[data-amt]').forEach(btn => {
        btn.onclick = function() {
            modal.querySelector("#rechargeAmt").value = this.dataset.amt;
            modal.querySelectorAll('[data-amt]').forEach(b => b.style.borderColor = 'var(--border)');
            this.style.borderColor = 'var(--secondary)';
        };
    });

    let receiptData = null;
    modal.querySelector("#receiptArea").onclick = () => modal.querySelector("#receiptInput").click();
    modal.querySelector("#receiptInput").onchange = async (e) => {
        if (e.target.files[0]) {
            receiptData = await compressImage(e.target.files[0], 600, 600, 0.6);
            const preview = modal.querySelector("#receiptPreview");
            preview.innerHTML = `<img src="${receiptData}" style="max-width:100%;max-height:200px;border-radius:10px;border:2px solid var(--secondary);">`;
            preview.style.display = 'block';
        }
    };

    modal.querySelector("#rechargeSubmitBtn").onclick = async () => {
        const amt = parseFloat(modal.querySelector("#rechargeAmt").value);
        if (isNaN(amt) || amt < 1) {
            modal.querySelector("#rechargeMsg").innerHTML = `<span style="color:#dc2626;">${d.enterAmount}</span>`;
            return;
        }
        if (!receiptData) {
            modal.querySelector("#rechargeMsg").innerHTML = `<span style="color:#dc2626;">${d.uploadReceipt}</span>`;
            return;
        }
        modal.querySelector("#rechargeMsg").innerHTML =
            `<span style="color:#f59e0b;"><i class="fas fa-clock"></i> ${d.rechargeWaiting}</span>`;
        modal.querySelector("#rechargeSubmitBtn").disabled = true;

        await setDoc(doc(db, "rechargeRequests", Date.now().toString()), {
            id: Date.now().toString(),
            userId: user.id,
            userName: user.username,
            amount: amt,
            receiptImage: receiptData,
            status: 'pending',
            timestamp: new Date().toISOString()
        });

        setTimeout(() => {
            document.body.removeChild(modal);
            toast(d.rechargeWaiting || "Please wait, we are checking your payment.");
        }, 800);
    };

    modal.querySelector("#rechargeCancelBtn").onclick = () => document.body.removeChild(modal);
}

// ============================================================
//  WITHDRAW MODAL
// ============================================================
function showWithdrawModal() {
    const d = t[lang] || t.en;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-title"><i class="fas fa-minus-circle"></i> ${d.withdrawText}</div>
                <input type="text" class="input-glass" id="withdrawWallet" placeholder="USDT TRC20 Address">
                <input type="number" class="input-glass" id="withdrawAmt" placeholder="Amount" step="0.01">
                <button class="btn-primary" id="withdrawSubmitBtn">${d.submit}</button>
                <button class="btn-primary btn-outline" id="withdrawCancelBtn" style="margin-top:8px;">${d.cancel}</button>
                <div id="withdrawMsg" style="text-align:center;margin-top:6px;font-size:13px;"></div>
            </div>
        `;
    document.body.appendChild(modal);
    modal.querySelector("#withdrawSubmitBtn").onclick = async () => {
        const wallet = modal.querySelector("#withdrawWallet").value.trim();
        const amt = parseFloat(modal.querySelector("#withdrawAmt").value);
        if (!wallet) { modal.querySelector("#withdrawMsg").innerHTML = '<span style="color:#dc2626;">Enter wallet address.</span>';
            return; }
        if (isNaN(amt) || amt < 1) { modal.querySelector("#withdrawMsg").innerHTML =
            '<span style="color:#dc2626;">Enter valid amount.</span>'; return; }
        if (amt > (user.balance || 0)) { modal.querySelector("#withdrawMsg").innerHTML =
            '<span style="color:#dc2626;">Insufficient balance.</span>'; return; }
        user.balance -= amt;
        await saveUser();
        updateUI();
        await setDoc(doc(db, "withdrawRequests", Date.now().toString()), {
            id: Date.now().toString(),
            userId: user.id,
            userName: user.username,
            amount: amt,
            walletAddress: wallet,
            status: 'pending',
            timestamp: new Date().toISOString()
        });
        document.body.removeChild(modal);
        toast("Withdraw submitted!");
    };
    modal.querySelector("#withdrawCancelBtn").onclick = () => document.body.removeChild(modal);
}

// ============================================================
//  HISTORY
// ============================================================
function showHistory(title, items, type) {
    const d = t[lang] || t.en;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    let html = `<div class="modal-box"><div class="modal-title"><i class="fas fa-history"></i> ${title}</div>`;
    if (items.length === 0) html += `<p style="color:var(--muted);text-align:center;padding:16px;">${d.noRecords}</p>`;
    else items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(item => {
        html += `<div class="history-item"><div class="flex"><strong style="font-size:13px;">${type === 'recharge' ? 'Recharge' : 'Withdraw'}</strong><span style="color:${item.status === 'pending' ? '#f59e0b' : item.status === 'approved' ? '#10b981' : '#dc2626'};font-size:11px;">${item.status.toUpperCase()}</span></div><div style="font-size:13px;">Amount: $ ${item.amount}</div><div style="font-size:11px;color:var(--muted);">${new Date(item.timestamp).toLocaleString()}</div>${item.receiptImage ? `<img src="${item.receiptImage}" class="img-preview-sm">` : ''}${item.adminNote ? `<div style="font-size:11px;color:var(--muted);">Note: ${item.adminNote}</div>` : ''}</div>`;
    });
    html += `<button class="btn-primary" id="historyCloseBtn">${d.close}</button></div>`;
    modal.innerHTML = html;
    document.body.appendChild(modal);
    modal.querySelector("#historyCloseBtn").onclick = () => document.body.removeChild(modal);
}

// ============================================================
//  BIND WALLET
// ============================================================
function showBindWallet() {
    const d = t[lang] || t.en;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-title"><i class="fas fa-link"></i> ${d.bindWallet}</div>
                <input type="text" class="input-glass" id="bindWalletInput" placeholder="USDT TRC20 Address" value="${user?.walletAddress || ''}">
                <button class="btn-primary" id="bindWalletSave">${d.submit}</button>
                <button class="btn-primary btn-outline" id="bindWalletCancel" style="margin-top:8px;">${d.cancel}</button>
            </div>
        `;
    document.body.appendChild(modal);
    modal.querySelector("#bindWalletSave").onclick = async () => {
        user.walletAddress = modal.querySelector("#bindWalletInput").value.trim();
        await saveUser();
        updateUI();
        document.body.removeChild(modal);
        toast("Wallet updated!");
    };
    modal.querySelector("#bindWalletCancel").onclick = () => document.body.removeChild(modal);
}

// ============================================================
//  PERSONAL DETAILS
// ============================================================
function showPersonalDetails() {
    const d = t[lang] || t.en;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-title"><i class="fas fa-id-card"></i> ${d.personalDetails}</div>
                <div style="display:flex;justify-content:center;margin-bottom:12px;">
                    <div id="profilePreview" style="width:90px;height:90px;border-radius:45px;background:var(--secondary);display:flex;align-items:center;justify-content:center;border:3px solid var(--secondary-light);overflow:hidden;">${user?.profilePhoto ? `<img src="${user.profilePhoto}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-user" style="font-size:40px;color:#fff;"></i>'}</div>
                </div>
                <button class="btn-primary btn-outline" id="uploadPhotoBtn" style="font-size:12px;"><i class="fas fa-camera"></i> ${d.uploadPhoto}</button>
                <div style="margin-top:10px;">
                    <div class="flex" style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--muted);">Credit:</span><span>${user?.creditScore || 100}</span></div>
                    <div class="flex" style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--muted);">Balance:</span><span>$ ${(user?.balance || 0).toFixed(2)}</span></div>
                    <div class="flex" style="font-size:13px;padding:6px 0;"><span style="color:var(--muted);">Invitation Code:</span><span>${user?.invitationCode || 'N/A'}</span></div>
                </div>
                <button class="btn-primary" id="detailsClose" style="margin-top:12px;">${d.close}</button>
            </div>
        `;
    document.body.appendChild(modal);
    modal.querySelector("#uploadPhotoBtn").onclick = () => {
        document.body.removeChild(modal);
        showUploadPhoto();
    };
    modal.querySelector("#detailsClose").onclick = () => document.body.removeChild(modal);
}

// ============================================================
//  UPLOAD PHOTO
// ============================================================
function showUploadPhoto() {
    const d = t[lang] || t.en;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-title"><i class="fas fa-camera"></i> ${d.uploadPhoto}</div>
                <div style="display:flex;justify-content:center;margin-bottom:12px;">
                    <div id="uploadPreview" style="width:100px;height:100px;border-radius:50px;background:var(--secondary);display:flex;align-items:center;justify-content:center;border:3px solid var(--secondary-light);overflow:hidden;">${user?.profilePhoto ? `<img src="${user.profilePhoto}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-user-circle" style="font-size:48px;color:#fff;"></i>'}</div>
                </div>
                <div class="upload-area" id="photoUploadArea"><i class="fas fa-cloud-upload-alt"></i> ${d.uploadPhoto}<input type="file" id="photoInput" accept="image/*" style="display:none;"></div>
                <button class="btn-primary" id="photoSave">${d.save}</button>
                <button class="btn-primary btn-outline" id="photoCancel" style="margin-top:8px;">${d.cancel}</button>
            </div>
        `;
    document.body.appendChild(modal);
    let data = null;
    modal.querySelector("#photoUploadArea").onclick = () => modal.querySelector("#photoInput").click();
    modal.querySelector("#photoInput").onchange = async (e) => {
        if (e.target.files[0]) {
            data = await compressImage(e.target.files[0], 400, 400, 0.5);
            modal.querySelector("#uploadPreview").innerHTML =
            `<img src="${data}" style="width:100%;height:100%;object-fit:cover;">`;
        }
    };
    modal.querySelector("#photoSave").onclick = async () => {
        if (data) {
            user.profilePhoto = data;
            await saveUser();
            updateUI();
        }
        document.body.removeChild(modal);
        toast("Photo updated!");
    };
    modal.querySelector("#photoCancel").onclick = () => document.body.removeChild(modal);
}

// ============================================================
//  LOAN MODAL
// ============================================================
function showLoanModal() {
    const d = t[lang] || t.en;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-title"><i class="fas fa-hand-holding-usd"></i> ${d.loanService}</div>
                <div class="upload-area" id="loanBankArea"><i class="fas fa-upload"></i> Upload Bank Profile<input type="file" id="loanBankInput" accept="image/*" style="display:none;"></div>
                <div id="loanBankPreview"></div>
                <div style="display:flex;gap:8px;margin:8px 0;">
                    <div class="upload-area" style="flex:1;padding:8px;" id="loanFrontArea"><i class="fas fa-upload"></i> Front Side<input type="file" id="loanFrontInput" accept="image/*" style="display:none;"></div>
                    <div class="upload-area" style="flex:1;padding:8px;" id="loanBackArea"><i class="fas fa-upload"></i> Back Side<input type="file" id="loanBackInput" accept="image/*" style="display:none;"></div>
                </div>
                <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">
                    <div class="doc-opt active" data-type="nrc" style="cursor:pointer;padding:4px 12px;border-radius:30px;background:rgba(45,106,79,0.04);border:1px solid var(--secondary);color:var(--secondary);font-size:12px;">NRC</div>
                    <div class="doc-opt" data-type="driver" style="cursor:pointer;padding:4px 12px;border-radius:30px;background:var(--bg);border:1px solid var(--border);color:var(--muted);font-size:12px;">Driver</div>
                    <div class="doc-opt" data-type="passport" style="cursor:pointer;padding:4px 12px;border-radius:30px;background:var(--bg);border:1px solid var(--border);color:var(--muted);font-size:12px;">Passport</div>
                </div>
                <input type="number" class="input-glass" id="loanAmt" placeholder="Loan Amount">
                <button class="btn-primary" id="loanSubmit">${d.submit}</button>
                <button class="btn-primary btn-outline" id="loanCancel" style="margin-top:8px;">${d.cancel}</button>
                <div id="loanMsg" style="text-align:center;margin-top:6px;font-size:13px;"></div>
            </div>
        `;
    document.body.appendChild(modal);
    let bankData = null,
        frontData = null,
        backData = null;
    let docType = 'nrc';
    modal.querySelectorAll('.doc-opt').forEach(el => {
        el.onclick = function() {
            modal.querySelectorAll('.doc-opt').forEach(o => { o.style.background = 'var(--bg)';
                o.style.border = '1px solid var(--border)';
                o.style.color = 'var(--muted)'; });
            this.style.background = 'rgba(45,106,79,0.04)';
            this.style.border = '1px solid var(--secondary)';
            this.style.color = 'var(--secondary)';
            docType = this.dataset.type;
        };
    });
    modal.querySelector("#loanBankArea").onclick = () => modal.querySelector("#loanBankInput").click();
    modal.querySelector("#loanBankInput").onchange = async (e) => {
        if (e.target.files[0]) { bankData = await compressImage(e.target.files[0], 400, 400, 0.4);
            modal.querySelector("#loanBankPreview").innerHTML = `<img src="${bankData}" class="img-preview-sm">`; }
    };
    modal.querySelector("#loanFrontArea").onclick = () => modal.querySelector("#loanFrontInput").click();
    modal.querySelector("#loanFrontInput").onchange = async (e) => {
        if (e.target.files[0]) { frontData = await compressImage(e.target.files[0], 400, 400, 0.4);
            modal.querySelector("#loanFrontArea").innerHTML = `<i class="fas fa-check" style="color:#10b981;"></i> Uploaded`; }
    };
    modal.querySelector("#loanBackArea").onclick = () => modal.querySelector("#loanBackInput").click();
    modal.querySelector("#loanBackInput").onchange = async (e) => {
        if (e.target.files[0]) { backData = await compressImage(e.target.files[0], 400, 400, 0.4);
            modal.querySelector("#loanBackArea").innerHTML = `<i class="fas fa-check" style="color:#10b981;"></i> Uploaded`; }
    };
    modal.querySelector("#loanSubmit").onclick = async () => {
        const amt = parseFloat(modal.querySelector("#loanAmt").value);
        if (isNaN(amt) || amt <= 0) { modal.querySelector("#loanMsg").innerHTML =
            '<span style="color:#dc2626;">Enter valid amount.</span>'; return; }
        if (!bankData || !frontData || !backData) { modal.querySelector("#loanMsg").innerHTML =
            '<span style="color:#dc2626;">Upload all documents.</span>'; return; }
        await setDoc(doc(db, "loanRequests", Date.now().toString()), {
            id: Date.now().toString(),
            userId: user.id,
            userName: user.username,
            amount: amt,
            docType: docType,
            bankImage: bankData,
            frontImage: frontData,
            backImage: backData,
            status: 'pending',
            timestamp: new Date().toISOString()
        });
        document.body.removeChild(modal);
        toast("Loan submitted!");
    };
    modal.querySelector("#loanCancel").onclick = () => document.body.removeChild(modal);
}

// ============================================================
//  LIVE FEED
// ============================================================
const names = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "William", "Sophia", "Somchai", "Somying", "Wichai", "Napa",
    "Carlos", "Maria", "Olga", "Dmitri"
];

function randName() { return names[Math.floor(Math.random() * names.length)]; }

function randComm() { return Math.floor(Math.random() * (23513 - 800 + 1) + 800); }

function startFeed() {
    if (feedInterval) clearInterval(feedInterval);
    const container = document.getElementById('feedList');
    if (!container) return;

    function add() {
        const item = document.createElement('div');
        item.className = 'feed-item';
        item.innerHTML =
            `<i class="fas fa-trophy" style="color:var(--secondary);"></i> <strong>${randName()}</strong> earned <span style="color:var(--secondary);">+$ ${randComm().toLocaleString()}</span>`;
        container.prepend(item);
        if (container.children.length > 5) container.removeChild(container.lastChild);
    }
    for (let i = 0; i < 2; i++) add();
    feedInterval = setInterval(add, 8000);
}

// ============================================================
//  POPUP ADS
// ============================================================
async function checkPopup() {
    if (!user) return;
    const snap = await getDocs(collection(db, "popupAds"));
    const ads = [];
    snap.forEach(d => ads.push({ id: d.id, ...d.data() }));
    const active = ads.filter(a => a.isActive !== false);
    if (!active.length) return;
    const key = `popup_${user.id}`;
    if (sessionStorage.getItem(key)) return;
    const ad = active[0];
    sessionStorage.setItem(key, 'true');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
            <div class="popup-card" style="background:var(--bg-card);border-radius:24px;padding:20px;max-width:400px;width:92%;border:1px solid var(--border);text-align:center;position:relative;box-shadow:var(--shadow-hover);">
                <button id="popupClose" style="position:absolute;top:6px;right:10px;background:var(--bg);border:none;color:var(--muted);font-size:18px;cursor:pointer;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:0.3s;">✕</button>
                ${ad.imageData ? `<img src="${ad.imageData}" style="max-width:100%;max-height:180px;border-radius:12px;margin-bottom:10px;border:1px solid var(--border);">` : ''}
                <div style="font-size:20px;font-weight:800;color:var(--primary);">${esc(ad.title || 'Special Offer')}</div>
                <div style="color:var(--text-secondary);font-size:14px;margin:6px 0 14px;">${esc(ad.subtitle || '')}</div>
                <button class="btn-primary" id="popupAction" style="width:auto;padding:8px 24px;">${esc(ad.buttonText || 'Close')}</button>
            </div>
        `;
    document.body.appendChild(overlay);
    const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
    overlay.querySelector('#popupClose').onclick = close;
    overlay.querySelector('#popupAction').onclick = close;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// ============================================================
//  SIGN OUT
// ============================================================
function signOut() {
    if (unsubUser) unsubUser();
    if (unsubChat) unsubChat();
    if (unsubInjections) unsubInjections();
    if (unsubNotifications) unsubNotifications();
    if (feedInterval) clearInterval(feedInterval);
    if (lastSeenInterval) clearInterval(lastSeenInterval);
    const uid = user?.id;
    user = null;
    order = null;
    pendingInjections = [];
    localStorage.removeItem('uid');
    if (uid) sessionStorage.removeItem(`popup_shown_${uid}`);

    firebaseSignOut(auth).then(() => {
        console.log("Signed out from Firebase");
    }).catch((error) => {
        console.error("Sign out error:", error);
    });

    showPage('landing');
    toast('Signed out.');
}

// ============================================================
//  COMPANY INFO
// ============================================================
document.getElementById('companyInfoBtn').onclick = () => {
    const d = t[lang] || t.en;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-title"><i class="fas fa-info-circle"></i> ${d.companyTitle}</div>
                <div style="text-align:center;margin:12px 0;"><i class="fas fa-globe-asia" style="font-size:48px;color:var(--secondary);"></i></div>
                <div style="color:var(--text-secondary);font-size:14px;line-height:1.7;">Trip.com is a premier travel and task platform.</div>
                <div style="background:var(--bg);border-radius:12px;padding:12px;margin:12px 0;border:1px solid var(--border);"><h4 style="color:var(--secondary);font-size:15px;"><i class="fas fa-bullseye"></i> ${d.mission}</h4><p style="font-size:13px;color:var(--text-secondary);">To provide seamless travel experiences and financial freedom.</p></div>
                <div style="background:var(--bg);border-radius:12px;padding:12px;margin:12px 0;border:1px solid var(--border);"><h4 style="color:var(--secondary);font-size:15px;"><i class="fas fa-eye"></i> ${d.vision}</h4><p style="font-size:13px;color:var(--text-secondary);">To become the world's leading integrated travel and earning platform.</p></div>
                <button class="btn-primary" id="companyClose">${d.close}</button>
            </div>
        `;
    document.body.appendChild(modal);
    modal.querySelector('#companyClose').onclick = () => document.body.removeChild(modal);
};

// ============================================================
//  LANGUAGE
// ============================================================
document.querySelectorAll('.lang-opt').forEach(el => {
    el.onclick = function() {
        applyLang(this.dataset.lang);
        if (user) updateUI();
    };
});

// ============================================================
//  SUBSCRIPTIONS (Logos & Company)
// ============================================================
function subscribeLogos() {
    onSnapshot(doc(db, "systemSettings", "logos"), (snap) => {
        if (snap.exists()) {
            const logos = snap.data();
            const container = document.getElementById('logoContainer');
            let html = '';
            for (let i = 1; i <= 5; i++) {
                const url = logos[`logo${i}`];
                if (url) html +=
                    `<div style="width:50px;height:50px;background:var(--bg);border-radius:12px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;"><img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;"></div>`;
                else html +=
                    `<div style="width:50px;height:50px;background:var(--bg);border-radius:12px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--secondary);"><i class="fas fa-plane"></i></div>`;
            }
            container.innerHTML = html;
        }
    });
}

function subscribeCompany() {
    onSnapshot(doc(db, "systemSettings", "companyInfo"), (snap) => {
        if (snap.exists()) {
            const d = snap.data();
            if (d.companyName) document.getElementById('companyNameText').innerText = d.companyName;
            if (d.companyTagline) document.getElementById('companyTaglineText').innerText = d.companyTagline;
            if (d.companyDescription) document.getElementById('companyDesc').innerHTML = d.companyDescription;
            if (d.companyLogo) {
                const logo = document.getElementById('companyLogo');
                if (logo) logo.innerHTML = `<img src="${d.companyLogo}" style="width:32px;height:32px;object-fit:contain;">`;
            }
            if (d.stat1Number) document.getElementById('stat1').innerText = d.stat1Number;
            if (d.stat2Number) document.getElementById('stat2').innerText = d.stat2Number;
            if (d.stat3Number) document.getElementById('stat3').innerText = d.stat3Number;
            if (d.stat1Label) document.getElementById('stat1l').innerText = d.stat1Label;
            if (d.stat2Label) document.getElementById('stat2l').innerText = d.stat2Label;
            if (d.stat3Label) document.getElementById('stat3l').innerText = d.stat3Label;
        }
    });
}

function subscribeSettings() {
    onSnapshot(doc(db, "systemSettings", "main"), (snap) => {
        if (snap.exists()) {
            const s = snap.data();
            if (s.customerName) {
                document.getElementById('loginWebsiteName').innerText = s.customerName;
                document.getElementById('homeBrand').innerText = s.homePageName || s.customerName;
                document.getElementById('brandName').innerText = s.customerName;
            }
            if (s.customerTagline) document.getElementById('loginTagline').innerText = s.customerTagline;
        }
    });
}

// ============================================================
//  EVENT LISTENERS
// ============================================================

// Google Login
document.getElementById('landingGoogleBtn').onclick = handleGoogleLogin;
document.getElementById('loginGoogleBtn').onclick = handleGoogleLogin;
document.getElementById('registerGoogleBtn').onclick = handleGoogleLogin;

// Navigation
document.getElementById('landingLoginBtn').onclick = () => showPage('login');
document.getElementById('landingRegisterBtn').onclick = () => showPage('register');
document.getElementById('backFromLogin').onclick = () => showPage('landing');
document.getElementById('backFromRegister').onclick = () => showPage('landing');
document.getElementById('goRegisterBtn').onclick = () => showPage('register');
document.getElementById('goLoginFromReg').onclick = () => showPage('login');

// Login
document.getElementById('doLoginBtn').onclick = async function() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPass').value;
    if (!username || !password) { toast('Enter username and password.', true); return; }
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
    try {
        const q = query(collection(db, "users"), where("username", "==", username), where("password", "==", password));
        const snap = await getDocs(q);
        if (snap.empty) { toast('Invalid credentials.', true);
            this.disabled = false;
            this.innerHTML = 'Login'; return; }
        const data = snap.docs[0].data();
        if (data.disabled) { toast('Account disabled.', true);
            this.disabled = false;
            this.innerHTML = 'Login'; return; }
        user = { id: snap.docs[0].id, ...data };
        if (!user.orders) user.orders = [];
        if (!user.tasks) user.tasks = { completed: 0, total: 0 };
        await saveUser();
        subscribeUser(user.id);
        subscribeInjections(user.id);
        subscribeChat();
        subscribeNotifications();
        startLastSeenUpdate();
        updateUI();
        const last = localStorage.getItem('lastPage');
        showPage(last && !['landing', 'login', 'register'].includes(last) ? last : 'home');
        toast(`Welcome, ${username}`);
        await checkPopup();
    } catch (e) {
        toast('Login failed: ' + e.message, true);
        console.error('Login error:', e);
    }
    this.disabled = false;
    this.innerHTML = 'Login';
};

// Register
document.getElementById('doRegisterBtn').onclick = async function() {
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const pass = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirm').value;
    const withdraw = document.getElementById('regWithdraw').value;
    const invite = document.getElementById('regInvite').value.trim();
    if (!username || !email || !pass || !withdraw) { toast('All fields required.', true); return; }
    if (pass !== confirm) { toast('Passwords do not match.', true); return; }
    const exist = await getDocs(query(collection(db, "users"), where("username", "==", username)));
    if (!exist.empty) { toast('Username exists.', true); return; }
    let ref = null;
    if (invite) {
        const refCheck = await getDocs(query(collection(db, "users"), where("invitationCode", "==", invite)));
        if (refCheck.empty) { toast('Invalid invitation code.', true); return; }
        ref = refCheck.docs[0].data().username;
    }

    const ip = await getClientIP();

    user = {
        id: Date.now().toString(),
        username,
        email,
        phone,
        password: pass,
        withdrawPassword: withdraw,
        balance: 0,
        invitationCode: 'LXC' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        superior: ref,
        referralEarnings: 0,
        regTime: new Date().toISOString(),
        tasks: { completed: 0, total: 0 },
        orders: [],
        todayOrders: 0,
        todayEarnings: 0,
        totalCommission: 0,
        creditScore: 100,
        disabled: false,
        walletAddress: null,
        currentOrderObj: null,
        role: 'customer',
        lastSeen: Date.now(),
        regIP: ip
    };
    await setDoc(doc(db, "users", user.id), user);
    subscribeUser(user.id);
    subscribeInjections(user.id);
    subscribeChat();
    subscribeNotifications();
    startLastSeenUpdate();
    updateUI();
    showPage('home');
    toast('Registration successful!');
};

// Sign Out
document.getElementById('signOutHome').onclick = signOut;
document.getElementById('signOutProfile').onclick = signOut;

// Refresh Buttons
document.querySelectorAll('.icon-btn').forEach(el => {
    if (el.id && el.id.startsWith('refresh')) {
        el.onclick = () => { updateUI();
            toast('Refreshed!'); };
    }
});

// Action Buttons
document.getElementById('rechargeBtn').onclick = () => user ? showRechargeModal() : toast('Login first.', true);
document.getElementById('withdrawBtn').onclick = () => user ? showWithdrawModal() : toast('Login first.', true);
document.getElementById('depositBtn').onclick = () => user ? showRechargeModal() : toast('Login first.', true);
document.getElementById('withdrawProfileBtn').onclick = () => user ? showWithdrawModal() : toast('Login first.', true);
document.getElementById('bindWalletBtn').onclick = () => user ? showBindWallet() : toast('Login first.', true);
document.getElementById('personalDetailsBtn').onclick = () => user ? showPersonalDetails() : toast('Login first.', true);
document.getElementById('loanBtn').onclick = () => user ? showLoanModal() : toast('Login first.', true);
document.getElementById('rechargeHistoryBtn').onclick = async () => {
    if (!user) return;
    const snap = await getDocs(query(collection(db, "rechargeRequests"), where("userId", "==", user.id)));
    const items = [];
    snap.forEach(d => items.push(d.data()));
    showHistory('Recharge History', items, 'recharge');
};
document.getElementById('withdrawHistoryBtn').onclick = async () => {
    if (!user) return;
    const snap = await getDocs(query(collection(db, "withdrawRequests"), where("userId", "==", user.id)));
    const items = [];
    snap.forEach(d => items.push(d.data()));
    showHistory('Withdraw History', items, 'withdraw');
};

// Start Order
document.getElementById('startOrderBtn').onclick = async () => {
    if (!user) { toast('Login first.', true); return; }
    const limit = user.tasks?.total || 0;
    const done = user.tasks?.completed || 0;
    if (limit === 0) { toast('No orders assigned by admin.', true); return; }
    if (done >= limit) { toast('All orders completed!', true); return; }
    if (user.currentOrderObj && !user.currentOrderObj.completed) {
        const d = t[lang] || t.en;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
                <div class="modal-box" style="text-align:center;">
                    <div style="font-size:48px;color:#dc2626;margin-bottom:12px;"><i class="fas fa-exclamation-triangle"></i></div>
                    <h3 style="color:#dc2626;font-size:20px;">⚠️ ${d.warning}</h3>
                    <p style="color:var(--text-secondary);font-size:14px;margin:12px 0;">${d.pendingMsg}</p>
                    <button class="btn-primary" id="pendingOk">${d.okay}</button>
                </div>
            `;
        document.body.appendChild(modal);
        modal.querySelector('#pendingOk').onclick = () => {
            document.body.removeChild(modal);
            showPage('work');
            if (user.currentOrderObj) displayOrder(user.currentOrderObj);
            else if (order) displayOrder(order);
        };
        return;
    }
    const settings = await getDoc(doc(db, "systemSettings", "main"));
    const minBal = settings.exists() ? (settings.data().minBalanceForOrder || 10) : 10;
    if ((user.balance || 0) < minBal) {
        toast(`Minimum balance $ ${minBal} required.`, true);
        return;
    }
    await loadNextOrder();
};

// Chat
document.getElementById('sendChatBtn').onclick = async () => {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (text) {
        await sendChat(text);
        input.value = '';
        input.focus();
    }
};
document.getElementById('chatInput').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (text) {
            await sendChat(text);
            input.value = '';
            input.focus();
        }
    }
});
document.getElementById('emojiBtn').onclick = () => {
    const input = document.getElementById('chatInput');
    const picker = document.createElement('div');
    picker.style.cssText =
        'position:absolute;bottom:70px;left:16px;background:#1a1e26;padding:6px;border-radius:12px;z-index:10000;border:1px solid var(--border);display:flex;flex-wrap:wrap;max-width:200px;gap:2px;';
    const emojis = ['😀', '😂', '😍', '😎', '👍', '🙏', '💪', '🔥', '💰', '⭐', '❤️', '🎉', '✨'];
    emojis.forEach(e => {
        const s = document.createElement('span');
        s.style.cssText = 'cursor:pointer;font-size:20px;padding:4px;border-radius:4px;';
        s.innerText = e;
        s.onclick = () => { input.value += e;
            input.focus();
            picker.remove(); };
        picker.appendChild(s);
    });
    document.body.appendChild(picker);
    setTimeout(() => {
        const close = (e) => { if (!picker.contains(e.target) && e.target.id !== 'emojiBtn') { picker.remove();
                document.removeEventListener('click', close); } };
        document.addEventListener('click', close);
    }, 50);
};
document.getElementById('uploadChatBtn').onclick = () => document.getElementById('chatFileInput').click();
document.getElementById('chatFileInput').onchange = async (e) => {
    if (e.target.files[0]) {
        const data = await compressImage(e.target.files[0], 300, 300, 0.4);
        await sendChat('', data);
        e.target.value = '';
    }
};

// ============================================================
//  INIT
// ============================================================
applyLang(lang);
subscribeLogos();
subscribeCompany();
subscribeSettings();
startFeed();

onAuthStateChanged(auth, async (gUser) => {
    if (gUser) {
        const snap = await getDoc(doc(db, "users", gUser.uid));
        if (snap.exists() && !user) {
            const data = snap.data();
            if (!data.disabled) {
                user = { id: snap.id, ...data };
                if (!user.orders) user.orders = [];
                if (!user.tasks) user.tasks = { completed: 0, total: 0 };
                subscribeUser(user.id);
                subscribeInjections(user.id);
                subscribeChat();
                subscribeNotifications();
                startLastSeenUpdate();
                updateUI();
                const last = localStorage.getItem('lastPage');
                showPage(last && !['landing', 'login', 'register'].includes(last) ? last : 'home');
                await checkPopup();
            }
        }
    }
});

const saved = localStorage.getItem('uid');
if (saved) {
    (async () => {
        const snap = await getDoc(doc(db, "users", saved));
        if (snap.exists()) {
            const data = snap.data();
            if (!data.disabled) {
                user = { id: snap.id, ...data };
                if (!user.orders) user.orders = [];
                if (!user.tasks) user.tasks = { completed: 0, total: 0 };
                subscribeUser(user.id);
                subscribeInjections(user.id);
                subscribeChat();
                subscribeNotifications();
                startLastSeenUpdate();
                updateUI();
                const last = localStorage.getItem('lastPage');
                showPage(last && !['landing', 'login', 'register'].includes(last) ? last : 'home');
                await checkPopup();
            } else showPage('landing');
        } else showPage('landing');
    })();
} else showPage('landing');