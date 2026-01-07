const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();
const PORT = 3000;

// ==========================================
// 1. CONFIGURATION & MIDDLEWARE
// ==========================================

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ==========================================
// 2. MULTER CONFIGURATION (UPLOAD)
// ==========================================

const dirHewan = 'public/uploads/hewan';
const dirBukti = 'public/uploads/bukti';

// Buat folder jika belum ada
if (!fs.existsSync(dirHewan)) fs.mkdirSync(dirHewan, { recursive: true });
if (!fs.existsSync(dirBukti)) fs.mkdirSync(dirBukti, { recursive: true });

const storageHewan = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirHewan),
    filename: (req, file, cb) => cb(null, 'hewan-' + Date.now() + path.extname(file.originalname))
});

const storageBukti = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirBukti),
    filename: (req, file, cb) => cb(null, 'bukti-' + Date.now() + path.extname(file.originalname))
});

const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Hanya file gambar dan PDF yang diperbolehkan'), false);
    }
};

const uploadHewan = multer({ storage: storageHewan, fileFilter: imageFilter });
const uploadBukti = multer({ storage: storageBukti, fileFilter: imageFilter });

// Serve static files
app.use(express.static('public'));
app.use('/uploads/hewan', express.static(path.join(__dirname, 'public/uploads/hewan')));
app.use('/uploads/bukti', express.static(path.join(__dirname, 'public/uploads/bukti')));

// ==========================================
// 3. DATABASE CONNECTION
// ==========================================

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       
    password: '',       
    database: 'db_peternakan'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Gagal koneksi database:', err);
        return;
    }
    console.log('✅ Terhubung ke Database MySQL');
});

// ==========================================
// HELPER: BUAT NOTIFIKASI
// ==========================================
async function createNotifikasi(userId, roleTarget, judul, pesan, tipe) {
    try {
        const query = `
            INSERT INTO notifikasi (user_id, role_target, judul, pesan, tipe, is_read, created_at) 
            VALUES (?, ?, ?, ?, ?, 0, NOW())
        `;
        // Jika userId null (misal untuk admin global), biarkan null
        await db.promise().query(query, [userId, roleTarget, judul, pesan, tipe]);
        console.log(`🔔 Notifikasi dibuat untuk ${roleTarget}: ${judul}`);
    } catch (err) {
        console.error("❌ Gagal buat notifikasi:", err);
    }
}

// ==========================================
// 4. ROUTES: AUTH
// ==========================================

app.post('/api/register', async (req, res) => {
    const { nama, email, password, no_telepon, alamat } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);
    try {
        const [result] = await db.promise().query(
            "INSERT INTO users (nama_lengkap, email, password, no_telepon, alamat) VALUES (?, ?, ?, ?, ?)",
            [nama, email, hashedPassword, no_telepon, alamat]
        );
        res.status(201).json({ message: "Registrasi berhasil!", userId: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: "Email tidak terdaftar" });
        const user = results[0];
        if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ message: "Password salah" });
        res.json({ message: "Login berhasil", user: { id: user.id, nama: user.nama_lengkap, role: user.role, email: user.email } });
    });
});

app.get('/api/user/:id', (req, res) => {
    db.query("SELECT id, nama_lengkap, email, no_telepon, alamat, role FROM users WHERE id = ?", [req.params.id], (err, results) => {
        res.json(results[0] || {});
    });
});

// ==========================================
// 5. ROUTES: HEWAN (CRUD)
// ==========================================

app.get('/api/hewan', (req, res) => {
    db.query("SELECT * FROM hewan ORDER BY id DESC", (err, results) => res.json(results));
});

app.get('/api/hewan-tersedia', (req, res) => {
    db.query("SELECT * FROM hewan WHERE stok > 0 ORDER BY id DESC", (err, results) => res.json(results));
});

app.get('/api/hewan/:id', (req, res) => {
    db.query("SELECT * FROM hewan WHERE id = ?", [req.params.id], (err, results) => res.json(results[0] || {}));
});

app.post('/api/hewan', uploadHewan.single('gambar'), async (req, res) => {
    const { jenis, harga, stok, deskripsi } = req.body;
    const gambar = req.file ? req.file.filename : null;
    try {
        const [result] = await db.promise().query(
            "INSERT INTO hewan (jenis_hewan, harga, stok, deskripsi, gambar) VALUES (?, ?, ?, ?, ?)",
            [jenis, harga, stok, deskripsi, gambar]
        );
        res.status(201).json({ message: "Hewan berhasil ditambahkan", id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/hewan/:id', uploadHewan.single('gambar'), async (req, res) => {
    const { id } = req.params;
    const { jenis, harga, stok, deskripsi } = req.body;
    const gambar = req.file ? req.file.filename : null;
    try {
        let query = "UPDATE hewan SET jenis_hewan=?, harga=?, stok=?, deskripsi=? WHERE id=?";
        let params = [jenis, harga, stok, deskripsi, id];
        if (gambar) {
            query = "UPDATE hewan SET jenis_hewan=?, harga=?, stok=?, deskripsi=?, gambar=? WHERE id=?";
            params = [jenis, harga, stok, deskripsi, gambar, id];
        }
        await db.promise().query(query, params);
        res.json({ message: "Data hewan berhasil diupdate" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/hewan/:id', async (req, res) => {
    try {
        await db.promise().query("DELETE FROM hewan WHERE id = ?", [req.params.id]);
        res.json({ message: "Hewan berhasil dihapus" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 6. ROUTES: PESANAN (USER SIDE)
// ==========================================

app.get('/api/pesanan', (req, res) => {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: "user_id diperlukan" });
    
    const sql = `
        SELECT p.*, h.jenis_hewan, h.gambar
        FROM pemesanan p 
        JOIN hewan h ON p.hewan_id = h.id 
        WHERE p.user_id = ? 
        ORDER BY p.tanggal_pemesanan DESC
    `;
    
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: "Gagal mengambil data pesanan", detail: err.message });
        res.json(results);
    });
});

app.put('/api/pesanan/:id/metode', async (req, res) => {
    const { id } = req.params;
    const { metode_bayar } = req.body;
    try {
        await db.promise().query("UPDATE pemesanan SET metode_bayar = ? WHERE id = ?", [metode_bayar, id]);
        res.json({ message: "Metode update sukses" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pesanan/:id/dp', uploadBukti.single('bukti'), async (req, res) => {
    const { id } = req.params;
    const bukti = req.file ? req.file.filename : null;
    if (!bukti) return res.status(400).json({ message: "File wajib" });
    try {
        await db.promise().query(
            "UPDATE pemesanan SET dp_bukti = ?, status_pembayaran = 'dp', status_pesanan = 'dibayar' WHERE id = ?",
            [bukti, id]
        );
        res.json({ message: "Bukti DP berhasil diupload" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/bayar', uploadBukti.single('bukti'), async (req, res) => {
    const { id_pesanan } = req.body;
    const bukti = req.file ? req.file.filename : null;
    try {
        await db.promise().query(
            "UPDATE pemesanan SET bukti_transfer = ?, status_pembayaran = 'menunggu_verifikasi', status_pesanan = 'dibayar' WHERE id = ?",
            [bukti, id_pesanan]
        );
        res.json({ message: "Pembayaran berhasil diupload" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET DETAIL PESANAN & CICILAN (Fix untuk Modal Detail)
app.get('/api/pesanan/:id/cicilan', async (req, res) => {
    const { id } = req.params;
    try {
        // Ambil data pesanan lengkap
        const [rows] = await db.promise().query(`
            SELECT p.*, u.nama_lengkap, u.email, u.no_telepon, h.jenis_hewan, h.gambar
            FROM pemesanan p
            JOIN users u ON p.user_id = u.id
            JOIN hewan h ON p.hewan_id = h.id
            WHERE p.id = ?
        `, [id]);

        if (rows.length === 0) return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
        
        // Ambil data cicilan (jika tabel cicilan ada)
        let cicilanData = [];
        try {
            const [cicilan] = await db.promise().query("SELECT * FROM cicilan WHERE id_pemesanan = ? ORDER BY angsuran_ke ASC", [id]);
            cicilanData = cicilan;
        } catch (e) {
            console.log("Info: Tabel cicilan belum dibuat atau kosong.");
        }

        res.json({ pesanan: rows[0], cicilan: cicilanData, history: [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// API: AMBIL DATA CICILAN AKTIF
// ==========================================
app.get('/api/user/cicilan-aktif', async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: "User ID diperlukan" });
    }
    
    try {
        // 1. Cari PESANAN TERAKHIR milik user yang metodenya 'cicilan'
        // dan statusnya belum 'selesai' atau 'dibatalkan'
        const queryPesanan = `
            SELECT p.*, h.jenis_hewan, h.gambar 
            FROM pemesanan p
            JOIN hewan h ON p.hewan_id = h.id
            WHERE p.user_id = ? 
            AND p.metode_bayar = 'cicilan'
            AND p.status_pesanan NOT IN ('selesai', 'dibatalkan')
            ORDER BY p.tanggal_pemesanan DESC 
            LIMIT 1
        `;

        const [pesanan] = await db.promise().query(queryPesanan, [user_id]);

        // Jika tidak ada pesanan cicilan aktif
        if (pesanan.length === 0) {
            return res.json({ 
                ada_cicilan: false, 
                message: "Tidak ada pesanan cicilan aktif saat ini." 
            });
        }

        const dataPesanan = pesanan[0];

        // 2. Ambil JADWAL CICILAN dari tabel 'cicilan' berdasarkan id_pemesanan
        const queryJadwal = `
            SELECT * FROM cicilan 
            WHERE id_pemesanan = ? 
            ORDER BY angsuran_ke ASC
        `;

        const [jadwal] = await db.promise().query(queryJadwal, [dataPesanan.id]);

        // Cek jika tabel cicilan kosong (berarti data lama atau error saat insert)
        if (jadwal.length === 0) {
            return res.json({ 
                ada_cicilan: false, 
                error: "Data jadwal cicilan tidak ditemukan di database. (Mungkin ini pesanan lama sebelum sistem cicilan update?)" 
            });
        }

        // 3. Hitung Statistik (Sisa Hutang, Progress, dll)
        const totalHarga = parseFloat(dataPesanan.total_harga);
        
        // Hitung yang sudah dibayar (status lunas atau menunggu verifikasi)
        const sudahBayar = jadwal
            .filter(item => item.status === 'lunas' || item.status === 'menunggu_verifikasi')
            .reduce((total, item) => total + parseFloat(item.nominal), 0);
            
        const sisaHutang = totalHarga - sudahBayar;
        const persentase = totalHarga > 0 ? (sudahBayar / totalHarga) * 100 : 0;

        // 4. Kirim Respon Lengkap ke Frontend
        res.json({
            ada_cicilan: true,
            info_pesanan: dataPesanan,
            jadwal: jadwal, // <-- Ini array data cicilan (Angsuran 0-12)
            stats: {
                total: totalHarga,
                dibayar: sudahBayar,
                sisa: sisaHutang < 0 ? 0 : sisaHutang,
                progress: Math.round(persentase)
            }
        });

    } catch (err) {
        console.error("❌ Error ambil data cicilan:", err);
        res.status(500).json({ error: "Terjadi kesalahan server: " + err.message });
    }
});

// ==========================================
// TAMBAHAN: ROUTE UNTUK MEMBUAT PESANAN BARU
// ==========================================
app.post('/api/pesan', async (req, res) => {    
    const { 
        user_id, hewan_id, jumlah, total_harga, 
        jadwal, metode_bayar, opsi_pemotongan,
        metode_pengambilan, lokasi_pengiriman 
    } = req.body;

    if (!user_id || !hewan_id || !jumlah || !total_harga || !jadwal) {
        return res.status(400).json({ message: "Data pesanan tidak lengkap" });
    }

    try {
        // 1. Cek Stok
        const [hewan] = await db.promise().query("SELECT stok FROM hewan WHERE id = ?", [hewan_id]);
        if (hewan.length === 0) return res.status(404).json({ message: "Hewan tidak ditemukan" });
        if (hewan[0].stok < jumlah) return res.status(400).json({ message: "Stok hewan tidak mencukupi" });

        const status_pesanan = 'menunggu_pembayaran';
        const status_pembayaran = 'belum_dibayar';
        const jenis_layanan = opsi_pemotongan || 'potong';
        const pengiriman = metode_pengambilan || 'ambil_sendiri';
        const alamat = lokasi_pengiriman || null;

        // 2. Insert Pesanan Induk
        const query = `
            INSERT INTO pemesanan 
            (user_id, hewan_id, jumlah, total_harga, tanggal_pemesanan, jadwal_pemotongan, 
             metode_bayar, status_pesanan, status_pembayaran, opsi_pemotongan,
             metode_pengambilan, lokasi_pengiriman) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.promise().query(query, [
            user_id, hewan_id, jumlah, total_harga, jadwal, metode_bayar, 
            status_pesanan, status_pembayaran, jenis_layanan, pengiriman, alamat
        ]);

        const id_pesanan = result.insertId;

        // 3. GENERATE JADWAL CICILAN (JIKA METODE CICILAN)
        if (metode_bayar === 'cicilan') {
            const dp = Math.round(total_harga * 0.3); // DP 30%
            const sisa = total_harga - dp;
            const cicilanPerBulan = Math.round(sisa / 12);
            
            // Masukkan Tagihan DP (Angsuran ke-0)
            await db.promise().query(
                "INSERT INTO cicilan (id_pemesanan, angsuran_ke, nominal, jatuh_tempo, status) VALUES (?, ?, ?, NOW(), 'belum_bayar')",
                [id_pesanan, 0, dp]
            );

            // Masukkan Tagihan Bulanan (1-12)
            let tglJatuhTempo = new Date();
            for (let i = 1; i <= 12; i++) {
                tglJatuhTempo.setMonth(tglJatuhTempo.getMonth() + 1); // Tambah 1 bulan
                const tglFormat = tglJatuhTempo.toISOString().split('T')[0];
                
                await db.promise().query(
                    "INSERT INTO cicilan (id_pemesanan, angsuran_ke, nominal, jatuh_tempo, status) VALUES (?, ?, ?, ?, 'belum_bayar')",
                    [id_pesanan, i, cicilanPerBulan, tglFormat]
                );
            }
        }

        // 4. Update Stok
        await db.promise().query("UPDATE hewan SET stok = stok - ? WHERE id = ?", [jumlah, hewan_id]);

        res.status(201).json({ message: "Pesanan berhasil dibuat", id_pesanan: id_pesanan });

    } catch (err) {
        console.error("Error creating order:", err);
        res.status(500).json({ error: "Gagal membuat pesanan: " + err.message });
    }
});

// ==========================================
// 7. ROUTES: ADMIN FEATURES
// ==========================================

// ✅ GET ALL PESANAN FOR ADMIN
app.get('/api/admin/pesanan', (req, res) => {
    const sql = `
        SELECT p.*, u.nama_lengkap, u.email, h.jenis_hewan 
        FROM pemesanan p 
        JOIN users u ON p.user_id = u.id 
        JOIN hewan h ON p.hewan_id = h.id 
        ORDER BY p.tanggal_pemesanan DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ✅ UPDATE STATUS PESANAN (Terima/Tolak)
app.put('/api/admin/pesanan/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'selesai' atau 'ditolak'
    try {
        await db.promise().query("UPDATE pemesanan SET status_pesanan = ? WHERE id = ?", [status, id]);
        res.json({ message: "Status pesanan berhasil diupdate" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ DELETE PESANAN (Dari server (2).js)
app.delete('/api/admin/pesanan/:id', async (req, res) => {
    const { id } = req.params;
    try {
        console.log(`🗑️ Menghapus pesanan ID: ${id}`);
        
        // Opsional: Hapus cicilan terkait dulu jika ada Foreign Key constraint
        try { await db.promise().query("DELETE FROM cicilan WHERE id_pemesanan = ?", [id]); } catch(e){}

        await db.promise().query("DELETE FROM pemesanan WHERE id = ?", [id]);
        res.json({ message: "Pesanan berhasil dihapus" });
    } catch (err) { 
        console.error("Gagal hapus:", err);
        res.status(500).json({ error: err.message }); 
    }
});

// ✅ DASHBOARD STATS (Fix untuk Pesanan Pending & Sales)
app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
        // 1. Pesanan Pending (Yang statusnya 'dibayar' menunggu verifikasi)
        const [pending] = await db.promise().query("SELECT COUNT(*) as total FROM pemesanan WHERE status_pesanan = 'dibayar'");
        
        // 2. Total Penjualan (Hanya yang statusnya 'selesai')
        const [sales] = await db.promise().query("SELECT SUM(total_harga) as total FROM pemesanan WHERE status_pesanan = 'selesai'");
        
        // 3. Stok Hewan
        const [hewan] = await db.promise().query("SELECT id, jenis_hewan, stok FROM hewan ORDER BY stok ASC");
        
        const stats = {
            pendingCount: pending[0].total || 0,
            totalSales: sales[0].total || 0,
            stokData: hewan
        };

        res.json(stats);
    } catch (err) {
        console.error("❌ Error Dashboard:", err);
        res.status(500).json({ error: "Gagal memuat statistik dashboard" });
    }
});

// ==========================================
// 8. ROUTES: JADWAL
// ==========================================

app.get('/api/jadwal/view', (req, res) => {
    const { tanggal } = req.query;
    const sql = `
        SELECT p.id, p.jam_potong, p.jumlah, p.metode_pengambilan, 
               h.jenis_hewan, u.nama_lengkap as pemesan
        FROM pemesanan p
        JOIN hewan h ON p.hewan_id = h.id
        JOIN users u ON p.user_id = u.id
        WHERE p.jadwal_pemotongan = ? AND p.status_pesanan IN ('dibayar', 'selesai', 'diproses')
        ORDER BY p.jam_potong ASC
    `;
    db.query(sql, [tanggal], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ tanggal, pesanan: results });
    });
});

app.put('/api/pesanan/:id/jadwal', (req, res) => {
    const { jam_potong } = req.body;
    db.query("UPDATE pemesanan SET jam_potong = ? WHERE id = ?", [jam_potong, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Jadwal diupdate" });
    });
});

// ==========================================
// ROUTE: NOTIFIKASI SYSTEM
// ==========================================

// 1. Ambil Notifikasi (User / Admin)
app.get('/api/notifikasi', (req, res) => {
    const { user_id, role } = req.query;

    let sql = "";
    let params = [];

    if (role === 'admin') {
        // Admin melihat notifikasi untuk admin
        sql = "SELECT * FROM notifikasi WHERE role_target = 'admin' ORDER BY created_at DESC LIMIT 20";
    } else {
        // User melihat notifikasi milik sendiri atau global user
        sql = "SELECT * FROM notifikasi WHERE (user_id = ? OR (role_target = 'pelanggan' AND user_id IS NULL)) ORDER BY created_at DESC LIMIT 20";
        params = [user_id];
    }

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Hitung unread
        const unreadCount = results.filter(n => n.is_read === 0).length;
        res.json({ notifikasi: results, unread: unreadCount });
    });
});

// 2. Tandai Sudah Dibaca
app.put('/api/notifikasi/:id/read', (req, res) => {
    db.query("UPDATE notifikasi SET is_read = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Notifikasi dibaca" });
    });
});

// 3. Tandai Semua Dibaca
app.put('/api/notifikasi/read-all', (req, res) => {
    const { user_id, role } = req.body;
    let sql = "";
    let params = [];

    if (role === 'admin') {
        sql = "UPDATE notifikasi SET is_read = 1 WHERE role_target = 'admin' AND is_read = 0";
    } else {
        sql = "UPDATE notifikasi SET is_read = 1 WHERE user_id = ? AND is_read = 0";
        params = [user_id];
    }

    db.query(sql, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Semua notifikasi ditandai sudah dibaca" });
    });
});

// ==========================================
// 9. ERROR HANDLING & START SERVER
// ==========================================

app.use((req, res) => {
    // Handle 404 for images to avoid broken image icons
    if (req.url.startsWith('/uploads/')) {
        return res.status(404).end();   
    }
    res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📂 Upload folder: ${dirHewan} & ${dirBukti}`);
});