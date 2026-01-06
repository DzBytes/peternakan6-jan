document.addEventListener("DOMContentLoaded", function() {
    loadNavbar();
    setupNotifikasi();
});

// ==========================================
// 1. LOAD NAVBAR BERDASARKAN ROLE
// ==========================================
async function loadNavbar() {
    const navbarContainer = document.getElementById("navbar-container");
    if (!navbarContainer) return;

    // Ambil data user dari LocalStorage
    const userRole = localStorage.getItem("role");
    const userName = localStorage.getItem("nama") || "User";
    const userId = localStorage.getItem("user_id");

    let menuHTML = '';
    let userSection = '';

    // LOGIKA MENU BERDASARKAN PERAN
    if (userRole === 'admin') {
        menuHTML = `
            <li><a href="dashboard-admin.html"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
            <li><a href="admin-stok.html"><i class="fas fa-boxes"></i> Kelola Stok</a></li>
            <li><a href="admin-pesanan.html"><i class="fas fa-shopping-cart"></i> Pesanan Masuk</a></li>
            <li><a href="admin-laporan.html"><i class="fas fa-chart-bar"></i> Laporan</a></li>
        `;
        
        userSection = `
            <div class="user-info">
                <span class="admin-badge"><i class="fas fa-user-shield"></i> ${userName}</span>
                <button onclick="logout()" class="btn-logout" title="Logout">
                    <i class="fas fa-sign-out-alt"></i> <span class="logout-text">Logout</span>
                </button>
            </div>
        `;

    } else if (userRole === 'pelanggan') {
        menuHTML = `
            <li><a href="index.html"><i class="fas fa-home"></i> Home</a></li>
            <li><a href="katalog.html"><i class="fas fa-paw"></i> Katalog Hewan</a></li>
            <li><a href="dashboard-user.html"><i class="fas fa-clipboard-list"></i> Pesanan Saya</a></li>
            <li><a href="dashboard-cicilan.html"><i class="fas fa-calendar-alt"></i> Cicilan Saya</a></li>
        `;
        
        userSection = `
            <div class="user-actions">
                <div class="notif-wrapper" id="notif-trigger">
                    <i class="fas fa-bell"></i>
                    <span id="badge-count" class="notif-badge">0</span>
                </div>
                
                <div class="user-info">
                    <span><i class="fas fa-user"></i> ${userName}</span>
                    <button onclick="logout()" class="btn-logout" title="Logout">
                        <i class="fas fa-sign-out-alt"></i> <span class="logout-text">Logout</span>
                    </button>
                </div>
            </div>
        `;

    } else {
        menuHTML = `
            <li><a href="index.html"><i class="fas fa-home"></i> Home</a></li>
            <li><a href="katalog.html"><i class="fas fa-paw"></i> Katalog & Harga</a></li>
        `;
        
        userSection = `
            <div class="auth-buttons">
                <a href="login.html" class="btn-login">
                    <i class="fas fa-sign-in-alt"></i> <span>Login</span>
                </a>
                <a href="register.html" class="btn-register">
                    <i class="fas fa-user-plus"></i> <span>Daftar</span>
                </a>
            </div>
        `;
    }

    // Masukkan HTML ke dalam container
    navbarContainer.innerHTML = `
        <nav class="navbar">
            <div class="nav-container">
                <!-- Logo -->
                <a href="index.html" class="logo">
                    <i class="fas fa-paw"></i>
                    <span>Berkah Farm</span>
                </a>
                
                <!-- Mobile Menu Toggle -->
                <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle menu">
                    <i class="fas fa-bars"></i>
                </button>
                
                <!-- Menu Items -->
                <ul class="nav-links" id="nav-links">
                    ${menuHTML}
                </ul>
                
                <!-- User Section -->
                <div class="user-section">
                    ${userSection}
                </div>
            </div>
        </nav>
        
        <!-- Notifikasi Dropdown (diluar navbar untuk positioning yang lebih baik) -->
        <div id="notif-dropdown" class="notif-dropdown">
            <div class="notif-header">
                <div class="notif-title">
                    <i class="fas fa-bell"></i> Notifikasi
                </div>
                <div class="notif-actions">
                    <button onclick="tandaiSemuaDibaca()" class="btn-mark-all" title="Tandai semua dibaca">
                        <i class="fas fa-check-double"></i>
                    </button>
                    <button onclick="hapusSemuaNotifikasi()" class="btn-clear-all" title="Hapus semua">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div id="notif-list" class="notif-list">
                <div class="loading-notif">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Memuat notifikasi...</p>
                </div>
            </div>
            <div class="notif-footer">
                <small>Notifikasi akan otomatis diperbarui</small>
            </div>
        </div>
    `;
    
    // Setup event listeners setelah navbar dimuat
    setupEventListeners();
    
    // Load notifikasi jika user login
    if (userId) {
        loadNotifikasi();
    }
}

// ==========================================
// 2. EVENT LISTENERS SETUP
// ==========================================
function setupEventListeners() {
    // Mobile menu toggle
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Notifikasi dropdown toggle
    const notifTrigger = document.getElementById('notif-trigger');
    if (notifTrigger) {
        notifTrigger.addEventListener('click', toggleNotifDropdown);
    }
    
    // Tutup dropdown jika klik di luar
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('notif-dropdown');
        const notifTrigger = document.getElementById('notif-trigger');
        
        if (dropdown && notifTrigger && 
            !notifTrigger.contains(event.target) && 
            !dropdown.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
}

// ==========================================
// 3. NOTIFIKASI FUNCTIONS
// ==========================================
function setupNotifikasi() {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    // Load pertama kali
    setTimeout(() => loadNotifikasi(), 1000);
    
    // Refresh berkala
    setInterval(() => {
        loadNotifikasi();
    }, 30000);
}

// Toggle dropdown notifikasi
function toggleNotifDropdown(event) {
    if (event) event.stopPropagation();
    
    const dropdown = document.getElementById('notif-dropdown');
    if (!dropdown) return;
    
    dropdown.classList.toggle('show');
    
    if (dropdown.classList.contains('show')) {
        loadNotifikasi();
    }
}

// Load notifikasi dari server
async function loadNotifikasi() {
    try {
        const userId = localStorage.getItem("user_id");
        if (!userId) return;

        const res = await fetch(`http://localhost:3000/api/notifikasi/user?user_id=${userId}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        const badge = document.getElementById('badge-count');
        const list = document.getElementById('notif-list');
        
        if(!badge || !list) return;

        // Hitung yang belum dibaca
        const unread = Array.isArray(data) ? data.filter(n => n.is_read === 0).length : 0;
        updateBadgeCount(unread);

        // Render List HTML
        if (!Array.isArray(data) || data.length === 0) {
            list.innerHTML = `
                <div class="empty-notif">
                    <i class="fas fa-bell-slash"></i>
                    <p>Tidak ada notifikasi</p>
                </div>
            `;
            return;
        }

        let html = '';
        data.forEach(n => {
            const date = n.created_at ? new Date(n.created_at).toLocaleString('id-ID', { 
                day: 'numeric', 
                month: 'short', 
                hour: '2-digit', 
                minute:'2-digit' 
            }) : 'Baru saja';
            
            // Warna berdasarkan tipe
            const iconMap = {
                'success': 'fas fa-check-circle',
                'warning': 'fas fa-exclamation-triangle',
                'danger': 'fas fa-exclamation-circle',
                'info': 'fas fa-info-circle'
            };
            
            const iconClass = iconMap[n.tipe] || 'fas fa-info-circle';
            const colorClass = n.tipe ? `notif-${n.tipe}` : 'notif-info';
            
            html += `
            <div class="notif-item ${colorClass} ${n.is_read === 0 ? 'unread' : ''}" 
                 onclick="tandaiDibaca(${n.id})">
                <div class="notif-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="notif-content">
                    <div class="notif-title">${n.judul || 'Notifikasi'}</div>
                    <div class="notif-message">${n.pesan || ''}</div>
                    <div class="notif-time">${date}</div>
                </div>
                ${n.is_read === 0 ? '<div class="notif-dot"></div>' : ''}
            </div>`;
        });
        
        list.innerHTML = html;

    } catch (err) {
        console.error("Gagal load notif:", err);
        const list = document.getElementById('notif-list');
        if (list) {
            list.innerHTML = `
                <div class="error-notif">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Gagal memuat notifikasi</p>
                    <button onclick="loadNotifikasi()" class="btn-retry">Coba Lagi</button>
                </div>
            `;
        }
    }
}

// Update badge count
function updateBadgeCount(count) {
    const badge = document.getElementById('badge-count');
    if (!badge) return;
    
    if (count > 0) {
        badge.style.display = 'flex';
        badge.textContent = count > 9 ? '9+' : count;
    } else {
        badge.style.display = 'none';
    }
}

// Tandai notifikasi sebagai dibaca
async function tandaiDibaca(id) {
    try {
        const res = await fetch('http://localhost:3000/api/notifikasi/baca', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        if (!res.ok) throw new Error('Failed to mark as read');
        
        // Refresh notifikasi
        loadNotifikasi();
    } catch (err) {
        console.error("Gagal tandai notifikasi:", err);
    }
}

// Tandai semua notifikasi sebagai dibaca
async function tandaiSemuaDibaca() {
    try {
        const userId = localStorage.getItem("user_id");
        if (!userId) return;
        
        const res = await fetch('http://localhost:3000/api/notifikasi/baca-semua', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        
        if (!res.ok) throw new Error('Failed to mark all as read');
        
        loadNotifikasi();
    } catch (err) {
        console.error("Gagal tandai semua dibaca:", err);
        alert("Gagal menandai semua notifikasi sebagai dibaca");
    }
}

// Hapus semua notifikasi
async function hapusSemuaNotifikasi() {
    if (!confirm("Yakin ingin menghapus semua notifikasi?")) return;
    
    try {
        const userId = localStorage.getItem("user_id");
        if (!userId) return;
        
        const res = await fetch(`http://localhost:3000/api/notifikasi/user/${userId}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) throw new Error('Failed to delete notifications');
        
        loadNotifikasi();
        
        // Tampilkan feedback
        const list = document.getElementById('notif-list');
        if (list) {
            list.innerHTML = `
                <div class="success-notif">
                    <i class="fas fa-check-circle"></i>
                    <p>Semua notifikasi berhasil dihapus</p>
                </div>
            `;
        }
    } catch (err) {
        console.error("Gagal hapus semua notifikasi:", err);
        alert("Gagal menghapus notifikasi");
    }
}

// ==========================================
// 4. UTILITY FUNCTIONS
// ==========================================

// Toggle mobile menu
function toggleMobileMenu() {
    const navLinks = document.getElementById('nav-links');
    navLinks.classList.toggle('show');
    
    // Update icon
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const icon = toggleBtn.querySelector('i');
    if (navLinks.classList.contains('show')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

// Fungsi Logout
function logout() {
    if (confirm("Yakin ingin logout?")) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "login.html";
    }
}

// Refresh navbar
function refreshNavbar() {
    loadNavbar();
}

// Cek login status
function isLoggedIn() {
    return localStorage.getItem("user_id") !== null;
}

// Get user role
function getUserRole() {
    return localStorage.getItem("role");
}

// Get user name
function getUserName() {
    return localStorage.getItem("nama") || "User";
}

// ==========================================
// 5. STYLES (Injected langsung ke document)
// ==========================================
const navbarStyles = document.createElement('style');
navbarStyles.textContent = `
    /* Navbar Container */
    .navbar {
        background: rgba(10, 20, 30, 0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        position: sticky;
        top: 0;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    
    .nav-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 70px;
    }
    
    /* Logo */
    .logo {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        font-size: 1.4rem;
        font-weight: 700;
        color: #4CAF50;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .logo i {
        font-size: 1.6rem;
    }
    
    /* Menu Links */
    .nav-links {
        display: flex;
        list-style: none;
        gap: 1.5rem;
        margin: 0;
        padding: 0;
    }
    
    .nav-links li a {
        color: #e0e0e0;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 6px;
    }
    
    .nav-links li a:hover,
    .nav-links li a.active {
        color: #4CAF50;
        background: rgba(76, 175, 80, 0.1);
    }
    
    /* User Section */
    .user-section {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    /* Auth Buttons */
    .auth-buttons {
        display: flex;
        gap: 0.8rem;
    }
    
    .btn-login, .btn-register {
        padding: 8px 16px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
        font-size: 0.9rem;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    
    .btn-login {
        background: transparent;
        color: #e0e0e0;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .btn-login:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .btn-register {
        background: linear-gradient(135deg, #4CAF50, #2E7D32);
        color: white;
        border: none;
    }
    
    .btn-register:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
    }
    
    /* User Actions */
    .user-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        color: #e0e0e0;
    }
    
    .admin-badge {
        color: #4CAF50;
        font-weight: 600;
    }
    
    .btn-logout {
        background: rgba(244, 67, 54, 0.1);
        color: #f44336;
        border: 1px solid rgba(244, 67, 54, 0.3);
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    
    .btn-logout:hover {
        background: rgba(244, 67, 54, 0.2);
        transform: translateY(-2px);
    }
    
    /* Notifikasi */
    .notif-wrapper {
        position: relative;
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        transition: background 0.3s;
    }
    
    .notif-wrapper:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .notif-wrapper i {
        font-size: 1.2rem;
        color: #e0e0e0;
    }
    
    .notif-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        background: #f44336;
        color: white;
        border-radius: 50%;
        min-width: 18px;
        height: 18px;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: bold;
        padding: 2px;
    }
    
    /* Notifikasi Dropdown */
    .notif-dropdown {
        display: none;
        position: fixed;
        top: 70px;
        right: 20px;
        width: 350px;
        max-width: 90vw;
        background: rgba(20, 30, 40, 0.98);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        z-index: 1001;
        overflow: hidden;
    }
    
    .notif-dropdown.show {
        display: block;
        animation: slideDown 0.3s ease;
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .notif-header {
        padding: 15px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .notif-title {
        font-weight: 600;
        color: #e0e0e0;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .notif-actions {
        display: flex;
        gap: 8px;
    }
    
    .btn-mark-all, .btn-clear-all {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
    }
    
    .btn-mark-all:hover {
        background: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
        border-color: rgba(76, 175, 80, 0.3);
    }
    
    .btn-clear-all:hover {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
        border-color: rgba(244, 67, 54, 0.3);
    }
    
    .notif-list {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .notif-item {
        padding: 12px 15px;
        display: flex;
        gap: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: background 0.3s;
        position: relative;
    }
    
    .notif-item:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    
    .notif-item.unread {
        background: rgba(76, 175, 80, 0.05);
    }
    
    .notif-icon {
        font-size: 1rem;
        margin-top: 2px;
        flex-shrink: 0;
    }
    
    .notif-content {
        flex: 1;
        min-width: 0;
    }
    
    .notif-title {
        font-weight: 600;
        margin-bottom: 4px;
        font-size: 0.9rem;
        color: #ffffff;
    }
    
    .notif-message {
        color: #b0b0b0;
        font-size: 0.85rem;
        line-height: 1.4;
        margin-bottom: 4px;
        word-wrap: break-word;
    }
    
    .notif-time {
        color: #888;
        font-size: 0.75rem;
    }
    
    .notif-dot {
        width: 6px;
        height: 6px;
        background: #4CAF50;
        border-radius: 50%;
        position: absolute;
        right: 12px;
        top: 16px;
    }
    
    /* Notifikasi tipe warna */
    .notif-success .notif-icon { color: #4CAF50; }
    .notif-warning .notif-icon { color: #FF9800; }
    .notif-danger .notif-icon { color: #f44336; }
    .notif-info .notif-icon { color: #2196F3; }
    
    .notif-footer {
        padding: 10px 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
    }
    
    .notif-footer small {
        color: #888;
        font-size: 0.75rem;
    }
    
    .empty-notif,
    .loading-notif,
    .error-notif,
    .success-notif {
        padding: 30px 15px;
        text-align: center;
        color: #888;
    }
    
    .empty-notif i,
    .loading-notif i,
    .error-notif i,
    .success-notif i {
        font-size: 2rem;
        margin-bottom: 10px;
        display: block;
    }
    
    .loading-notif i.fa-spin {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .btn-retry {
        margin-top: 10px;
        padding: 6px 12px;
        background: rgba(76, 175, 80, 0.1);
        color: #4CAF50;
        border: 1px solid rgba(76, 175, 80, 0.3);
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
    }
    
    /* Mobile Menu */
    .mobile-menu-toggle {
        display: none;
        background: none;
        border: none;
        color: #e0e0e0;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 5px;
    }
    
    /* Responsive Design */
    @media (max-width: 992px) {
        .nav-links {
            gap: 1rem;
        }
        
        .nav-container {
            padding: 0 1rem;
        }
    }
    
    @media (max-width: 768px) {
        .mobile-menu-toggle {
            display: block;
        }
        
        .nav-links {
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            background: rgba(10, 20, 30, 0.98);
            flex-direction: column;
            padding: 1rem;
            gap: 0.5rem;
            display: none;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 999;
        }
        
        .nav-links.show {
            display: flex;
        }
        
        .nav-links li {
            width: 100%;
        }
        
        .nav-links li a {
            padding: 12px;
            margin-bottom: 0.25rem;
        }
        
        .notif-dropdown {
            right: 10px;
            left: 10px;
            width: auto;
            max-width: calc(100vw - 20px);
        }
    }
    
    @media (max-width: 480px) {
        .logo span {
            display: none;
        }
        
        .user-info span:not(.admin-badge) {
            display: none;
        }
        
        .logout-text,
        .btn-login span,
        .btn-register span {
            display: none;
        }
        
        .btn-login,
        .btn-register,
        .btn-logout {
            padding: 8px;
        }
        
        .auth-buttons {
            gap: 0.5rem;
        }
    }
`;

document.head.appendChild(navbarStyles);

// Export untuk penggunaan modular
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadNavbar,
        logout,
        refreshNavbar,
        isLoggedIn,
        getUserRole,
        getUserName
    };
}