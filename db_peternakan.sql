-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 09, 2026 at 09:35 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_peternakan`
--

-- --------------------------------------------------------

--
-- Table structure for table `cicilan`
--

CREATE TABLE `cicilan` (
  `id` int(11) NOT NULL,
  `id_pemesanan` int(11) NOT NULL,
  `angsuran_ke` int(11) NOT NULL,
  `nominal` decimal(15,2) NOT NULL,
  `jatuh_tempo` date NOT NULL,
  `status` enum('belum_bayar','menunggu_verifikasi','lunas') DEFAULT 'belum_bayar',
  `bukti_bayar` varchar(255) DEFAULT NULL,
  `tanggal_bayar` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cicilan`
--

INSERT INTO `cicilan` (`id`, `id_pemesanan`, `angsuran_ke`, `nominal`, `jatuh_tempo`, `status`, `bukti_bayar`, `tanggal_bayar`) VALUES
(1, 1, 0, 1350000.00, '2026-01-09', 'lunas', 'bukti-1767947351650.jpg', '2026-01-09 16:29:11'),
(2, 1, 1, 262500.00, '2026-02-09', 'belum_bayar', NULL, NULL),
(3, 1, 2, 262500.00, '2026-03-09', 'belum_bayar', NULL, NULL),
(4, 1, 3, 262500.00, '2026-04-09', 'belum_bayar', NULL, NULL),
(5, 1, 4, 262500.00, '2026-05-09', 'belum_bayar', NULL, NULL),
(6, 1, 5, 262500.00, '2026-06-09', 'belum_bayar', NULL, NULL),
(7, 1, 6, 262500.00, '2026-07-09', 'belum_bayar', NULL, NULL),
(8, 1, 7, 262500.00, '2026-08-09', 'belum_bayar', NULL, NULL),
(9, 1, 8, 262500.00, '2026-09-09', 'belum_bayar', NULL, NULL),
(10, 1, 9, 262500.00, '2026-10-09', 'belum_bayar', NULL, NULL),
(11, 1, 10, 262500.00, '2026-11-09', 'belum_bayar', NULL, NULL),
(12, 1, 11, 262500.00, '2026-12-09', 'belum_bayar', NULL, NULL),
(13, 1, 12, 262500.00, '2027-01-09', 'belum_bayar', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `hewan`
--

CREATE TABLE `hewan` (
  `id` int(11) NOT NULL,
  `jenis_hewan` varchar(50) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `harga` decimal(15,2) DEFAULT NULL,
  `stok` int(11) NOT NULL,
  `gambar` varchar(255) DEFAULT NULL,
  `kategori` enum('reguler','qurban','aqiqah') DEFAULT 'reguler',
  `usia_bulan` int(11) DEFAULT 0 COMMENT 'Penting untuk syarat sah Qurban',
  `riwayat_kesehatan` text DEFAULT NULL COMMENT 'Catatan vaksin/penyakit'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hewan`
--

INSERT INTO `hewan` (`id`, `jenis_hewan`, `deskripsi`, `harga`, `stok`, `gambar`, `kategori`, `usia_bulan`, `riwayat_kesehatan`) VALUES
(13, 'Domba', '25-40 kg)', 4500000.00, 17, 'hewan-1767944326959.jpg', 'aqiqah', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `history_pembayaran`
--

CREATE TABLE `history_pembayaran` (
  `id` int(11) NOT NULL,
  `pesanan_id` int(11) NOT NULL,
  `jenis` enum('dp','cicilan','pelunasan') NOT NULL,
  `nominal` decimal(15,2) NOT NULL,
  `metode` enum('transfer','cash') DEFAULT 'transfer',
  `bukti` varchar(255) DEFAULT NULL,
  `tanggal` datetime DEFAULT current_timestamp(),
  `keterangan` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `kelompok_qurban`
--

CREATE TABLE `kelompok_qurban` (
  `id` int(11) NOT NULL,
  `hewan_id` int(11) NOT NULL,
  `nama_kelompok` varchar(100) DEFAULT 'Kelompok Umum',
  `status` enum('terbuka','penuh','dibatalkan') DEFAULT 'terbuka',
  `kuota_terisi` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `kelompok_qurban`
--

INSERT INTO `kelompok_qurban` (`id`, `hewan_id`, `nama_kelompok`, `status`, `kuota_terisi`, `created_at`) VALUES
(1, 13, 'Kelompok Domba - 1767946126723', 'terbuka', 1, '2026-01-09 08:08:46');

-- --------------------------------------------------------

--
-- Table structure for table `konfigurasi_notifikasi`
--

CREATE TABLE `konfigurasi_notifikasi` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `email_notif` tinyint(1) DEFAULT 1,
  `inapp_notif` tinyint(1) DEFAULT 1,
  `notify_pembayaran` tinyint(1) DEFAULT 1,
  `notify_pengiriman` tinyint(1) DEFAULT 1,
  `notify_promosi` tinyint(1) DEFAULT 0,
  `notify_stok` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `laporan_keuangan`
--

CREATE TABLE `laporan_keuangan` (
  `id` int(11) NOT NULL,
  `pesanan_id` int(11) DEFAULT NULL,
  `jenis_transaksi` enum('pemasukan','pengeluaran') DEFAULT NULL,
  `jumlah` decimal(10,2) DEFAULT NULL,
  `tanggal` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `log_kesehatan`
--

CREATE TABLE `log_kesehatan` (
  `id` int(11) NOT NULL,
  `hewan_id` int(11) NOT NULL,
  `tanggal_periksa` date NOT NULL,
  `kondisi` text NOT NULL,
  `tindakan` varchar(255) DEFAULT NULL,
  `nama_dokter` varchar(100) DEFAULT NULL,
  `foto_kondisi` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `log_kesehatan`
--

INSERT INTO `log_kesehatan` (`id`, `hewan_id`, `tanggal_periksa`, `kondisi`, `tindakan`, `nama_dokter`, `foto_kondisi`, `created_at`) VALUES
(1, 13, '2026-01-09', 'Sehat', 'Pemberian Vaksin', '', NULL, '2026-01-09 07:39:01');

-- --------------------------------------------------------

--
-- Table structure for table `log_stok`
--

CREATE TABLE `log_stok` (
  `id` int(11) NOT NULL,
  `hewan_id` int(11) NOT NULL,
  `stok_sebelum` int(11) NOT NULL,
  `stok_sesudah` int(11) NOT NULL,
  `aksi` varchar(20) NOT NULL,
  `jumlah` int(11) NOT NULL,
  `keterangan` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `metode_pembayaran`
--

CREATE TABLE `metode_pembayaran` (
  `id` int(11) NOT NULL,
  `nama` varchar(50) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `min_dp` decimal(10,2) DEFAULT 0.00,
  `cicilan_bulan` int(11) DEFAULT 0,
  `bunga` decimal(5,2) DEFAULT 0.00,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `metode_pembayaran`
--

INSERT INTO `metode_pembayaran` (`id`, `nama`, `deskripsi`, `min_dp`, `cicilan_bulan`, `bunga`, `status`, `created_at`) VALUES
(1, 'cash', 'Pembayaran lunas sekaligus', 100.00, 0, 0.00, 'active', '2025-12-22 14:12:25'),
(2, 'cicilan', 'Cicilan dengan DP 30% + 12 bulan', 30.00, 12, 1.50, 'active', '2025-12-22 14:12:25'),
(3, 'cash', 'Pembayaran lunas sekaligus', 100.00, 0, 0.00, 'active', '2025-12-22 14:56:38'),
(4, 'cicilan', 'Cicilan dengan DP 30% + 12 bulan', 30.00, 12, 1.50, 'active', '2025-12-22 14:56:38'),
(5, 'cash', 'Pembayaran lunas sekaligus', 100.00, 0, 0.00, 'active', '2025-12-22 14:59:15'),
(6, 'cicilan', 'Cicilan dengan DP 30% + 12 bulan', 30.00, 12, 1.50, 'active', '2025-12-22 14:59:15');

-- --------------------------------------------------------

--
-- Table structure for table `notifikasi`
--

CREATE TABLE `notifikasi` (
  `id` int(11) NOT NULL,
  `judul` varchar(100) DEFAULT NULL,
  `pesan` text DEFAULT NULL,
  `tipe` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) DEFAULT NULL,
  `role_target` enum('admin','pelanggan') DEFAULT 'pelanggan'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifikasi`
--

INSERT INTO `notifikasi` (`id`, `judul`, `pesan`, `tipe`, `is_read`, `created_at`, `user_id`, `role_target`) VALUES
(70, 'Pesanan Baru', 'Order #1 masuk.', 'info', 0, '2026-01-09 08:29:04', NULL, 'admin'),
(71, 'Pembayaran DP', 'User upload DP order #1', 'pembayaran', 0, '2026-01-09 08:29:11', NULL, 'admin');

-- --------------------------------------------------------

--
-- Table structure for table `pemesanan`
--

CREATE TABLE `pemesanan` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `hewan_id` int(11) DEFAULT NULL,
  `jumlah` int(11) NOT NULL,
  `total_harga` decimal(15,2) DEFAULT NULL,
  `tanggal_pemesanan` datetime DEFAULT current_timestamp(),
  `jadwal_pemotongan` date DEFAULT NULL,
  `opsi_pemotongan` enum('potong','hidup') DEFAULT 'potong',
  `status_pesanan` varchar(50) DEFAULT 'pending',
  `bukti_transfer` varchar(255) DEFAULT NULL,
  `status_hewan` enum('di_kandang','siap_potong','sudah_dipotong','disalurkan') DEFAULT 'di_kandang',
  `is_cicilan` tinyint(1) DEFAULT 0,
  `id_cicilan` int(11) DEFAULT NULL,
  `dp_amount` decimal(15,2) DEFAULT 0.00,
  `remaining_amount` decimal(15,2) DEFAULT 0.00,
  `cicilan_status` enum('full','dp_only','cicilan') DEFAULT 'full',
  `metode_bayar` enum('cash','cicilan') DEFAULT 'cash',
  `status_pembayaran` varchar(50) DEFAULT 'belum_bayar',
  `dp_nominal` decimal(15,2) DEFAULT 0.00,
  `dp_bukti` varchar(255) DEFAULT NULL,
  `dp_date` datetime DEFAULT NULL,
  `total_dibayar` decimal(15,2) DEFAULT 0.00,
  `jatuh_tempo_cicilan` date DEFAULT NULL,
  `angsuran_ke` int(11) DEFAULT 0,
  `total_angsuran` int(11) DEFAULT 0,
  `jam_potong` time DEFAULT NULL,
  `metode_pengambilan` enum('ambil_sendiri','diantar') DEFAULT 'ambil_sendiri',
  `lokasi_pengiriman` text DEFAULT NULL,
  `tukang_potong_id` int(11) DEFAULT NULL,
  `tipe_ibadah` enum('qurban_sendiri','qurban_patungan','aqiqah','daging_saja') DEFAULT 'daging_saja',
  `nama_shohibul_qurban` varchar(255) DEFAULT NULL COMMENT 'Nama orang yang berqurban',
  `nama_anak` varchar(255) DEFAULT NULL COMMENT 'Khusus Aqiqah',
  `nama_ayah_anak` varchar(255) DEFAULT NULL COMMENT 'Khusus Aqiqah',
  `tanggal_lahir_anak` date DEFAULT NULL COMMENT 'Khusus Aqiqah',
  `link_video_pemotongan` varchar(255) DEFAULT NULL COMMENT 'Link dokumentasi/Live Streaming',
  `sertifikat_file` varchar(255) DEFAULT NULL COMMENT 'File sertifikat digital',
  `status_distribusi` enum('belum','sedang_distribusi','selesai') DEFAULT 'belum',
  `kelompok_qurban_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pemesanan`
--

INSERT INTO `pemesanan` (`id`, `user_id`, `hewan_id`, `jumlah`, `total_harga`, `tanggal_pemesanan`, `jadwal_pemotongan`, `opsi_pemotongan`, `status_pesanan`, `bukti_transfer`, `status_hewan`, `is_cicilan`, `id_cicilan`, `dp_amount`, `remaining_amount`, `cicilan_status`, `metode_bayar`, `status_pembayaran`, `dp_nominal`, `dp_bukti`, `dp_date`, `total_dibayar`, `jatuh_tempo_cicilan`, `angsuran_ke`, `total_angsuran`, `jam_potong`, `metode_pengambilan`, `lokasi_pengiriman`, `tukang_potong_id`, `tipe_ibadah`, `nama_shohibul_qurban`, `nama_anak`, `nama_ayah_anak`, `tanggal_lahir_anak`, `link_video_pemotongan`, `sertifikat_file`, `status_distribusi`, `kelompok_qurban_id`) VALUES
(1, 5, 13, 1, 4500000.00, '2026-01-09 16:29:03', '2026-01-30', 'potong', 'dibayar', NULL, 'di_kandang', 0, NULL, 0.00, 0.00, 'full', 'cicilan', 'dp', 0.00, 'bukti-1767947351650.jpg', NULL, 0.00, NULL, 0, 0, NULL, 'diantar', 'wawa', NULL, 'qurban_patungan', 'Ahmad dani, jaijiwjai, sanjsa', NULL, NULL, NULL, NULL, NULL, 'belum', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `rencana_cicilan`
--

CREATE TABLE `rencana_cicilan` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `jumlah_angsuran` int(11) NOT NULL,
  `persen_dp` decimal(5,2) DEFAULT 20.00,
  `interval_hari` int(11) DEFAULT 30,
  `bunga` decimal(5,2) DEFAULT 0.00,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rencana_cicilan`
--

INSERT INTO `rencana_cicilan` (`id`, `nama`, `jumlah_angsuran`, `persen_dp`, `interval_hari`, `bunga`, `status`, `created_at`) VALUES
(1, 'Cicilan 2x', 2, 50.00, 30, 0.00, 'active', '2025-12-22 13:23:38'),
(2, 'Cicilan 3x', 3, 40.00, 30, 0.00, 'active', '2025-12-22 13:23:38'),
(3, 'Cicilan 4x', 4, 30.00, 30, 0.00, 'active', '2025-12-22 13:23:38'),
(4, 'Cicilan 6x', 6, 20.00, 30, 2.50, 'active', '2025-12-22 13:23:38'),
(5, 'DP 50% + Pelunasan', 2, 50.00, 30, 0.00, 'active', '2025-12-22 13:23:38'),
(6, 'DP 30% + Pelunasan', 2, 30.00, 30, 0.00, 'active', '2025-12-22 13:23:38'),
(7, 'Cicilan 2x', 2, 50.00, 30, 0.00, 'active', '2025-12-22 13:24:14'),
(8, 'Cicilan 3x', 3, 40.00, 30, 0.00, 'active', '2025-12-22 13:24:14'),
(9, 'Cicilan 4x', 4, 30.00, 30, 0.00, 'active', '2025-12-22 13:24:14'),
(10, 'Cicilan 6x', 6, 20.00, 30, 2.50, 'active', '2025-12-22 13:24:14'),
(11, 'DP 50% + Pelunasan', 2, 50.00, 30, 0.00, 'active', '2025-12-22 13:24:14'),
(12, 'DP 30% + Pelunasan', 2, 30.00, 30, 0.00, 'active', '2025-12-22 13:24:14');

-- --------------------------------------------------------

--
-- Table structure for table `transaksi_cicilan`
--

CREATE TABLE `transaksi_cicilan` (
  `id` int(11) NOT NULL,
  `id_pesanan` int(11) NOT NULL,
  `id_rencana_cicilan` int(11) NOT NULL,
  `total_pesanan` decimal(15,2) NOT NULL,
  `jumlah_dp` decimal(15,2) NOT NULL,
  `jumlah_cicilan` decimal(15,2) NOT NULL,
  `total_cicilan` decimal(15,2) NOT NULL,
  `jumlah_sudah_bayar` decimal(15,2) DEFAULT 0.00,
  `sisa_hutang` decimal(15,2) NOT NULL,
  `status` enum('aktif','lunas','terlambat','batal') DEFAULT 'aktif',
  `tanggal_mulai` date DEFAULT NULL,
  `tanggal_jatuh_tempo` date DEFAULT NULL,
  `tanggal_lunas` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `nama_lengkap` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `no_telepon` varchar(20) DEFAULT NULL,
  `alamat` text DEFAULT NULL,
  `role` enum('admin','pelanggan') DEFAULT 'pelanggan',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `nama_lengkap`, `email`, `password`, `no_telepon`, `alamat`, `role`, `created_at`, `reset_token`, `reset_token_expires`) VALUES
(1, 'bahas', 'bahas@gmail.com', '$2b$08$.jGdCuPZbtlHXJ6bASYIYewTfaT6iTugDM0QThk0tU3PAfbd8/IkO', '0812121216', 'jl.keong', 'admin', '2025-12-19 14:25:29', NULL, NULL),
(5, 'yaya123', 'yasya123@gmail.com', '$2b$08$JldgrLUrXOnwXecL6On9weHj7BiKigmUE.xC0oYSRKDrObzKWnjiS', '0987654321', 'qawsedfgh', 'pelanggan', '2026-01-06 07:04:55', NULL, NULL),
(6, 'yaya1234', 'yasya1234@gmail.com', '$2b$08$ox.1koVm5DMCYasg9mmIeuuXkMph/Yo3yYE4MENbsEjetG6iEaE.S', '0987654321', 'qawsedfgh', 'pelanggan', '2026-01-06 11:37:34', NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cicilan`
--
ALTER TABLE `cicilan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_pemesanan` (`id_pemesanan`);

--
-- Indexes for table `hewan`
--
ALTER TABLE `hewan`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `history_pembayaran`
--
ALTER TABLE `history_pembayaran`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pesanan_tanggal` (`pesanan_id`,`tanggal`);

--
-- Indexes for table `kelompok_qurban`
--
ALTER TABLE `kelompok_qurban`
  ADD PRIMARY KEY (`id`),
  ADD KEY `hewan_id` (`hewan_id`);

--
-- Indexes for table `konfigurasi_notifikasi`
--
ALTER TABLE `konfigurasi_notifikasi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `laporan_keuangan`
--
ALTER TABLE `laporan_keuangan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pesanan_id` (`pesanan_id`);

--
-- Indexes for table `log_kesehatan`
--
ALTER TABLE `log_kesehatan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `hewan_id` (`hewan_id`);

--
-- Indexes for table `log_stok`
--
ALTER TABLE `log_stok`
  ADD PRIMARY KEY (`id`),
  ADD KEY `hewan_id` (`hewan_id`);

--
-- Indexes for table `metode_pembayaran`
--
ALTER TABLE `metode_pembayaran`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notifikasi`
--
ALTER TABLE `notifikasi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_notif` (`user_id`);

--
-- Indexes for table `pemesanan`
--
ALTER TABLE `pemesanan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `hewan_id` (`hewan_id`),
  ADD KEY `fk_tukang` (`tukang_potong_id`),
  ADD KEY `fk_kelompok` (`kelompok_qurban_id`);

--
-- Indexes for table `rencana_cicilan`
--
ALTER TABLE `rencana_cicilan`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `transaksi_cicilan`
--
ALTER TABLE `transaksi_cicilan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_pesanan` (`id_pesanan`),
  ADD KEY `id_rencana_cicilan` (`id_rencana_cicilan`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cicilan`
--
ALTER TABLE `cicilan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `hewan`
--
ALTER TABLE `hewan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `history_pembayaran`
--
ALTER TABLE `history_pembayaran`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `kelompok_qurban`
--
ALTER TABLE `kelompok_qurban`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `konfigurasi_notifikasi`
--
ALTER TABLE `konfigurasi_notifikasi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `laporan_keuangan`
--
ALTER TABLE `laporan_keuangan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `log_kesehatan`
--
ALTER TABLE `log_kesehatan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `log_stok`
--
ALTER TABLE `log_stok`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `metode_pembayaran`
--
ALTER TABLE `metode_pembayaran`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `notifikasi`
--
ALTER TABLE `notifikasi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=72;

--
-- AUTO_INCREMENT for table `pemesanan`
--
ALTER TABLE `pemesanan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `rencana_cicilan`
--
ALTER TABLE `rencana_cicilan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `transaksi_cicilan`
--
ALTER TABLE `transaksi_cicilan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cicilan`
--
ALTER TABLE `cicilan`
  ADD CONSTRAINT `cicilan_ibfk_1` FOREIGN KEY (`id_pemesanan`) REFERENCES `pemesanan` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `history_pembayaran`
--
ALTER TABLE `history_pembayaran`
  ADD CONSTRAINT `history_pembayaran_ibfk_1` FOREIGN KEY (`pesanan_id`) REFERENCES `pemesanan` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `kelompok_qurban`
--
ALTER TABLE `kelompok_qurban`
  ADD CONSTRAINT `kelompok_qurban_ibfk_1` FOREIGN KEY (`hewan_id`) REFERENCES `hewan` (`id`);

--
-- Constraints for table `konfigurasi_notifikasi`
--
ALTER TABLE `konfigurasi_notifikasi`
  ADD CONSTRAINT `konfigurasi_notifikasi_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `laporan_keuangan`
--
ALTER TABLE `laporan_keuangan`
  ADD CONSTRAINT `laporan_keuangan_ibfk_1` FOREIGN KEY (`pesanan_id`) REFERENCES `pemesanan` (`id`);

--
-- Constraints for table `log_kesehatan`
--
ALTER TABLE `log_kesehatan`
  ADD CONSTRAINT `log_kesehatan_ibfk_1` FOREIGN KEY (`hewan_id`) REFERENCES `hewan` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `log_stok`
--
ALTER TABLE `log_stok`
  ADD CONSTRAINT `log_stok_ibfk_1` FOREIGN KEY (`hewan_id`) REFERENCES `hewan` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pemesanan`
--
ALTER TABLE `pemesanan`
  ADD CONSTRAINT `fk_kelompok` FOREIGN KEY (`kelompok_qurban_id`) REFERENCES `kelompok_qurban` (`id`);

--
-- Constraints for table `transaksi_cicilan`
--
ALTER TABLE `transaksi_cicilan`
  ADD CONSTRAINT `transaksi_cicilan_ibfk_1` FOREIGN KEY (`id_pesanan`) REFERENCES `pemesanan` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `transaksi_cicilan_ibfk_2` FOREIGN KEY (`id_rencana_cicilan`) REFERENCES `rencana_cicilan` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
