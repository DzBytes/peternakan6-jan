-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jan 06, 2026 at 10:35 AM
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
-- Table structure for table `hewan`
--

CREATE TABLE `hewan` (
  `id` int(11) NOT NULL,
  `jenis_hewan` varchar(50) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `harga` decimal(15,2) DEFAULT NULL,
  `stok` int(11) NOT NULL,
  `gambar` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hewan`
--

INSERT INTO `hewan` (`id`, `jenis_hewan`, `deskripsi`, `harga`, `stok`, `gambar`) VALUES
(10, 'Kambing Turbo', 'sekarat', 1000000.00, 10, 'hewan-1767690666436.png');

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

--
-- Dumping data for table `log_stok`
--

INSERT INTO `log_stok` (`id`, `hewan_id`, `stok_sebelum`, `stok_sesudah`, `aksi`, `jumlah`, `keterangan`, `created_at`) VALUES
(2, 10, 0, 12, 'tambah_baru', 12, 'Inisiasi stok hewan baru', '2026-01-06 09:11:06');

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
  `status_pesanan` varchar(50) DEFAULT 'pending',
  `bukti_transfer` varchar(255) DEFAULT NULL,
  `status_hewan` enum('di_kandang','siap_potong','sudah_dipotong','disalurkan') DEFAULT 'di_kandang',
  `is_cicilan` tinyint(1) DEFAULT 0,
  `id_cicilan` int(11) DEFAULT NULL,
  `dp_amount` decimal(15,2) DEFAULT 0.00,
  `remaining_amount` decimal(15,2) DEFAULT 0.00,
  `cicilan_status` enum('full','dp_only','cicilan') DEFAULT 'full',
  `metode_bayar` enum('cash','cicilan') DEFAULT 'cash',
  `status_pembayaran` enum('belum_dp','dp','cicilan','lunas') DEFAULT 'belum_dp',
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
  `tukang_potong_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pesanan`
--

CREATE TABLE `pesanan` (
  `id` int(11) NOT NULL,
  `nama_pembeli` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `no_hp` varchar(20) DEFAULT NULL,
  `jenis_hewan` varchar(100) DEFAULT NULL,
  `harga` int(11) DEFAULT NULL,
  `status_pembayaran` enum('belum_bayar','lunas') DEFAULT 'belum_bayar',
  `status_hewan` enum('di_kandang','siap_potong','sudah_dipotong','disalurkan') DEFAULT 'di_kandang',
  `jatuh_tempo` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(5, 'yaya123', 'yasya123@gmail.com', '$2b$08$JldgrLUrXOnwXecL6On9weHj7BiKigmUE.xC0oYSRKDrObzKWnjiS', '0987654321', 'qawsedfgh', 'pelanggan', '2026-01-06 07:04:55', NULL, NULL);

--
-- Indexes for dumped tables
--

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
  ADD KEY `fk_tukang` (`tukang_potong_id`);

--
-- Indexes for table `pesanan`
--
ALTER TABLE `pesanan`
  ADD PRIMARY KEY (`id`);

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
-- AUTO_INCREMENT for table `hewan`
--
ALTER TABLE `hewan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `history_pembayaran`
--
ALTER TABLE `history_pembayaran`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=70;

--
-- AUTO_INCREMENT for table `pemesanan`
--
ALTER TABLE `pemesanan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `pesanan`
--
ALTER TABLE `pesanan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `history_pembayaran`
--
ALTER TABLE `history_pembayaran`
  ADD CONSTRAINT `history_pembayaran_ibfk_1` FOREIGN KEY (`pesanan_id`) REFERENCES `pemesanan` (`id`) ON DELETE CASCADE;

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
-- Constraints for table `log_stok`
--
ALTER TABLE `log_stok`
  ADD CONSTRAINT `log_stok_ibfk_1` FOREIGN KEY (`hewan_id`) REFERENCES `hewan` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pemesanan`
--
ALTER TABLE `pemesanan`
  ADD CONSTRAINT `fk_tukang` FOREIGN KEY (`tukang_potong_id`) REFERENCES `tukang_potong` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `pemesanan_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `pemesanan_ibfk_2` FOREIGN KEY (`hewan_id`) REFERENCES `hewan` (`id`);

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
