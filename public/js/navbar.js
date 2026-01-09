document.addEventListener('DOMContentLoaded', () => {
    const navbarContainer = document.getElementById('navbar-container');
    const isLoggedIn = localStorage.getItem('user_id');
    const role = localStorage.getItem('role');
    const userName = localStorage.getItem('nama_lengkap') || 'Pengguna';
    const userInitial = userName.charAt(0).toUpperCase();

    // 1. Setup Theme
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const toggleTheme = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        
        const icon = document.getElementById('themeIcon');
        const text = document.getElementById('themeText');
        if(icon) icon.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        if(text) text.innerText = next === 'dark' ? 'Mode Gelap' : 'Mode Terang';
    };

    // 2. Overlay Mobile
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // 3. Tombol Menu
    const mobileBtn = document.createElement('button');
    mobileBtn.className = 'mobile-toggle';
    mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
    
    const toggleMenu = () => {
        const isOpen = navbarContainer.classList.contains('show');
        if (isOpen) {
            navbarContainer.classList.remove('show');
            overlay.classList.remove('show');
            mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
        } else {
            navbarContainer.classList.add('show');
            overlay.classList.add('show');
            mobileBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
    };

    mobileBtn.onclick = toggleMenu;
    overlay.onclick = toggleMenu;
    document.body.appendChild(mobileBtn);

    // 4. Menu Items
    let menuItems = `
        <li class="nav-item"><a href="index.html" class="nav-link"><i class="fas fa-home"></i> <span>Beranda</span></a></li>
        <li class="nav-item"><a href="katalog.html" class="nav-link"><i class="fas fa-store"></i> <span>Katalog Hewan</span></a></li>
    `;

    if (isLoggedIn) {
        if (role === 'admin') {
            menuItems += `
                <li style="margin: 15px 0 5px 10px; font-size: 0.75rem; color: var(--text-muted); font-weight:bold; letter-spacing:1px;">ADMIN PANEL</li>
                <li><a href="dashboard-admin.html" class="nav-link"><i class="fas fa-tachometer-alt"></i> <span>Dashboard</span></a></li>
                <li><a href="admin-pesanan.html" class="nav-link"><i class="fas fa-shopping-cart"></i> <span>Pesanan Masuk</span></a></li>
                <li><a href="admin-stok.html" class="nav-link"><i class="fas fa-boxes"></i> <span>Stok & Kesehatan</span></a></li>
                <li><a href="admin-laporan.html" class="nav-link"><i class="fas fa-file-invoice-dollar"></i> <span>Laporan Keuangan</span></a></li>
            `;
        } else {
            menuItems += `
                <li style="margin: 15px 0 5px 10px; font-size: 0.75rem; color: var(--text-muted); font-weight:bold; letter-spacing:1px;">MENU PENGGUNA</li>
                <li><a href="dashboard-user.html" class="nav-link"><i class="fas fa-receipt"></i> <span>Pesanan Saya</span></a></li>
                <li><a href="user-jadwal.html" class="nav-link"><i class="fas fa-shipping-fast"></i> <span>Lacak Distribusi</span></a></li>
                <li><a href="pengaturan-notifikasi.html" class="nav-link"><i class="fas fa-bell"></i> <span>Notifikasi</span></a></li>
            `;
        }
    } else {
        menuItems += `
            <li style="margin: 15px 0 5px 10px; font-size: 0.75rem; color: var(--text-muted); font-weight:bold; letter-spacing:1px;">AKSES AKUN</li>
            <li><a href="login.html" class="nav-link"><i class="fas fa-sign-in-alt"></i> <span>Masuk</span></a></li>
            <li><a href="register.html" class="nav-link"><i class="fas fa-user-plus"></i> <span>Daftar Baru</span></a></li>
        `;
    }

    // 5. User Profile
    let userSection = '';
    const themeIconClass = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    const themeTextLabel = currentTheme === 'dark' ? 'Mode Gelap' : 'Mode Terang';

    if (isLoggedIn) {
        userSection = `
            <div class="nav-user-profile">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; background:var(--bg-input); padding:10px; border-radius:12px;">
                    <div style="width: 45px; height: 45px; background: var(--primary-color); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem;">
                        ${userInitial}
                    </div>
                    <div style="flex: 1; overflow: hidden;">
                        <div style="font-weight: bold; font-size: 1rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${userName}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${role === 'admin' ? 'Administrator' : 'Member'}</div>
                    </div>
                    <a href="profil.html" class="btn-primary" style="padding:8px; border-radius:8px;" title="Edit Profil"><i class="fas fa-pen"></i></a>
                </div>
                
                <button id="btnToggleTheme" class="nav-link" style="width:100%; justify-content:center; margin-bottom:10px;">
                    <i id="themeIcon" class="${themeIconClass}"></i> <span id="themeText">${themeTextLabel}</span>
                </button>

                <button id="btnLogout" class="nav-link" style="width:100%; justify-content:center; background:rgba(231, 76, 60, 0.1); color:#e74c3c; border:1px solid #e74c3c;">
                    <i class="fas fa-power-off"></i> Keluar Aplikasi
                </button>
            </div>
        `;
    } else {
        userSection = `
            <div class="nav-user-profile">
                <button id="btnToggleTheme" class="nav-link" style="width:100%; justify-content:center;">
                    <i id="themeIcon" class="${themeIconClass}"></i> <span id="themeText">${themeTextLabel}</span>
                </button>
            </div>
        `;
    }

    // Render
    navbarContainer.innerHTML = `
        <div class="nav-brand">
            <i class="fas fa-leaf fa-lg"></i> BERKAH FARM
        </div>
        <ul class="nav-menu">
            ${menuItems}
        </ul>
        ${userSection}
    `;

    // Active State
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Event Listeners
    const btnToggleTheme = document.getElementById('btnToggleTheme');
    if(btnToggleTheme) btnToggleTheme.addEventListener('click', toggleTheme);

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm('Apakah Anda yakin ingin keluar?')) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }
});