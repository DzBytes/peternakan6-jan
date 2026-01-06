const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
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

// Pastikan folder tersedia
if (!fs.existsSync(dirHewan)) fs.mkdirSync(dirHewan, { recursive: true });
if (!fs.existsSync(dirBukti)) fs.mkdirSync(dirBukti, { recursive: true });

// Storage untuk Hewan
const storageHewan = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirHewan),
    filename: (req, file, cb) => cb(null, 'hewan-' + Date.now() + path.extname(file.originalname))
});

// Storage untuk Bukti Pembayaran
const storageBukti = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirBukti),
    filename: (req, file, cb) => cb(null, 'bukti-' + Date.now() + path.extname(file.originalname))
});

// Filter File (Hanya Gambar/PDF)
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Hanya file gambar dan PDF yang diperbolehkan'), false);
    }
};

// Instance Upload
const uploadHewan = multer({
    storage: storageHewan,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadBukti = multer({
    storage: storageBukti,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Serve Static Files
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
// 4. EMAIL CONFIGURATION
// ==========================================

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'aeloriaaidara@gmail.com', 
        pass: 'cudjwjtxrwyqhpno' // Pastikan App Password ini valid
    }
});

// ==========================================
// 5. HELPER FUNCTIONS
// ==========================================

async function kirimEmailNotifikasi(to, subject, text) {
    const mailOptions = {
        from: '"Berkah Farm" <no-reply@berkahfarm.com>',
        to: to, subject: subject, html: `<p>${text}</p>`
    };
    try { await transporter.sendMail(mailOptions); return true; } 
    catch (err) { console.error('❌ Gagal kirim email:', err.message); return false; }
}

async function notifikasiKeAdmin(judul, pesan, tipe = 'info') {
    try {
        // Cek tabel notifikasi dulu (ignore error jika tabel belum dibuat)
        await db.promise().query(
            'INSERT INTO notifikasi (judul, pesan, tipe, role_target) VALUES (?, ?, ?, ?)',
            [judul, pesan, tipe, 'admin']
        );
        console.log(`✅ Notifikasi admin: ${judul}`);
    } catch (err) { console.error('❌ Error notifikasi admin (Mungkin tabel belum ada):', err.message); }
}

async function kirimNotifikasiLengkap(userId, judul, pesan, tipe = 'info') {
    try {
        await db.promise().query(
            'INSERT INTO notifikasi (judul, pesan, tipe, user_id, role_target) VALUES (?, ?, ?, ?, ?)',
            [judul, pesan, tipe, userId, 'pelanggan']
        );
    } catch (err) { console.error('❌ Error notifikasi user:', err.message); }
}

// ==========================================
// 6. ROUTES: AUTH & USER
// ==========================================

app.post('/api/register', async (req, res) => {
    const { nama, email, password, no_telepon, alamat } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);
    try {
        const [result] = await db.promise().query(
            "INSERT INTO users (nama_lengkap, email, password, no_telepon, alamat) VALUES (?, ?, ?, ?, ?)",
            [nama, email, hashedPassword, no_telepon, alamat]
        );
        // Default notif config (Opsional, handle error jika tabel tidak ada)
        try { await db.promise().query("INSERT INTO konfigurasi_notifikasi (user_id) VALUES (?)", [result.insertId]); } catch(e){}
        
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
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || {});
    });
});

// ==========================================
// 7. ROUTES: HEWAN (CRUD LENGKAP)
// ==========================================

// Get Semua Hewan
app.get('/api/hewan', (req, res) => {
    db.query("SELECT * FROM hewan ORDER BY id DESC", (err, results) => res.json(results));
});

// Get Hewan Tersedia (Stok > 0)
app.get('/api/hewan-tersedia', (req, res) => {
    db.query("SELECT * FROM hewan WHERE stok > 0 ORDER BY id DESC", (err, results) => res.json(results));
});

// Get Detail Hewan
app.get('/api/hewan/:id', (req, res) => {
    db.query("SELECT * FROM hewan WHERE id = ?", [req.params.id], (err, results) => res.json(results[0] || {}));
});

// Tambah Hewan Baru
app.post('/api/hewan', uploadHewan.single('gambar'), async (req, res) => {
    const { jenis, harga, stok, deskripsi } = req.body;
    const gambar = req.file ? req.file.filename : null;

    if (!jenis || !harga || !stok) {
        return res.status(400).json({ error: "Data tidak lengkap" });
    }

    try {
        const [result] = await db.promise().query(
            "INSERT INTO hewan (jenis_hewan, harga, stok, deskripsi, gambar) VALUES (?, ?, ?, ?, ?)",
            [jenis, harga, stok, deskripsi, gambar]
        );
        
        // Catat log stok awal
        try {
            await db.promise().query(
                "INSERT INTO log_stok (hewan_id, stok_sebelum, stok_sesudah, aksi, jumlah, keterangan) VALUES (?, 0, ?, 'tambah_baru', ?, 'Inisiasi stok hewan baru')",
                [result.insertId, stok, stok]
            );
        } catch(e) { console.warn("⚠️ Log stok skip:", e.message); }

        res.status(201).json({ message: "Hewan berhasil ditambahkan", id: result.insertId });
    } catch (err) {
        console.error('❌ Error tambah hewan:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Update Data Hewan
app.put('/api/hewan/:id', uploadHewan.single('gambar'), async (req, res) => {
    const { id } = req.params;
    const { jenis, harga, stok, deskripsi } = req.body;
    const gambar = req.file ? req.file.filename : null;

    try {
        let query, params;
        if (gambar) {
            query = "UPDATE hewan SET jenis_hewan = ?, harga = ?, stok = ?, deskripsi = ?, gambar = ? WHERE id = ?";
            params = [jenis, harga, stok, deskripsi, gambar, id];
        } else {
            query = "UPDATE hewan SET jenis_hewan = ?, harga = ?, stok = ?, deskripsi = ? WHERE id = ?";
            params = [jenis, harga, stok, deskripsi, id];
        }

        await db.promise().query(query, params);
        res.json({ message: "Data hewan berhasil diupdate" });
    } catch (err) {
        console.error('❌ Error update hewan:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Update Stok Spesifik
app.put('/api/hewan/:id/stok', async (req, res) => {
    const { id } = req.params;
    const { stok, keterangan, aksi, jumlah } = req.body;

    try {
        const [cek] = await db.promise().query("SELECT stok FROM hewan WHERE id = ?", [id]);
        if (cek.length === 0) return res.status(404).json({ message: "Hewan tidak ditemukan" });

        await db.promise().query("UPDATE hewan SET stok = ? WHERE id = ?", [stok, id]);

        try {
            await db.promise().query(
                "INSERT INTO log_stok (hewan_id, stok_sebelum, stok_sesudah, aksi, jumlah, keterangan) VALUES (?, ?, ?, ?, ?, ?)",
                [id, cek[0].stok, stok, aksi || 'update', jumlah || 0, keterangan || 'Update stok manual']
            );
        } catch (logErr) {}

        res.json({ message: "Stok berhasil diupdate" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Hapus Hewan
app.delete('/api/hewan/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [cekPesanan] = await db.promise().query("SELECT id FROM pemesanan WHERE hewan_id = ?", [id]);
        if (cekPesanan.length > 0) {
            return res.status(400).json({ error: "Tidak dapat menghapus hewan ini karena terdapat riwayat pesanan." });
        }
        await db.promise().query("DELETE FROM log_stok WHERE hewan_id = ?", [id]);
        await db.promise().query("DELETE FROM hewan WHERE id = ?", [id]);
        res.json({ message: "Hewan berhasil dihapus" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 8. ROUTES: PESANAN (ORDERING)
// ==========================================

// Get Pesanan User
app.get('/api/pesanan', (req, res) => {
    const userId = req.query.user_id;
    
    if (!userId) {
        return res.status(400).json({ error: "user_id diperlukan" });
    }
    
    // Query yang lebih aman dengan LEFT JOIN dan error handling
    const sql = `
        SELECT 
            p.*, 
            h.jenis_hewan, 
            h.gambar,
            COALESCE(t.nama, '-') as nama_tukang,
            COALESCE(t.no_telepon, '-') as telp_tukang
        FROM pemesanan p 
        JOIN hewan h ON p.hewan_id = h.id 
        LEFT JOIN tukang_potong t ON p.tukang_potong_id = t.id
        WHERE p.user_id = ? 
        ORDER BY p.tanggal_pemesanan DESC
    `;
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('❌ Error mengambil pesanan:', err.message);
            
            // Fallback query tanpa JOIN tukang_potong jika tabel tidak ada
            const fallbackSql = `
                SELECT p.*, h.jenis_hewan, h.gambar
                FROM pemesanan p 
                JOIN hewan h ON p.hewan_id = h.id
                WHERE p.user_id = ? 
                ORDER BY p.tanggal_pemesanan DESC
            `;
            
            db.query(fallbackSql, [userId], (err2, results2) => {
                if (err2) {
                    return res.status(500).json({ 
                        error: "Gagal mengambil data pesanan",
                        detail: err2.message 
                    });
                }
                
                // Tambahkan field default untuk kompatibilitas
                const formattedResults = results2.map(item => ({
                    ...item,
                    nama_tukang: '-',
                    telp_tukang: '-'
                }));
                
                res.json(formattedResults);
            });
        } else {
            res.json(results);
        }
    });
});
// ==========================================
// 9. ROUTES: PEMBAYARAN (CICILAN & BUKTI)
// ==========================================

// A. Update Metode Pembayaran (Generate Cicilan jika perlu)
app.put('/api/pesanan/:id/metode', async (req, res) => {
    const { id } = req.params;
    const { metode_bayar, dp_percentage } = req.body;
    
    try {
        const [pesanan] = await db.promise().query("SELECT * FROM pemesanan WHERE id = ?", [id]);
        if (pesanan.length === 0) return res.status(404).json({ message: "Pesanan tak ditemukan" });
        
        const totalHarga = parseFloat(pesanan[0].total_harga);
        
        if (metode_bayar === 'cicilan') {
            const dpPersen = parseInt(dp_percentage) || 30;
            const dpNominal = Math.round((totalHarga * dpPersen) / 100 / 1000) * 1000;
            const sisa = totalHarga - dpNominal;
            const cicilanPerBulan = Math.round((sisa / 12) / 1000) * 1000;
            const jt = new Date(); jt.setDate(jt.getDate() + 30);
            
            await db.promise().query(
                `UPDATE pemesanan SET metode_bayar = 'cicilan', status_pembayaran = 'belum_dp', dp_nominal = ?, total_angsuran = 12, jatuh_tempo_cicilan = ? WHERE id = ?`,
                [dpNominal, jt.toISOString().split('T')[0], id]
            );
            
            // Generate Tabel Cicilan
            await db.promise().query("DELETE FROM cicilan WHERE pesanan_id = ?", [id]);
            for (let i = 1; i <= 12; i++) {
                const nextJt = new Date(); nextJt.setMonth(nextJt.getMonth() + i);
                let nom = (i === 12) ? (sisa - (cicilanPerBulan * 11)) : cicilanPerBulan;
                if (nom < 0) nom = cicilanPerBulan; 
                
                await db.promise().query(
                    `INSERT INTO cicilan (pesanan_id, angsuran_ke, nominal, jatuh_tempo, status) VALUES (?, ?, ?, ?, 'belum')`,
                    [id, i, nom, nextJt.toISOString().split('T')[0]]
                );
            }
        } else {
            // Cash
            await db.promise().query(
                `UPDATE pemesanan SET metode_bayar = 'cash', status_pembayaran = 'belum_dp', dp_nominal = ?, total_angsuran = 0 WHERE id = ?`,
                [totalHarga, id]
            );
        }
        res.json({ message: "Metode update sukses" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// B. GET Detail Cicilan & History
app.get('/api/pesanan/:id/cicilan', async (req, res) => {
    const { id } = req.params;
    try {
        const [pesanan] = await db.promise().query(
            `SELECT p.*, h.jenis_hewan, h.harga, u.nama_lengkap, u.email FROM pemesanan p
             JOIN hewan h ON p.hewan_id = h.id JOIN users u ON p.user_id = u.id WHERE p.id = ?`, [id]
        );
        if (pesanan.length === 0) return res.status(404).json({ message: "Tak ditemukan" });

        let cicilan = [];
        try { const [c] = await db.promise().query("SELECT * FROM cicilan WHERE pesanan_id = ? ORDER BY angsuran_ke", [id]); cicilan = c; } catch(e){}

        let history = [];
        try { const [h] = await db.promise().query("SELECT * FROM history_pembayaran WHERE pesanan_id = ? ORDER BY tanggal DESC", [id]); history = h; } catch(e){}

        res.json({ pesanan: pesanan[0], cicilan, history });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// C. Upload Bukti DP
app.post('/api/pesanan/:id/dp', uploadBukti.single('bukti'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: "File bukti wajib diupload!" });
    
    const bukti = req.file.filename;

    try {
        const [cekPesanan] = await db.promise().query("SELECT * FROM pemesanan WHERE id = ?", [id]);
        if (cekPesanan.length === 0) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
        
        const pesanan = cekPesanan[0];
        let dpNominal = (pesanan.metode_bayar === 'cicilan') ? Math.round((pesanan.total_harga * 30) / 100) : pesanan.total_harga;
        
        await db.promise().query(
            `UPDATE pemesanan SET dp_bukti = ?, dp_date = NOW(), status_pembayaran = 'dp', status_pesanan = 'dibayar' WHERE id = ?`,
            [bukti, id]
        );

        try {
            await db.promise().query(
                `INSERT INTO history_pembayaran (pesanan_id, jenis, nominal, bukti, keterangan) VALUES (?, 'dp', ?, ?, 'Pembayaran Down Payment')`,
                [id, dpNominal, bukti]
            );
        } catch (e) {}

        res.json({ message: "Bukti DP berhasil diupload", bukti: bukti, nominal: dpNominal });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// D. Upload Bukti Pelunasan (Cash)
app.post('/api/pesanan/:id/lunas', uploadBukti.single('bukti'), async (req, res) => {
    const { id } = req.params;
    const bukti = req.file ? req.file.filename : null;
    if (!bukti) return res.status(400).json({ message: "Wajib upload bukti" });

    try {
        const [p] = await db.promise().query("SELECT total_harga FROM pemesanan WHERE id=?", [id]);
        await db.promise().query(
            `UPDATE pemesanan SET dp_bukti=?, dp_date=NOW(), status_pembayaran='lunas', status_pesanan='selesai' WHERE id=?`,
            [bukti, id]
        );
        try {
            await db.promise().query(
                "INSERT INTO history_pembayaran (pesanan_id, jenis, nominal, bukti, keterangan) VALUES (?, 'pelunasan', ?, ?, 'Pelunasan Cash')", 
                [id, p[0]?.total_harga || 0, bukti]
            );
        } catch(e){}
        res.json({ message: "Sukses upload Pelunasan" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// E. Bayar Cicilan Bulanan
app.post('/api/pesanan/:id/cicilan/:angsuran_ke', uploadBukti.single('bukti'), async (req, res) => {
    const { id, angsuran_ke } = req.params;
    const bukti = req.file ? req.file.filename : null;
    if (!bukti) return res.status(400).json({ message: "Wajib upload bukti" });

    try {
        // Update Cicilan
        await db.promise().query(
            `UPDATE cicilan SET status = 'dibayar', tanggal_bayar = NOW(), bukti_bayar = ? WHERE pesanan_id = ? AND angsuran_ke = ?`,
            [bukti, id, angsuran_ke]
        );

        // Catat History
        try {
            const [cicilan] = await db.promise().query("SELECT nominal FROM cicilan WHERE pesanan_id = ? AND angsuran_ke = ?", [id, angsuran_ke]);
            if (cicilan.length > 0) {
                await db.promise().query(
                    `INSERT INTO history_pembayaran (pesanan_id, jenis, nominal, bukti, keterangan) VALUES (?, 'cicilan', ?, ?, 'Angsuran ke-${angsuran_ke}')`,
                    [id, cicilan[0].nominal, bukti]
                );
            }
        } catch(e){}

        // Cek Lunas Total
        const [sisaCicilan] = await db.promise().query("SELECT COUNT(*) as count FROM cicilan WHERE pesanan_id = ? AND status = 'belum'", [id]);
        if (sisaCicilan[0].count === 0) {
            await db.promise().query("UPDATE pemesanan SET status_pembayaran = 'lunas', status_pesanan = 'selesai' WHERE id = ?", [id]);
        }

        res.json({ message: "Cicilan berhasil dibayar" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// F. Endpoint Pembayaran Umum (Legacy/Simpel)
app.post('/api/bayar', uploadBukti.single('bukti'), async (req, res) => {
    const { id_pesanan } = req.body;
    const bukti = req.file ? req.file.filename : null;
    if (!bukti || !id_pesanan) return res.status(400).json({ message: "Data tidak lengkap" });

    try {
        await db.promise().query(
            `UPDATE pemesanan SET dp_bukti = ?, dp_date = NOW(), status_pembayaran = 'dp', status_pesanan = 'dibayar' WHERE id = ?`,
            [bukti, id_pesanan]
        );
        res.json({ message: "Pembayaran berhasil diupload", bukti: bukti });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 10. ROUTES: NOTIFIKASI
// ==========================================

app.get('/api/notifikasi/user', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "User ID diperlukan" });

    try {
        const [results] = await db.promise().query(
            `SELECT n.* FROM notifikasi n 
             WHERE n.user_id = ? OR (n.role_target = 'pelanggan' AND n.user_id IS NULL) OR n.role_target = 'semua'
             ORDER BY n.created_at DESC LIMIT 20`,
            [user_id]
        );
        res.json(results);
    } catch (err) { res.json([]); } // Return empty jika error/tabel tak ada
});

app.post('/api/notifikasi/baca', async (req, res) => {
    try {
        await db.promise().query("UPDATE notifikasi SET is_read = 1 WHERE id = ?", [req.body.id]);
        res.json({ message: "Dibaca" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/notifikasi/user/:user_id', async (req, res) => {
    try {
        await db.promise().query("DELETE FROM notifikasi WHERE user_id = ?", [req.params.user_id]);
        res.json({ message: "Dihapus" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notifikasi/baca-semua', async (req, res) => {
    try {
        await db.promise().query("UPDATE notifikasi SET is_read = 1 WHERE user_id = ?", [req.body.user_id]);
        res.json({ message: "Semua dibaca" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 11. ROUTES: ADMIN & DASHBOARD
// ==========================================

// Dashboard Stats (DARI FILE 2 - PENTING)
app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
        const [pending] = await db.promise().query("SELECT COUNT(*) as count FROM pemesanan WHERE status_pesanan = 'pending'");
        const [sales] = await db.promise().query("SELECT SUM(total_harga) as total FROM pemesanan WHERE status_pesanan IN ('dibayar', 'selesai')");
        const [hewan] = await db.promise().query("SELECT jenis_hewan, stok FROM hewan ORDER BY stok ASC");

        res.json({
            pendingCount: pending[0].count,
            totalSales: sales[0].total || 0,
            stokData: hewan
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Semua Pesanan Admin
app.get('/api/admin/pesanan', (req, res) => {
    db.query(`SELECT p.*, u.nama_lengkap, u.email, h.jenis_hewan FROM pemesanan p JOIN users u ON p.user_id = u.id JOIN hewan h ON p.hewan_id = h.id ORDER BY p.tanggal_pemesanan DESC`, (err, resu) => res.json(resu));
});

// Delete Pesanan & Return Stok
app.delete('/api/admin/pesanan/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [pesanan] = await db.promise().query("SELECT hewan_id, jumlah FROM pemesanan WHERE id = ?", [id]);
        if (pesanan.length > 0) {
            await db.promise().query("UPDATE hewan SET stok = stok + ? WHERE id = ?", [pesanan[0].jumlah, pesanan[0].hewan_id]);
            try { await db.promise().query("DELETE FROM cicilan WHERE pesanan_id = ?", [id]); } catch (e) {}
            try { await db.promise().query("DELETE FROM history_pembayaran WHERE pesanan_id = ?", [id]); } catch (e) {}
        }
        await db.promise().query("DELETE FROM pemesanan WHERE id = ?", [id]);
        res.json({ message: "Pesanan dihapus & stok dikembalikan" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Status Pesanan
app.put('/api/admin/pesanan/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        const [pesanan] = await db.promise().query("SELECT * FROM pemesanan WHERE id = ?", [id]);
        if (pesanan.length === 0) return res.status(404).json({ message: "Pesanan tak ditemukan" });
        
        // Cek Cicilan Lunas sebelum 'selesai'
        if (pesanan[0].status_pesanan === 'dibayar' && status === 'selesai' && pesanan[0].metode_bayar === 'cicilan') {
            const [cicilan] = await db.promise().query("SELECT COUNT(*) as belum FROM cicilan WHERE pesanan_id = ? AND status='belum'", [id]);
            if (cicilan[0].belum > 0) return res.status(400).json({ message: "Cicilan belum lunas!" });
        }
        
        await db.promise().query("UPDATE pemesanan SET status_pesanan = ? WHERE id = ?", [status, id]);
        
        // Notifikasi ke User
        try {
            await kirimNotifikasiLengkap(pesanan[0].user_id, `Status Pesanan #${id}`, `Status berubah menjadi: ${status}`);
        } catch(e){}
        
        res.json({ message: "Status diupdate" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 12. ROUTES: TUKANG POTONG & JADWAL
// ==========================================

app.get('/api/tukang', (req, res) => {
    db.query("SELECT * FROM tukang_potong ORDER BY nama ASC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/tukang', (req, res) => {
    const { nama, keahlian, no_telepon } = req.body;
    db.query("INSERT INTO tukang_potong (nama, keahlian, no_telepon) VALUES (?, ?, ?)", [nama, keahlian, no_telepon], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Tukang potong ditambahkan" });
    });
});

app.delete('/api/tukang/:id', (req, res) => {
    db.query("DELETE FROM tukang_potong WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Data dihapus" });
    });
});

app.put('/api/tukang/:id/status', (req, res) => {
    db.query("UPDATE tukang_potong SET status = ? WHERE id = ?", [req.body.status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Status diperbarui" });
    });
});

app.get('/api/jadwal/view', (req, res) => {
    const { tanggal } = req.query;
    const sql = `
        SELECT p.id, p.jam_potong, p.jumlah, p.metode_pengambilan, 
               h.jenis_hewan, u.nama_lengkap as pemesan, t.nama as nama_tukang
        FROM pemesanan p
        JOIN hewan h ON p.hewan_id = h.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN tukang_potong t ON p.tukang_potong_id = t.id
        WHERE p.jadwal_pemotongan = ? AND p.status_pesanan IN ('dibayar', 'selesai', 'diproses')
        ORDER BY p.jam_potong ASC
    `;
    db.query(sql, [tanggal], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ tanggal, total_hewan: results.reduce((sum, item) => sum + item.jumlah, 0), pesanan: results });
    });
});

app.put('/api/pesanan/:id/jadwal', (req, res) => {
    const { jam_potong, tukang_id } = req.body;
    db.query("UPDATE pemesanan SET jam_potong = ?, tukang_potong_id = ? WHERE id = ?", [jam_potong, tukang_id, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Jadwal dan petugas diupdate" });
    });
});

// ==========================================
// 13. CRON JOBS & ERROR HANDLING
// ==========================================

cron.schedule('0 9 * * *', async () => { 
    console.log('⏰ Cron job running at 9 AM...');
    // Logika pengingat bayar cicilan bisa ditaruh di sini
});

// Handle 404 & Serve Default Images
app.use((req, res) => {
    if (req.url.startsWith('/uploads/hewan/')) return res.sendFile(path.join(__dirname, 'public', 'images', 'default-hewan.jpg'));
    if (req.url.startsWith('/uploads/bukti/')) return res.sendFile(path.join(__dirname, 'public', 'images', 'default-bukti.jpg'));
    res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});


// ==========================================
// 14. START SERVER
// ==========================================

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📁 Hewan Upload: ${path.join(__dirname, dirHewan)}`);
    console.log(`📁 Bukti Upload: ${path.join(__dirname, dirBukti)}`);
});