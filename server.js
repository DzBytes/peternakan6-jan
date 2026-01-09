const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// ==========================================
// 1. CONFIGURATION & MIDDLEWARE
// ==========================================

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads/hewan', express.static(path.join(__dirname, 'public/uploads/hewan')));
app.use('/uploads/bukti', express.static(path.join(__dirname, 'public/uploads/bukti')));

// ==========================================
// 2. MULTER (UPLOAD)
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

const uploadHewan = multer({ storage: storageHewan });
const uploadBukti = multer({ storage: storageBukti });

// ==========================================
// 3. DATABASE
// ==========================================

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_peternakan',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
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
// 4. ROUTES: AUTH & USER
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
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 5. ROUTES: HEWAN & ADMIN
// ==========================================

app.get('/api/hewan', (req, res) => {
    db.query("SELECT * FROM hewan ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/hewan-tersedia', (req, res) => {
    db.query("SELECT * FROM hewan WHERE stok > 0 ORDER BY id DESC", (err, results) => res.json(results));
});

app.post('/api/hewan', uploadHewan.single('gambar'), async (req, res) => {
    const { jenis, harga, stok, deskripsi, kategori } = req.body;
    const gambar = req.file ? req.file.filename : null;
    try {
        await db.promise().query(
            "INSERT INTO hewan (jenis_hewan, harga, stok, deskripsi, gambar, kategori) VALUES (?, ?, ?, ?, ?, ?)",
            [jenis, kategori || 'reguler', harga, stok, deskripsi, gambar]
        );
        res.status(201).json({ message: "Hewan ditambahkan" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/hewan/:id/kesehatan', async (req, res) => {
    const { tanggal, kondisi, tindakan, dokter } = req.body;
    try {
        await db.promise().query(
            "INSERT INTO log_kesehatan (hewan_id, tanggal_periksa, kondisi, tindakan, nama_dokter) VALUES (?, ?, ?, ?, ?)",
            [req.params.id, tanggal, kondisi, tindakan, dokter]
        );
        res.json({ message: "Log kesehatan berhasil dicatat" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
        const [pending] = await db.promise().query("SELECT COUNT(*) as total FROM pemesanan WHERE status_pesanan = 'menunggu_verifikasi' OR status_pembayaran = 'menunggu_verifikasi'");
        const [sales] = await db.promise().query("SELECT SUM(total_harga) as total FROM pemesanan WHERE status_pesanan = 'selesai'");
        const [hewan] = await db.promise().query("SELECT id FROM hewan");
        res.json({
            pendingCount: pending[0].total || 0,
            totalSales: sales[0].total || 0,
            stokData: hewan
        });
    } catch (err) { res.status(500).json({ error: "Gagal memuat statistik" }); }
});

// ==========================================
// 6. ROUTES: PESANAN & TRANSAKSI
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

        // Cek Admin
        const [userCheck] = await connection.query("SELECT role FROM users WHERE id = ?", [user_id]);
        if (userCheck.length > 0 && userCheck[0].role === 'admin') {
            throw new Error("Admin tidak boleh membuat pesanan pribadi.");
        }

        // Cek Stok
        const [hewan] = await connection.query("SELECT stok, jenis_hewan FROM hewan WHERE id = ?", [hewan_id]);
        if (hewan.length === 0 || hewan[0].stok < jumlah) throw new Error("Stok tidak mencukupi");

        await connection.query("UPDATE hewan SET stok = stok - ? WHERE id = ?", [jumlah, hewan_id]);

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

        // Generate Cicilan
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

        await createNotifikasi(null, 'admin', 'Pesanan Baru', `Order #${id_pesanan}: ${hewan[0].jenis_hewan}`, 'info');
        await connection.commit();
        res.status(201).json({ message: "Pesanan berhasil", id_pesanan });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        if (connection) connection.release();
    }
});

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
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/admin/pesanan', (req, res) => {
    const sql = `
        SELECT p.*, u.nama_lengkap, h.jenis_hewan 
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

app.get('/api/pesanan/:id/cicilan', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`SELECT * FROM pemesanan WHERE id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Tidak ditemukan' });
        const [cicilan] = await db.promise().query("SELECT * FROM cicilan WHERE id_pemesanan = ? ORDER BY angsuran_ke ASC", [req.params.id]);
        res.json({ pesanan: rows[0], cicilan });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload Bukti Bayar (Cash / Pelunasan)
app.post('/api/bayar', uploadBukti.single('bukti'), async (req, res) => {
    const { id_pesanan } = req.body;
    const bukti = req.file ? req.file.filename : null;
    try {
        await db.promise().query("UPDATE pemesanan SET bukti_transfer = ?, status_pembayaran = 'menunggu_verifikasi', status_pesanan = 'menunggu_verifikasi' WHERE id = ?", [bukti, id_pesanan]);
        res.json({ message: "Bukti terupload" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload Bukti DP Pesanan Baru (Khusus Cicilan Awal)
app.post('/api/pesanan/:id/dp', uploadBukti.single('bukti'), async (req, res) => {
    const { id } = req.params;
    const bukti = req.file ? req.file.filename : null;
    try {
        // Update cicilan ke-0 (DP)
        await db.promise().query("UPDATE cicilan SET bukti_bayar = ?, status = 'menunggu_verifikasi', tanggal_bayar = NOW() WHERE id_pemesanan = ? AND angsuran_ke = 0", [bukti, id]);
        // Update status pesanan
        await db.promise().query("UPDATE pemesanan SET dp_bukti = ?, status_pembayaran = 'dp_menunggu_verifikasi', status_pesanan = 'diproses' WHERE id = ?", [bukti, id]);
        res.json({ message: "Bukti DP terupload" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API Cicilan Aktif (Dashboard Cicilan)
app.get('/api/user/cicilan-aktif', async (req, res) => {
    const { user_id } = req.query;
    try {
        const [pesanan] = await db.promise().query(`
            SELECT p.*, h.jenis_hewan, h.gambar 
            FROM pemesanan p JOIN hewan h ON p.hewan_id = h.id 
            WHERE p.user_id = ? AND p.metode_bayar = 'cicilan' AND p.status_pesanan NOT IN ('dibatalkan', 'selesai')
            ORDER BY p.id DESC LIMIT 1
        `, [user_id]);
        
        if (pesanan.length === 0) return res.json({ ada_cicilan: false });

        const [jadwal] = await db.promise().query("SELECT * FROM cicilan WHERE id_pemesanan = ? ORDER BY angsuran_ke ASC", [pesanan[0].id]);
        
        const total = parseFloat(pesanan[0].total_harga);
        const dibayar = jadwal.filter(j => j.status === 'lunas' || j.status === 'menunggu_verifikasi').reduce((acc, curr) => acc + parseFloat(curr.nominal), 0);
        
        res.json({
            ada_cicilan: true,
            info_pesanan: pesanan[0],
            jadwal: jadwal,
            stats: { total, dibayar, progress: Math.round((dibayar/total)*100) }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload Bukti Cicilan Bulanan
app.post('/api/pesanan/:id/cicilan/:angsuranKe', uploadBukti.single('bukti'), async (req, res) => {
    const { id, angsuranKe } = req.params;
    const bukti = req.file ? req.file.filename : null;
    try {
        // PERBAIKAN: Tambahkan spasi setelah SET
        await db.promise().query(
            "UPDATE cicilan SET bukti_bayar = ?, status = 'menunggu_verifikasi', tanggal_bayar = NOW() WHERE id_pemesanan = ? AND angsuran_ke = ?", 
            [bukti, id, angsuranKe]
        );
        res.json({ message: "Bukti cicilan terkirim" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Verifikasi Cicilan (Admin)
app.put('/api/admin/cicilan/:id/verifikasi', async (req, res) => {
    const { id } = req.params; 
    try {
        await db.promise().query("UPDATE cicilan SET status = 'lunas' WHERE id = ?", [id]);
        
        // Cek Lunas Semua?
        const [rows] = await db.promise().query("SELECT id_pemesanan FROM cicilan WHERE id = ?", [id]);
        const idPesanan = rows[0].id_pemesanan;
        const [sisa] = await db.promise().query("SELECT COUNT(*) as belum FROM cicilan WHERE id_pemesanan = ? AND status != 'lunas'", [idPesanan]);
        
        if (sisa[0].belum === 0) {
            await db.promise().query("UPDATE pemesanan SET status_pesanan = 'selesai', status_pembayaran = 'lunas' WHERE id = ?", [idPesanan]);
        }
        res.json({ message: "Terverifikasi" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Status Pesanan (Admin - Cash)
// Update Status Pesanan & Pembayaran (Admin)
app.put('/api/admin/pesanan/:id', async (req, res) => {
    const { id } = req.params;
    const { status, status_pembayaran } = req.body; // Tambahkan status_pembayaran

    try {
        // Kita bangun query dinamis
        let query = "UPDATE pemesanan SET status_pesanan = ?";
        let params = [status];

        // Jika ada request update status_pembayaran (misal: jadi 'lunas')
        if (status_pembayaran) {
            query += ", status_pembayaran = ?";
            params.push(status_pembayaran);
        }

        query += " WHERE id = ?";
        params.push(id);

        await db.promise().query(query, params);
        res.json({ message: "Status berhasil diperbarui" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Notifikasi
app.get('/api/notifikasi', (req, res) => {
    const { user_id, role } = req.query;
    let sql = "SELECT * FROM notifikasi WHERE role_target = 'admin' ORDER BY created_at DESC LIMIT 20";
    let params = [];
    if (role !== 'admin') {
        sql = "SELECT * FROM notifikasi WHERE user_id = ? ORDER BY created_at DESC LIMIT 20";
        params = [user_id];
    }
    db.query(sql, params, (err, results) => {
        if(err) return res.json([]);
        res.json({ notifikasi: results });
    });
});

// [BARU] Update Status Distribusi & Penyembelihan (Admin)
app.put('/api/admin/pesanan/:id/tracking', async (req, res) => {
    const { id } = req.params;
    const { status_distribusi, link_video } = req.body; // link_video untuk penyembelihan
    
    try {
        let updates = [];
        let params = [];

        if (status_distribusi) {
            updates.push("status_distribusi = ?");
            params.push(status_distribusi);
            
            // Jika dikirim, update status pesanan utama juga biar sinkron
            if(status_distribusi === 'selesai') {
                updates.push("status_pesanan = 'selesai'");
            }
        }
        
        if (link_video) {
            updates.push("link_video_pemotongan = ?");
            params.push(link_video);
        }

        if (updates.length === 0) return res.json({ message: "Tidak ada perubahan" });

        params.push(id);
        const sql = `UPDATE pemesanan SET ${updates.join(', ')} WHERE id = ?`;
        
        await db.promise().query(sql, params);
        res.json({ message: "Status tracking berhasil diperbarui" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Status Distribusi (Admin)
app.post('/api/pesanan/:id/distribusi', async (req, res) => {
    const { id } = req.params;
    const { deskripsi } = req.body; // Status lokasi terkini
    try {
        await db.promise().query(
            "UPDATE pemesanan SET lacak_distribusi = ? WHERE id = ?", 
            [deskripsi, id]
        );
        res.json({ message: "Status distribusi berhasil diperbarui" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));