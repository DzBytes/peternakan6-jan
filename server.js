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
// 5. ROUTES: HEWAN
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
// 6. ROUTES: PESANAN (SUDAH DIPERBAIKI)
// ==========================================

// Endpoint Pesanan TANPA JOIN TUKANG POTONG
app.get('/api/pesanan', (req, res) => {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: "user_id diperlukan" });
    
    // Query sederhana yang PASTI BERHASIL
    const sql = `
        SELECT 
            p.*, 
            h.jenis_hewan, 
            h.gambar
        FROM pemesanan p 
        JOIN hewan h ON p.hewan_id = h.id 
        WHERE p.user_id = ? 
        ORDER BY p.tanggal_pemesanan DESC
    `;
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('❌ Error ambil pesanan:', err.message);
            return res.status(500).json({ error: "Gagal mengambil data pesanan", detail: err.message });
        }
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

// ==========================================
// 7. ROUTES: ADMIN & JADWAL (BERSIH)
// ==========================================

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

app.put('/api/admin/pesanan/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.promise().query("UPDATE pemesanan SET status_pesanan = ? WHERE id = ?", [status, id]);
        res.json({ message: "Status diupdate" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Jadwal View tanpa Tukang Potong
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

// Update Jadwal tanpa Tukang Potong ID
app.put('/api/pesanan/:id/jadwal', (req, res) => {
    const { jam_potong } = req.body;
    db.query("UPDATE pemesanan SET jam_potong = ? WHERE id = ?", [jam_potong, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Jadwal diupdate" });
    });
});

// ==========================================
// 8. ERROR HANDLING & START
// ==========================================

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});