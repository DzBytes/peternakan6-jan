const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// 1. SETUP
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Folder public bisa diakses langsung

// 2. DATABASE
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_peternakan' // Pastikan nama DB sesuai
});

db.connect((err) => {
    if (err) console.error('❌ Gagal koneksi database:', err);
    else console.log('✅ Terhubung ke Database MySQL');
});

// 3. CONFIG UPLOAD
const dirHewan = 'public/uploads/hewan';
const dirBukti = 'public/uploads/bukti';
if (!fs.existsSync(dirHewan)) fs.mkdirSync(dirHewan, { recursive: true });
if (!fs.existsSync(dirBukti)) fs.mkdirSync(dirBukti, { recursive: true });

const storageHewan = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirHewan),
    filename: (req, file, cb) => cb(null, 'hewan-' + Date.now() + path.extname(file.originalname))
});
const uploadHewan = multer({ storage: storageHewan });

const storageBukti = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirBukti),
    filename: (req, file, cb) => cb(null, 'bukti-' + Date.now() + path.extname(file.originalname))
});
const uploadBukti = multer({ storage: storageBukti });

// ==========================================
// API ROUTES
// ==========================================

// --- AUTH ---
app.post('/api/register', async (req, res) => {
    const { nama, email, password, no_telepon, alamat } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);
    try {
        const [result] = await db.promise().query(
            "INSERT INTO users (nama_lengkap, email, password, no_telepon, alamat) VALUES (?, ?, ?, ?, ?)",
            [nama, email, hashedPassword, no_telepon, alamat]
        );
        res.status(201).json({ message: "Registrasi berhasil", userId: result.insertId });
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

// --- DASHBOARD ADMIN (PENTING UNTUK STATISTIK) ---
app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
        // Hitung Pesanan Pending
        const [pending] = await db.promise().query("SELECT COUNT(*) as count FROM pemesanan WHERE status_pesanan = 'pending'");
        
        // Hitung Total Penjualan (Semua waktu, biar tidak 0 jika data lama)
        const [sales] = await db.promise().query("SELECT SUM(total_harga) as total FROM pemesanan WHERE status_pesanan IN ('dibayar', 'selesai')");
        
        // Ambil Data Stok
        const [hewan] = await db.promise().query("SELECT jenis_hewan, stok FROM hewan ORDER BY stok ASC");

        console.log("📊 Request Dashboard Berhasil. Data Stok:", hewan.length, "item");
        
        res.json({
            pendingCount: pending[0].count,
            totalSales: sales[0].total || 0,
            stokData: hewan
        });
    } catch (err) {
        console.error("❌ Error Dashboard:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- CRUD HEWAN (PENTING UNTUK STOK) ---
app.get('/api/hewan', (req, res) => {
    db.query("SELECT * FROM hewan ORDER BY id DESC", (err, resu) => res.json(resu));
});

app.post('/api/hewan', uploadHewan.single('gambar'), async (req, res) => {
    const { jenis, harga, stok, deskripsi } = req.body;
    const gambar = req.file ? req.file.filename : null;
    try {
        await db.promise().query("INSERT INTO hewan (jenis_hewan, harga, stok, deskripsi, gambar) VALUES (?, ?, ?, ?, ?)", [jenis, harga, stok, deskripsi, gambar]);
        res.json({ message: "Hewan ditambah" });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.put('/api/hewan/:id', uploadHewan.single('gambar'), async (req, res) => {
    const { jenis, harga, stok, deskripsi } = req.body;
    const id = req.params.id;
    try {
        let sql = "UPDATE hewan SET jenis_hewan=?, harga=?, stok=?, deskripsi=? WHERE id=?";
        let params = [jenis, harga, stok, deskripsi, id];
        if (req.file) {
            sql = "UPDATE hewan SET jenis_hewan=?, harga=?, stok=?, deskripsi=?, gambar=? WHERE id=?";
            params = [jenis, harga, stok, deskripsi, req.file.filename, id];
        }
        await db.promise().query(sql, params);
        res.json({ message: "Update berhasil" });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.delete('/api/hewan/:id', async (req, res) => {
    try {
        await db.promise().query("DELETE FROM hewan WHERE id = ?", [req.params.id]);
        res.json({ message: "Hapus berhasil" });
    } catch(e) { res.status(500).json({error: "Gagal hapus, mungkin ada relasi data"}); }
});

// --- PESANAN (MOCKUP UNTUK MELENGKAPI) ---
app.get('/api/admin/pesanan', (req, res) => {
    db.query("SELECT p.*, u.nama_lengkap, h.jenis_hewan FROM pemesanan p JOIN users u ON p.user_id = u.id JOIN hewan h ON p.hewan_id = h.id ORDER BY p.tanggal_pemesanan DESC", (err, r) => res.json(r));
});

// START
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`👉 Coba buka http://localhost:3000/api/admin/dashboard-stats untuk cek data`);
});