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
// 2. MULTER CONFIGURATION (Harus di atas route yang pakai upload)
// ==========================================

// Konfigurasi Upload (PINDHKAN KE ATAS SEBELUM ROUTES)
const dirHewan = 'public/uploads/hewan';
const dirBukti = 'public/uploads/bukti';
if (!fs.existsSync(dirHewan)) fs.mkdirSync(dirHewan, { recursive: true });
if (!fs.existsSync(dirBukti)) fs.mkdirSync(dirBukti, { recursive: true });

// Storage configuration
const storageHewan = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirHewan),
    filename: (req, file, cb) => cb(null, 'hewan-' + Date.now() + path.extname(file.originalname))
});

const storageBukti = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirBukti),
    filename: (req, file, cb) => cb(null, 'bukti-' + Date.now() + path.extname(file.originalname))
});

// File filter
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Hanya file gambar dan PDF yang diperbolehkan'), false);
    }
};

// Create upload instances
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

// Serve static files (SETELAH MULTER CONFIG)
app.use(express.static('public'));

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
        pass: 'cudjwjtxrwyqhpno' 
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
        await db.promise().query(
            'INSERT INTO notifikasi (judul, pesan, tipe, role_target) VALUES (?, ?, ?, ?)',
            [judul, pesan, tipe, 'admin']
        );
        console.log(`✅ Notifikasi admin: ${judul}`);
    } catch (err) { console.error('❌ Error notifikasi admin:', err.message); }
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
        // Default notif config
        await db.promise().query("INSERT INTO konfigurasi_notifikasi (user_id) VALUES (?)", [result.insertId]);
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
// 7. ROUTES: HEWAN
// ==========================================

app.get('/api/hewan', (req, res) => {
    db.query("SELECT * FROM hewan", (err, results) => res.json(results));
});

app.get('/api/hewan-tersedia', (req, res) => {
    db.query("SELECT * FROM hewan WHERE stok > 0", (err, results) => res.json(results));
});

app.get('/api/hewan/:id', (req, res) => {
    db.query("SELECT * FROM hewan WHERE id = ?", [req.params.id], (err, results) => res.json(results[0] || {}));
});

// ==========================================
// 8. ROUTES: PESANAN & PEMBAYARAN
// ==========================================

app.get('/api/pesanan', (req, res) => {
    const sql = `SELECT p.*, h.jenis_hewan, h.gambar FROM pemesanan p JOIN hewan h ON p.hewan_id = h.id WHERE p.user_id = ? ORDER BY p.tanggal_pemesanan DESC`;
    db.query(sql, [req.query.user_id], (err, results) => res.json(results));
});

app.post('/api/pesan', async (req, res) => {
    const { user_id, hewan_id, jumlah, total_harga, jadwal } = req.body;
    try {
        const [hewan] = await db.promise().query("SELECT * FROM hewan WHERE id = ?", [hewan_id]);
        if (hewan.length === 0 || hewan[0].stok < jumlah) return res.status(400).json({ message: "Stok kurang" });
        
        await db.promise().query("UPDATE hewan SET stok = stok - ? WHERE id = ?", [jumlah, hewan_id]);
        const [result] = await db.promise().query(
            "INSERT INTO pemesanan (user_id, hewan_id, jumlah, total_harga, jadwal_pemotongan, status_pesanan) VALUES (?, ?, ?, ?, ?, 'pending')",
            [user_id, hewan_id, jumlah, total_harga, jadwal]
        );
        res.json({ message: "Pesanan berhasil", id_pesanan: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 9. ROUTES: API PEMBAYARAN
// ==========================================

// A. Pilih Metode Pembayaran
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
            
            // Generate Cicilan
            await db.promise().query("DELETE FROM cicilan WHERE pesanan_id = ?", [id]);
            for (let i = 1; i <= 12; i++) {
                const nextJt = new Date(); nextJt.setMonth(nextJt.getMonth() + i);
                let nom = (i === 12) ? (sisa - (cicilanPerBulan * 11)) : cicilanPerBulan;
                if (nom < 0) nom = cicilanPerBulan; // safety
                
                await db.promise().query(
                    `INSERT INTO cicilan (pesanan_id, angsuran_ke, nominal, jatuh_tempo, status) VALUES (?, ?, ?, ?, 'belum')`,
                    [id, i, nom, nextJt.toISOString().split('T')[0]]
                );
            }
        } else {
            await db.promise().query(
                `UPDATE pemesanan SET metode_bayar = 'cash', status_pembayaran = 'belum_dp', dp_nominal = ?, total_angsuran = 0 WHERE id = ?`,
                [totalHarga, id]
            );
        }
        res.json({ message: "Metode update sukses" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// B. GET Detail Cicilan
app.get('/api/pesanan/:id/cicilan', async (req, res) => {
    const { id } = req.params;
    try {
        const [pesanan] = await db.promise().query(
            `SELECT p.*, h.jenis_hewan, h.harga, u.nama_lengkap, u.email FROM pemesanan p
             JOIN hewan h ON p.hewan_id = h.id JOIN users u ON p.user_id = u.id WHERE p.id = ?`, [id]
        );
        if (pesanan.length === 0) return res.status(404).json({ message: "Tak ditemukan" });

        // Ambil cicilan (ignore error jika tabel belum ada)
        let cicilan = [];
        try { const [c] = await db.promise().query("SELECT * FROM cicilan WHERE pesanan_id = ? ORDER BY angsuran_ke", [id]); cicilan = c; } catch(e){}

        // Ambil history
        let history = [];
        try { const [h] = await db.promise().query("SELECT * FROM history_pembayaran WHERE pesanan_id = ? ORDER BY tanggal DESC", [id]); history = h; } catch(e){}

        res.json({ pesanan: pesanan[0], cicilan, history });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// C. Upload Bukti DP
app.post('/api/pesanan/:id/dp', uploadBukti.single('bukti'), async (req, res) => {
    const { id } = req.params;
    
    console.log('📥 Menerima request upload DP untuk pesanan:', id);
    console.log('📂 File:', req.file);
    
    if (!req.file) {
        console.log('❌ Tidak ada file yang diupload');
        return res.status(400).json({ message: "File bukti wajib diupload!" });
    }
    
    const bukti = req.file.filename;
    console.log('✅ File berhasil diupload:', bukti);

    try {
        // 1. Cek apakah pesanan ada
        const [cekPesanan] = await db.promise().query(
            "SELECT * FROM pemesanan WHERE id = ?",
            [id]
        );
        
        if (cekPesanan.length === 0) {
            console.log('❌ Pesanan tidak ditemukan');
            return res.status(404).json({ message: "Pesanan tidak ditemukan" });
        }
        
        const pesanan = cekPesanan[0];
        console.log('📊 Data pesanan:', pesanan);

        // 2. Hitung nominal DP
        let dpNominal = 0;
        if (pesanan.metode_bayar === 'cicilan') {
            // DP 30% untuk cicilan
            dpNominal = Math.round((pesanan.total_harga * 30) / 100);
        } else {
            // Lunas untuk cash
            dpNominal = pesanan.total_harga;
        }
        
        console.log('💰 Nominal DP:', dpNominal);

        // 3. Update database
        await db.promise().query(
            `UPDATE pemesanan SET 
                dp_bukti = ?, 
                dp_date = NOW(), 
                status_pembayaran = 'dp', 
                status_pesanan = 'dibayar' 
             WHERE id = ?`,
            [bukti, id]
        );

        // 4. Catat history (jika tabel ada)
        try {
            await db.promise().query(
                `INSERT INTO history_pembayaran 
                (pesanan_id, jenis, nominal, bukti, keterangan) 
                VALUES (?, 'dp', ?, ?, 'Pembayaran Down Payment')`,
                [id, dpNominal, bukti]
            );
            console.log('📝 History pembayaran dicatat');
        } catch (histErr) {
            console.warn("⚠️ Tabel history_pembayaran belum ada, melewati...");
        }

        console.log("✅ Upload DP Berhasil!");
        res.json({ 
            message: "Bukti DP berhasil diupload",
            bukti: bukti,
            nominal: dpNominal
        });

    } catch (err) {
        console.error('❌ Error Database saat Upload:', err.message);
        res.status(500).json({ 
            error: "Gagal menyimpan ke database: " + err.message,
            detail: err.message
        });
    }
});

// D. Upload Bukti Pelunasan (Cash)
app.post('/api/pesanan/:id/lunas', uploadBukti.single('bukti'), async (req, res) => {
    const { id } = req.params;
    const bukti = req.file ? req.file.filename : null;
    
    if (!bukti) {
        return res.status(400).json({ message: "Wajib upload bukti" });
    }

    try {
        const [p] = await db.promise().query("SELECT total_harga FROM pemesanan WHERE id=?", [id]);
        const nominal = p[0]?.total_harga || 0;

        await db.promise().query(
            `UPDATE pemesanan SET 
                dp_bukti=?, 
                dp_date=NOW(), 
                status_pembayaran='lunas', 
                status_pesanan='selesai' 
             WHERE id=?`,
            [bukti, id]
        );
        
        // Catat history
        try {
            await db.promise().query(
                "INSERT INTO history_pembayaran (pesanan_id, jenis, nominal, bukti, keterangan) VALUES (?, 'pelunasan', ?, ?, 'Pelunasan Cash')", 
                [id, nominal, bukti]
            );
        } catch(e){
            console.warn("⚠️ Gagal catat history:", e.message);
        }

        res.json({ message: "Sukses upload Pelunasan" });
    } catch (err) { 
        console.error('❌ Error upload pelunasan:', err);
        res.status(500).json({ error: err.message }); 
    }
});

// E. Bayar Cicilan
app.post('/api/pesanan/:id/cicilan/:angsuran_ke', uploadBukti.single('bukti'), async (req, res) => {
    const { id, angsuran_ke } = req.params;
    const bukti = req.file ? req.file.filename : null;
    
    if (!bukti) {
        return res.status(400).json({ message: "Wajib upload bukti" });
    }

    try {
        // 1. Update cicilan
        await db.promise().query(
            `UPDATE cicilan SET 
                status = 'dibayar',
                tanggal_bayar = NOW(),
                bukti_bayar = ?
             WHERE pesanan_id = ? AND angsuran_ke = ?`,
            [bukti, id, angsuran_ke]
        );

        // 2. Catat history
        try {
            const [cicilan] = await db.promise().query(
                "SELECT nominal FROM cicilan WHERE pesanan_id = ? AND angsuran_ke = ?",
                [id, angsuran_ke]
            );
            
            if (cicilan.length > 0) {
                await db.promise().query(
                    `INSERT INTO history_pembayaran 
                    (pesanan_id, jenis, nominal, bukti, keterangan) 
                    VALUES (?, 'cicilan', ?, ?, 'Angsuran ke-${angsuran_ke}')`,
                    [id, cicilan[0].nominal, bukti]
                );
            }
        } catch(e){
            console.warn("⚠️ Gagal catat history cicilan:", e.message);
        }

        // 3. Cek apakah semua cicilan sudah lunas
        const [sisaCicilan] = await db.promise().query(
            "SELECT COUNT(*) as count FROM cicilan WHERE pesanan_id = ? AND status = 'belum'",
            [id]
        );

        if (sisaCicilan[0].count === 0) {
            // Update status pesanan menjadi lunas
            await db.promise().query(
                `UPDATE pemesanan SET 
                    status_pembayaran = 'lunas',
                    status_pesanan = 'selesai'
                 WHERE id = ?`,
                [id]
            );
        }

        res.json({ message: "Cicilan berhasil dibayar" });
    } catch (err) { 
        console.error('❌ Error bayar cicilan:', err);
        res.status(500).json({ error: err.message }); 
    }
});

// F. Endpoint Pembayaran Umum (untuk pembayaran.html lama)
app.post('/api/bayar', uploadBukti.single('bukti'), async (req, res) => {
    console.log('📥 Menerima pembayaran umum');
    
    const { id_pesanan } = req.body;
    const bukti = req.file ? req.file.filename : null;
    
    if (!bukti || !id_pesanan) {
        return res.status(400).json({ message: "Data tidak lengkap" });
    }

    try {
        const [pesanan] = await db.promise().query(
            "SELECT * FROM pemesanan WHERE id = ?",
            [id_pesanan]
        );
        
        if (pesanan.length === 0) {
            return res.status(404).json({ message: "Pesanan tidak ditemukan" });
        }

        await db.promise().query(
            `UPDATE pemesanan SET 
                dp_bukti = ?, 
                dp_date = NOW(), 
                status_pembayaran = 'dp', 
                status_pesanan = 'dibayar' 
             WHERE id = ?`,
            [bukti, id_pesanan]
        );

        res.json({ 
            message: "Pembayaran berhasil diupload! Admin akan memverifikasi.",
            bukti: bukti
        });
    } catch (err) {
        console.error('❌ Error pembayaran umum:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 10. ROUTES: NOTIFIKASI
// ==========================================

// A. Ambil notifikasi user
app.get('/api/notifikasi/user', async (req, res) => {
    const { user_id } = req.query;
    
    if (!user_id) {
        return res.status(400).json({ error: "User ID diperlukan" });
    }

    try {
        // Cek apakah tabel notifikasi ada
        const [tables] = await db.promise().query(
            "SHOW TABLES LIKE 'notifikasi'"
        );
        
        if (tables.length === 0) {
            return res.json([]); // Return empty array jika tabel tidak ada
        }

        const [results] = await db.promise().query(
            `SELECT n.*, 
                    CASE 
                        WHEN n.user_id = ? THEN 1
                        ELSE 0 
                    END as is_for_user
             FROM notifikasi n 
             WHERE n.user_id = ? 
                OR (n.role_target = 'pelanggan' AND n.user_id IS NULL)
                OR n.role_target = 'semua'
             ORDER BY n.created_at DESC 
             LIMIT 20`,
            [user_id, user_id]
        );
        
        res.json(results);
    } catch (err) {
        console.error('❌ Error notifikasi user:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// B. Tandai notifikasi sudah dibaca
app.post('/api/notifikasi/baca', async (req, res) => {
    const { id } = req.body;
    
    try {
        await db.promise().query(
            "UPDATE notifikasi SET is_read = 1 WHERE id = ?",
            [id]
        );
        res.json({ message: "Notifikasi ditandai sudah dibaca" });
    } catch (err) {
        console.error('❌ Error baca notifikasi:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// C. Hapus semua notifikasi user
app.delete('/api/notifikasi/user/:user_id', async (req, res) => {
    const { user_id } = req.params;
    
    try {
        await db.promise().query(
            "DELETE FROM notifikasi WHERE user_id = ?",
            [user_id]
        );
        res.json({ message: "Semua notifikasi berhasil dihapus" });
    } catch (err) {
        console.error('❌ Error hapus notifikasi:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// D. Tandai semua sudah dibaca
app.post('/api/notifikasi/baca-semua', async (req, res) => {
    const { user_id } = req.body;
    
    try {
        await db.promise().query(
            "UPDATE notifikasi SET is_read = 1 WHERE user_id = ?",
            [user_id]
        );
        res.json({ message: "Semua notifikasi ditandai sudah dibaca" });
    } catch (err) {
        console.error('❌ Error baca semua notifikasi:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 11. ROUTES: ADMIN & DASHBOARD
// ==========================================

app.get('/api/admin/pesanan', (req, res) => {
    db.query(`SELECT p.*, u.nama_lengkap, u.email, h.jenis_hewan FROM pemesanan p JOIN users u ON p.user_id = u.id JOIN hewan h ON p.hewan_id = h.id ORDER BY p.tanggal_pemesanan DESC`, (err, resu) => res.json(resu));
});

app.put('/api/admin/pesanan/:id', (req, res) => {
    db.query("UPDATE pemesanan SET status_pesanan = ? WHERE id = ?", [req.body.status, req.params.id], (err) => res.json({message: "Status updated"}));
});

// ==========================================
// 12. ROUTES: STATIC FILES
// ==========================================

// Serve file uploads (INI SUDAH DI ATAS, tapi kita tambahkan route khusus)
app.use('/uploads/hewan', express.static(path.join(__dirname, 'public/uploads/hewan')));
app.use('/uploads/bukti', express.static(path.join(__dirname, 'public/uploads/bukti')));

// ==========================================
// ROUTES: ADMIN - Hapus Pesanan
// ==========================================

app.delete('/api/admin/pesanan/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Ambil data pesanan untuk mengembalikan stok
        const [pesanan] = await db.promise().query(
            "SELECT hewan_id, jumlah FROM pemesanan WHERE id = ?",
            [id]
        );
        
        if (pesanan.length > 0) {
            const { hewan_id, jumlah } = pesanan[0];
            
            // Kembalikan stok hewan
            await db.promise().query(
                "UPDATE hewan SET stok = stok + ? WHERE id = ?",
                [jumlah, hewan_id]
            );
            
            // Hapus data cicilan jika ada
            try {
                await db.promise().query("DELETE FROM cicilan WHERE pesanan_id = ?", [id]);
            } catch (e) {
                console.warn("⚠️ Tidak ada tabel cicilan atau error:", e.message);
            }
            
            // Hapus history pembayaran jika ada
            try {
                await db.promise().query("DELETE FROM history_pembayaran WHERE pesanan_id = ?", [id]);
            } catch (e) {
                console.warn("⚠️ Tidak ada tabel history atau error:", e.message);
            }
        }
        
        // Hapus pesanan
        await db.promise().query("DELETE FROM pemesanan WHERE id = ?", [id]);
        
        res.json({ message: "Pesanan berhasil dihapus dan stok dikembalikan" });
        
    } catch (err) {
        console.error('❌ Error hapus pesanan:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// ROUTES: ADMIN - Update Status Pesanan (PERBAIKI YANG SUDAH ADA)
// ==========================================

app.put('/api/admin/pesanan/:id', async (req, res) => {
    const { id } = req.params;
    const { status, catatan } = req.body;
    
    console.log(`✏️  Update status pesanan #${id} ke: ${status}`);
    
    // Validasi status
    const validStatuses = ['pending', 'dibayar', 'selesai', 'ditolak'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            message: "Status tidak valid. Pilih: pending, dibayar, selesai, atau ditolak" 
        });
    }
    
    try {
        // 1. Cek apakah pesanan ada
        const [pesanan] = await db.promise().query(
            "SELECT * FROM pemesanan WHERE id = ?",
            [id]
        );
        
        if (pesanan.length === 0) {
            return res.status(404).json({ message: "Pesanan tidak ditemukan" });
        }
        
        const currentStatus = pesanan[0].status_pesanan;
        
        // 2. Jika mengubah dari 'dibayar' ke 'selesai' untuk cicilan, cek apakah semua cicilan sudah lunas
        if (currentStatus === 'dibayar' && status === 'selesai' && pesanan[0].metode_bayar === 'cicilan') {
            try {
                const [cicilan] = await db.promise().query(
                    "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'belum' THEN 1 ELSE 0 END) as belum FROM cicilan WHERE pesanan_id = ?",
                    [id]
                );
                
                if (cicilan.length > 0 && cicilan[0].belum > 0) {
                    return res.status(400).json({ 
                        message: `Masih ada ${cicilan[0].belum} cicilan yang belum dibayar. Selesaikan semua cicilan terlebih dahulu.` 
                    });
                }
            } catch (cicilanErr) {
                console.warn("⚠️ Tidak bisa cek cicilan:", cicilanErr.message);
            }
        }
        
        // 3. Update status pesanan
        await db.promise().query(
            "UPDATE pemesanan SET status_pesanan = ? WHERE id = ?",
            [status, id]
        );
        
        console.log(`✅ Status pesanan #${id} diupdate ke: ${status}`);
        
                // 4. Buat notifikasi untuk user
                try {
                    const judul = `Status Pesanan #${id} Diubah`;
                    let pesanNotif = '';
                    
                    switch(status) {
                        case 'selesai':
                            pesanNotif = 'Pesanan Anda telah selesai diproses.';
                            break;
                        case 'ditolak':
                            pesanNotif = 'Pesanan Anda ditolak oleh admin.';
                            break;
                        default:
                            pesanNotif = `Status pesanan berubah menjadi ${status}`;
                    }
                    
                    await kirimNotifikasiLengkap(pesanan[0].user_id, judul, pesanNotif);
                } catch (notifErr) {
                    console.warn("⚠️ Gagal kirim notifikasi:", notifErr.message);
                }
                
                res.json({ message: "Status pesanan berhasil diupdate" });
            } catch (err) {
                console.error('❌ Error update pesanan:', err.message);
                res.status(500).json({ error: err.message });
            }
        });

// ==========================================
// 13. CRON JOBS
// ==========================================

cron.schedule('0 9 * * *', async () => { 
    console.log('Cron job running at 9 AM...');
    // Tambahkan logika cron di sini
});

// ==========================================
// DEBUG: TEST ENDPOINT DELETE
// ==========================================

console.log("🔄 Mendaftarkan endpoint DELETE...");

// TEST 1: Endpoint sederhana
app.delete('/api/admin/pesanan/:id', (req, res) => {
    console.log(`✅ DELETE endpoint dipanggil untuk ID: ${req.params.id}`);
    res.json({ 
        success: true, 
        message: `Pesanan #${req.params.id} berhasil dihapus`,
        timestamp: new Date().toISOString()
    });
});

// TEST 2: Endpoint alternatif
app.delete('/api/admin/test-delete/:id', (req, res) => {
    console.log(`✅ TEST DELETE endpoint dipanggil: ${req.params.id}`);
    res.json({ test: true, id: req.params.id });
});
// ==========================================
// 14. ERROR HANDLING
// ==========================================

// Handle 404 (Endpoint tak ditemukan)
app.use((req, res) => {
    console.log(`⚠️ 404 Hit: ${req.method} ${req.url}`);
    
    // Jika request untuk file upload, berikan default image
    if (req.url.startsWith('/uploads/hewan/')) {
        return res.sendFile(path.join(__dirname, 'public', 'images', 'default-hewan.jpg'));
    }
    
    if (req.url.startsWith('/uploads/bukti/')) {
        return res.sendFile(path.join(__dirname, 'public', 'images', 'default-bukti.jpg'));
    }
    
    res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// ==========================================
// 15. START SERVER
// ==========================================

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log('📁 Upload directory:');
    console.log(`   - Hewan: ${path.join(__dirname, dirHewan)}`);
    console.log(`   - Bukti: ${path.join(__dirname, dirBukti)}`);
});