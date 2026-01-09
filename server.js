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

// Menggunakan createPool agar fitur Transaksi (BeginTransaction) berjalan lancar
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',       
    password: '',       
    database: 'db_peternakan',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Cek koneksi pool sederhana
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Gagal koneksi database:', err.message);
    } else {
        console.log('✅ Terhubung ke Database MySQL (Pool)');
        connection.release();
    }
});

// Helper Notifikasi
async function createNotifikasi(userId, roleTarget, judul, pesan, tipe) {
    try {
        const query = `INSERT INTO notifikasi (user_id, role_target, judul, pesan, tipe, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())`;
        await db.promise().query(query, [userId, roleTarget, judul, pesan, tipe]);
    } catch (err) {
        console.error("Gagal buat notifikasi:", err);
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
// 5. ROUTES: HEWAN & KESEHATAN (CRUD)
// ==========================================

app.get('/api/hewan', (req, res) => {
    // Menambahkan filter kategori jika ada query param
    const kategori = req.query.kategori;
    let sql = "SELECT * FROM hewan";
    let params = [];
    
    if (kategori) {
        sql += " WHERE kategori = ?";
        params.push(kategori);
    }
    sql += " ORDER BY id DESC";

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/hewan-tersedia', (req, res) => {
    db.query("SELECT * FROM hewan WHERE stok > 0 ORDER BY id DESC", (err, results) => res.json(results));
});

app.get('/api/hewan/:id', (req, res) => {
    db.query("SELECT * FROM hewan WHERE id = ?", [req.params.id], (err, results) => res.json(results[0] || {}));
});

// [BARU] GET Riwayat Kesehatan Hewan
app.get('/api/hewan/:id/kesehatan', async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM log_kesehatan WHERE hewan_id = ? ORDER BY tanggal_periksa DESC", 
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// [UPDATE] Insert Hewan dengan data Kategori & Usia (Optional jika tabel sudah diupdate)
app.post('/api/hewan', uploadHewan.single('gambar'), async (req, res) => {
    const { jenis, harga, stok, deskripsi, kategori, usia_bulan } = req.body;
    const gambar = req.file ? req.file.filename : null;
    try {
        // Cek dulu apakah kolom kategori dan usia_bulan sudah ada di database atau gunakan default
        const query = `
            INSERT INTO hewan (jenis_hewan, harga, stok, deskripsi, gambar, kategori, usia_bulan) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            jenis, harga, stok, deskripsi, gambar, 
            kategori || 'reguler', usia_bulan || 0
        ];
        
        const [result] = await db.promise().query(query, params);
        res.status(201).json({ message: "Hewan berhasil ditambahkan", id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/hewan/:id', uploadHewan.single('gambar'), async (req, res) => {
    const { id } = req.params;
    const { jenis, harga, stok, deskripsi, kategori, usia_bulan } = req.body;
    const gambar = req.file ? req.file.filename : null;
    try {
        let query = "UPDATE hewan SET jenis_hewan=?, harga=?, stok=?, deskripsi=?, kategori=?, usia_bulan=? WHERE id=?";
        let params = [jenis, harga, stok, deskripsi, kategori || 'reguler', usia_bulan || 0, id];
        
        if (gambar) {
            query = "UPDATE hewan SET jenis_hewan=?, harga=?, stok=?, deskripsi=?, kategori=?, usia_bulan=?, gambar=? WHERE id=?";
            params = [jenis, harga, stok, deskripsi, kategori || 'reguler', usia_bulan || 0, gambar, id];
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

// [BARU] Input Kesehatan Hewan (Admin)
app.post('/api/admin/hewan/:id/kesehatan', async (req, res) => {
    const { tanggal, kondisi, tindakan, dokter } = req.body;
    try {
        await db.promise().query(
            "INSERT INTO log_kesehatan (hewan_id, tanggal_periksa, kondisi, tindakan, nama_dokter) VALUES (?, ?, ?, ?, ?)",
            [req.params.id, tanggal, kondisi, tindakan, dokter]
        );
        res.json({ message: "Log kesehatan berhasil dicatat" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 6. ROUTES: PESANAN & TRANSAKSI
// ==========================================

app.get('/api/pesanan', (req, res) => {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: "user_id diperlukan" });
    
    const sql = `
        SELECT p.*, h.jenis_hewan, h.gambar, h.kategori
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

// ==========================================
// API KHUSUS CICILAN (USER & ADMIN)
// ==========================================

// 1. [USER] Upload Bukti Bayar Cicilan (Termasuk DP)
app.post('/api/pesanan/:id/cicilan/:angsuranKe', uploadBukti.single('bukti'), async (req, res) => {
    const { id, angsuranKe } = req.params;
    const bukti = req.file ? req.file.filename : null;

    if (!bukti) return res.status(400).json({ message: "File bukti wajib diupload" });

    try {
        // Update tabel cicilan
        await db.promise().query(
            "UPDATE cicilan SET bukti_bayar = ?, status = 'menunggu_verifikasi', tanggal_bayar = NOW() WHERE id_pemesanan = ? AND angsuran_ke = ?", 
            [bukti, id, angsuranKe]
        );

        // Jika ini adalah DP (angsuran ke-0), update juga status pesanan utama jadi 'dibayar' (tapi pembayaran masih 'dp')
        if (parseInt(angsuranKe) === 0) {
            await db.promise().query(
                "UPDATE pemesanan SET dp_bukti = ?, status_pesanan = 'dibayar', status_pembayaran = 'dp' WHERE id = ?", 
                [bukti, id]
            );
        }

        // Notifikasi ke Admin
        await createNotifikasi(null, 'admin', 'Pembayaran Cicilan Masuk', `User mengupload bukti untuk Angsuran ke-${angsuranKe} (Order #${id})`, 'pembayaran');

        res.json({ message: "Bukti pembayaran berhasil dikirim" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. [USER] Cek Cicilan Aktif
app.get('/api/user/cicilan-aktif', async (req, res) => {
    const { user_id } = req.query;
    try {
        // Cari pesanan yang metodenya cicilan dan belum selesai/batal
        const [pesanan] = await db.promise().query(`
            SELECT p.*, h.jenis_hewan 
            FROM pemesanan p 
            JOIN hewan h ON p.hewan_id = h.id 
            WHERE p.user_id = ? AND p.metode_bayar = 'cicilan' AND p.status_pesanan NOT IN ('dibatalkan', 'selesai')
            ORDER BY p.id DESC LIMIT 1
        `, [user_id]);
        
        if (pesanan.length === 0) return res.json({ ada_cicilan: false, message: "Tidak ada tagihan aktif." });

        // Ambil detail jadwal cicilan
        const [jadwal] = await db.promise().query("SELECT * FROM cicilan WHERE id_pemesanan = ? ORDER BY angsuran_ke ASC", [pesanan[0].id]);
        
        // Hitung statistik
        const total = parseFloat(pesanan[0].total_harga);
        const dibayar = jadwal
            .filter(j => j.status === 'lunas') // Hanya hitung yang sudah lunas sah
            .reduce((acc, curr) => acc + parseFloat(curr.nominal), 0);
        
        res.json({
            ada_cicilan: true,
            info_pesanan: pesanan[0],
            jadwal: jadwal,
            stats: { total, dibayar, progress: Math.round((dibayar/total)*100) }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. [ADMIN] Lihat Detail Cicilan Pesanan Tertentu
app.get('/api/pesanan/:id/cicilan', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`SELECT p.*, h.jenis_hewan, u.nama_lengkap FROM pemesanan p JOIN hewan h ON p.hewan_id = h.id JOIN users u ON p.user_id = u.id WHERE p.id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Tidak ditemukan' });
        
        const [cicilan] = await db.promise().query("SELECT * FROM cicilan WHERE id_pemesanan = ? ORDER BY angsuran_ke ASC", [req.params.id]);
        res.json({ pesanan: rows[0], cicilan });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. [ADMIN] Verifikasi Pembayaran Cicilan
app.put('/api/admin/cicilan/:id/verifikasi', async (req, res) => {
    const { id } = req.params; // ID tabel cicilan
    try {
        // Update status cicilan jadi Lunas
        await db.promise().query("UPDATE cicilan SET status = 'lunas' WHERE id = ?", [id]);

        // Cek ID Pemesanan
        const [rows] = await db.promise().query("SELECT id_pemesanan FROM cicilan WHERE id = ?", [id]);
        if (rows.length > 0) {
            const idPesanan = rows[0].id_pemesanan;
            
            // Cek apakah semua cicilan sudah lunas?
            const [sisa] = await db.promise().query("SELECT COUNT(*) as belum FROM cicilan WHERE id_pemesanan = ? AND status != 'lunas'", [idPesanan]);
            
            // Jika sisa 0 (Lunas Semua)
            if (sisa[0].belum === 0) {
                // Update Pesanan jadi Selesai
                await db.promise().query("UPDATE pemesanan SET status_pesanan = 'selesai', status_pembayaran = 'lunas' WHERE id = ?", [idPesanan]);
                
                // Catat Laporan Keuangan
                const [p] = await db.promise().query("SELECT total_harga FROM pemesanan WHERE id = ?", [idPesanan]);
                await db.promise().query("INSERT INTO laporan_keuangan (pesanan_id, jenis_transaksi, jumlah, tanggal) VALUES (?, 'pemasukan', ?, NOW())", [idPesanan, p[0].total_harga]);
            }
        }
        res.json({ message: "Pembayaran diverifikasi" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// [MODIFIKASI] API: BUAT PESANAN (QURBAN/AQIQAH)
// ==========================================

app.post('/api/pesan', async (req, res) => {    
    const { 
        user_id, hewan_id, jumlah, total_harga, jadwal, metode_bayar, opsi_pemotongan,
        metode_pengambilan, lokasi_pengiriman, tipe_ibadah, nama_shohibul_qurban, 
        nama_anak, nama_ayah_anak, tanggal_lahir_anak
    } = req.body;

    let connection;
    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        // [BARU] 1. CEK ROLE USER (Admin Dilarang Pesan)
        const [userCheck] = await connection.query("SELECT role FROM users WHERE id = ?", [user_id]);
        if (userCheck.length === 0) throw new Error("User tidak ditemukan");
        
        if (userCheck[0].role === 'admin') {
            throw new Error("⛔ Admin tidak diperbolehkan membuat pesanan pribadi. Gunakan akun pelanggan untuk memesan.");
        }

        // 2. Cek Stok
        const [hewan] = await connection.query("SELECT stok, jenis_hewan FROM hewan WHERE id = ?", [hewan_id]);
        if (hewan.length === 0 || hewan[0].stok < jumlah) {
            throw new Error("Stok hewan tidak mencukupi");
        }

        // ... (lanjutkan kode INSERT pesanan seperti sebelumnya sampai commit) ...
        
        // 3. Kurangi Stok
        await connection.query("UPDATE hewan SET stok = stok - ? WHERE id = ?", [jumlah, hewan_id]);

        // 4. Buat Pesanan
        const [result] = await connection.query(`
            INSERT INTO pemesanan 
            (user_id, hewan_id, jumlah, total_harga, tanggal_pemesanan, jadwal_pemotongan, 
             metode_bayar, status_pesanan, status_pembayaran, opsi_pemotongan,
             metode_pengambilan, lokasi_pengiriman, tipe_ibadah, 
             nama_shohibul_qurban, nama_anak, nama_ayah_anak, tanggal_lahir_anak) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?, 'belum_bayar', 'belum_dibayar', ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user_id, hewan_id, jumlah, total_harga, jadwal, metode_bayar, 
            opsi_pemotongan || 'potong', metode_pengambilan || 'ambil_sendiri', 
            lokasi_pengiriman, tipe_ibadah || 'daging_saja', 
            nama_shohibul_qurban, nama_anak, nama_ayah_anak, tanggal_lahir_anak
        ]);

        const id_pesanan = result.insertId;

        // 5. Generate Cicilan jika dipilih
        if (metode_bayar === 'cicilan') {
            const dp = Math.round(total_harga * 0.3);
            const sisa = total_harga - dp;
            const cicilanPerBulan = Math.round(sisa / 12);
            
            await connection.query("INSERT INTO cicilan (id_pemesanan, angsuran_ke, nominal, jatuh_tempo, status) VALUES (?, 0, ?, NOW(), 'belum_bayar')", [id_pesanan, dp]);

            let tgl = new Date();
            for (let i = 1; i <= 12; i++) {
                tgl.setMonth(tgl.getMonth() + 1);
                await connection.query("INSERT INTO cicilan (id_pemesanan, angsuran_ke, nominal, jatuh_tempo, status) VALUES (?, ?, ?, ?, 'belum_bayar')", [id_pesanan, i, cicilanPerBulan, tgl.toISOString().slice(0, 10)]);
            }
        }

        // 6. Notifikasi Admin
        await createNotifikasi(null, 'admin', 'Pesanan Baru Masuk', `Order #${id_pesanan}: ${hewan[0].jenis_hewan} (${jumlah} ekor)`, 'info');

        await connection.commit();
        res.status(201).json({ message: "Pesanan berhasil dibuat", id_pesanan: id_pesanan });

    } catch (err) {
        if (connection) await connection.rollback();
        // console.error("Error Transaksi:", err); // Opsional
        res.status(403).json({ message: err.message }); // Return error ke frontend
    } finally {
        if (connection) connection.release();
    }
});
// ==========================================
// 7. ROUTES: ADMIN FEATURES & DOKUMENTASI
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
    const { status } = req.body; // 'selesai', 'ditolak', 'diproses'
    try {
        await db.promise().query("UPDATE pemesanan SET status_pesanan = ? WHERE id = ?", [status, id]);
        
        // Logika tambahan: Jika status 'selesai', catat ke laporan keuangan otomatis
        if (status === 'selesai') {
            const [pesanan] = await db.promise().query("SELECT total_harga FROM pemesanan WHERE id = ?", [id]);
            if (pesanan.length > 0) {
                await db.promise().query(
                    "INSERT INTO laporan_keuangan (pesanan_id, jenis_transaksi, jumlah, tanggal) VALUES (?, 'pemasukan', ?, NOW())",
                    [id, pesanan[0].total_harga]
                );
            }
        }

        res.json({ message: "Status pesanan berhasil diupdate" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [BARU] Upload Dokumentasi & Sertifikat
app.post('/api/admin/pesanan/:id/dokumentasi', uploadBukti.single('file_dokumentasi'), async (req, res) => {
    const { id } = req.params;
    const { link_video } = req.body;
    const file = req.file ? req.file.filename : null; // Foto/Sertifikat

    try {
        let sql = "UPDATE pemesanan SET link_video_pemotongan = ?, status_distribusi = 'selesai' WHERE id = ?";
        let params = [link_video, id];

        if (file) {
            sql = "UPDATE pemesanan SET link_video_pemotongan = ?, sertifikat_file = ?, status_distribusi = 'selesai' WHERE id = ?";
            params = [link_video, file, id];
        }

        await db.promise().query(sql, params);
        
        // Notif ke User
        const [pesanan] = await db.promise().query("SELECT user_id FROM pemesanan WHERE id = ?", [id]);
        if(pesanan.length > 0) {
            await createNotifikasi(pesanan[0].user_id, 'pelanggan', 'Dokumentasi Tersedia', 'Foto/Video penyembelihan & Sertifikat sudah tersedia.', 'info');
        }

        res.json({ message: "Dokumentasi berhasil diupdate" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/pesanan/:id', async (req, res) => {
    const { id } = req.params;
    try {
        try { await db.promise().query("DELETE FROM cicilan WHERE id_pemesanan = ?", [id]); } catch(e){}
        await db.promise().query("DELETE FROM pemesanan WHERE id = ?", [id]);
        res.json({ message: "Pesanan berhasil dihapus" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
        const [pending] = await db.promise().query("SELECT COUNT(*) as total FROM pemesanan WHERE status_pesanan = 'dibayar'");
        const [sales] = await db.promise().query("SELECT SUM(total_harga) as total FROM pemesanan WHERE status_pesanan = 'selesai'");
        const [hewan] = await db.promise().query("SELECT id, jenis_hewan, stok FROM hewan ORDER BY stok ASC");
        
        const stats = {
            pendingCount: pending[0].total || 0,
            totalSales: sales[0].total || 0,
            stokData: hewan
        };

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: "Gagal memuat statistik dashboard" });
    }
});

// ==========================================
// 8. ROUTES: JADWAL & NOTIFIKASI
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

app.get('/api/notifikasi', (req, res) => {
    const { user_id, role } = req.query;
    let sql = "";
    let params = [];

    if (role === 'admin') {
        sql = "SELECT * FROM notifikasi WHERE role_target = 'admin' ORDER BY created_at DESC LIMIT 20";
    } else {
        sql = "SELECT * FROM notifikasi WHERE (user_id = ? OR (role_target = 'pelanggan' AND user_id IS NULL)) ORDER BY created_at DESC LIMIT 20";
        params = [user_id];
    }

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const unreadCount = results.filter(n => n.is_read === 0).length;
        res.json({ notifikasi: results, unread: unreadCount });
    });
});

app.put('/api/notifikasi/:id/read', (req, res) => {
    db.query("UPDATE notifikasi SET is_read = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Notifikasi dibaca" });
    });
});

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

app.post('/api/pesanan/:id/cicilan/:angsuranKe', uploadBukti.single('bukti'), async (req, res) => {
    const { id, angsuranKe } = req.params;
    const bukti = req.file ? req.file.filename : null;

    if (!bukti) {
        return res.status(400).json({ message: "File bukti pembayaran wajib diupload" });
    }

    try {
        const [cek] = await db.promise().query(
            "SELECT * FROM cicilan WHERE id_pemesanan = ? AND angsuran_ke = ?", 
            [id, angsuranKe]
        );

        if (cek.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: "Data tagihan cicilan tidak ditemukan" });
        }

        const queryUpdate = `
            UPDATE cicilan 
            SET bukti_bayar = ?, status = 'menunggu_verifikasi', tanggal_bayar = NOW() 
            WHERE id_pemesanan = ? AND angsuran_ke = ?
        `;

        await db.promise().query(queryUpdate, [bukti, id, angsuranKe]);

        await db.promise().query(
            "INSERT INTO history_pembayaran (pesanan_id, jenis, nominal, metode, bukti, keterangan) VALUES (?, 'cicilan', ?, 'transfer', ?, ?)",
            [id, cek[0].nominal, bukti, `Pembayaran Angsuran ke-${angsuranKe}`]
        );

        await createNotifikasi(
            null, 
            'admin', 
            'Pembayaran Cicilan Baru', 
            `Ada pembayaran cicilan ke-${angsuranKe} untuk Pesanan #${id}. Segera verifikasi.`, 
            'pembayaran'
        );

        res.json({ message: "Bukti pembayaran berhasil diupload dan menunggu verifikasi." });

    } catch (err) {
        console.error("❌ Error upload cicilan:", err);
        res.status(500).json({ error: "Gagal memproses pembayaran: " + err.message });
    }
});

app.get('/api/user/cicilan-aktif', async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: "User ID diperlukan" });
    }
    
    try {
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

        if (pesanan.length === 0) {
            return res.json({ 
                ada_cicilan: false, 
                message: "Tidak ada pesanan cicilan aktif saat ini." 
            });
        }

        const dataPesanan = pesanan[0];

        const queryJadwal = `
            SELECT * FROM cicilan 
            WHERE id_pemesanan = ? 
            ORDER BY angsuran_ke ASC
        `;

        const [jadwal] = await db.promise().query(queryJadwal, [dataPesanan.id]);

        if (jadwal.length === 0) {
            return res.json({ 
                ada_cicilan: false, 
                error: "Data jadwal cicilan tidak ditemukan." 
            });
        }

        const totalHarga = parseFloat(dataPesanan.total_harga);
        const sudahBayar = jadwal
            .filter(item => item.status === 'lunas' || item.status === 'menunggu_verifikasi')
            .reduce((total, item) => total + parseFloat(item.nominal), 0);
            
        const sisaHutang = totalHarga - sudahBayar;
        const persentase = totalHarga > 0 ? (sudahBayar / totalHarga) * 100 : 0;

        res.json({
            ada_cicilan: true,
            info_pesanan: dataPesanan,
            jadwal: jadwal, 
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


// [TAMBAHAN] API Update Profil User
app.put('/api/user/:id', async (req, res) => {
    const { id } = req.params;
    const { nama, telepon, alamat, password } = req.body;
    
    try {
        let sql = "UPDATE users SET nama_lengkap = ?, no_telepon = ?, alamat = ? WHERE id = ?";
        let params = [nama, telepon, alamat, id];

        if (password && password.trim() !== "") {
            const hashedPassword = bcrypt.hashSync(password, 8);
            sql = "UPDATE users SET nama_lengkap = ?, no_telepon = ?, alamat = ?, password = ? WHERE id = ?";
            params = [nama, telepon, alamat, hashedPassword, id];
        }

        await db.promise().query(sql, params);
        res.json({ message: "Profil berhasil diupdate" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/cicilan/:id/verifikasi', async (req, res) => {
    const { id } = req.params; // ID tabel cicilan
    
    try {
        // 1. Update status cicilan ini jadi Lunas
        await db.promise().query("UPDATE cicilan SET status = 'lunas' WHERE id = ?", [id]);

        // 2. Cek apakah ada cicilan lain yang belum lunas untuk pesanan ini
        // Ambil id_pemesanan dulu
        const [rows] = await db.promise().query("SELECT id_pemesanan FROM cicilan WHERE id = ?", [id]);
        
        if (rows.length > 0) {
            const idPesanan = rows[0].id_pemesanan;

            // Hitung sisa tagihan
            const [sisa] = await db.promise().query("SELECT COUNT(*) as belum FROM cicilan WHERE id_pemesanan = ? AND status != 'lunas'", [idPesanan]);

            // Jika sisa 0 (Lunas Semua), update status pesanan utama jadi 'selesai'
            if (sisa[0].belum === 0) {
                await db.promise().query("UPDATE pemesanan SET status_pesanan = 'selesai', status_pembayaran = 'lunas' WHERE id = ?", [idPesanan]);
                
                // Catat ke Laporan Keuangan (Total Omset)
                const [p] = await db.promise().query("SELECT total_harga FROM pemesanan WHERE id = ?", [idPesanan]);
                await db.promise().query("INSERT INTO laporan_keuangan (pesanan_id, jenis_transaksi, jumlah, tanggal) VALUES (?, 'pemasukan', ?, NOW())", [idPesanan, p[0].total_harga]);
            }
        }

        res.json({ message: "Angsuran berhasil diverifikasi" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 9. ERROR HANDLING & START SERVER
// ==========================================

app.use((req, res) => {
    if (req.url.startsWith('/uploads/')) {
        return res.status(404).end();   
    }
    res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});