-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jan 06, 2026 at 07:59 AM
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
  `pesanan_id` int(11) NOT NULL,
  `angsuran_ke` int(11) NOT NULL,
  `nominal` decimal(15,2) NOT NULL,
  `jatuh_tempo` date NOT NULL,
  `tanggal_bayar` datetime DEFAULT NULL,
  `bukti_bayar` varchar(255) DEFAULT NULL,
  `status` enum('belum','dibayar','telat') DEFAULT 'belum',
  `keterangan` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cicilan`
--

INSERT INTO `cicilan` (`id`, `pesanan_id`, `angsuran_ke`, `nominal`, `jatuh_tempo`, `tanggal_bayar`, `bukti_bayar`, `status`, `keterangan`) VALUES
(85, 33, 1, 4083000.00, '2026-01-22', NULL, NULL, 'belum', NULL),
(86, 33, 2, 4083000.00, '2026-02-22', NULL, NULL, 'belum', NULL),
(87, 33, 3, 4083000.00, '2026-03-22', NULL, NULL, 'belum', NULL),
(88, 33, 4, 4083000.00, '2026-04-22', NULL, NULL, 'belum', NULL),
(89, 33, 5, 4083000.00, '2026-05-22', NULL, NULL, 'belum', NULL),
(90, 33, 6, 4083000.00, '2026-06-22', NULL, NULL, 'belum', NULL),
(91, 33, 7, 4083000.00, '2026-07-22', NULL, NULL, 'belum', NULL),
(92, 33, 8, 4083000.00, '2026-08-22', NULL, NULL, 'belum', NULL),
(93, 33, 9, 4083000.00, '2026-09-22', NULL, NULL, 'belum', NULL),
(94, 33, 10, 4083000.00, '2026-10-22', NULL, NULL, 'belum', NULL),
(95, 33, 11, 4083000.00, '2026-11-22', NULL, NULL, 'belum', NULL),
(96, 33, 12, 4087000.00, '2026-12-22', NULL, NULL, 'belum', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `detail_angsuran`
--

CREATE TABLE `detail_angsuran` (
  `id` int(11) NOT NULL,
  `id_cicilan` int(11) NOT NULL,
  `angsuran_ke` int(11) NOT NULL,
  `jumlah` decimal(15,2) NOT NULL,
  `tanggal_jatuh_tempo` date NOT NULL,
  `tanggal_bayar` date DEFAULT NULL,
  `status` enum('pending','paid','overdue','waived') DEFAULT 'pending',
  `keterangan` text DEFAULT NULL,
  `bukti_bayar` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(8, 'sapi turbo', 'dada', 35000000.00, 4, 'hewan-1766411165115.png');

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

--
-- Dumping data for table `history_pembayaran`
--

INSERT INTO `history_pembayaran` (`id`, `pesanan_id`, `jenis`, `nominal`, `metode`, `bukti`, `tanggal`, `keterangan`) VALUES
(5, 31, 'dp', 35000000.00, 'transfer', 'bukti-1766421680298.png', '2025-12-22 19:41:20', 'Pembayaran Down Payment'),
(6, 33, 'dp', 21000000.00, 'transfer', 'bukti-1766421706343.png', '2025-12-22 19:41:46', 'Pembayaran Down Payment');

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

--
-- Dumping data for table `konfigurasi_notifikasi`
--

INSERT INTO `konfigurasi_notifikasi` (`id`, `user_id`, `email_notif`, `inapp_notif`, `notify_pembayaran`, `notify_pengiriman`, `notify_promosi`, `notify_stok`) VALUES
(1, 3, 1, 1, 1, 1, 0, 0),
(2, 1, 1, 1, 1, 1, 0, 0),
(3, 2, 1, 1, 1, 1, 0, 0),
(4, 4, 1, 1, 1, 1, 0, 0);

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
(3, 'Pesanan Baru Masuk', 'Pesanan #4 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:37', NULL, 'admin'),
(7, 'Pesanan Baru Masuk', 'Pesanan #5 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:39', NULL, 'admin'),
(10, 'Pesanan Baru Masuk', 'Pesanan #6 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:40', NULL, 'admin'),
(11, 'Pesanan Baru Masuk', 'Pesanan #7 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:42', NULL, 'admin'),
(12, 'Pesanan Baru Masuk', 'Pesanan #9 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:42', NULL, 'admin'),
(14, 'Pesanan Baru Masuk', 'Pesanan #8 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:42', NULL, 'admin'),
(15, 'Pesanan Baru Masuk', 'Pesanan #10 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:43', NULL, 'admin'),
(19, 'Pesanan Baru Masuk', 'Pesanan #11 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:45', NULL, 'admin'),
(22, 'Pesanan Baru Masuk', 'Pesanan #12 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:47', NULL, 'admin'),
(23, 'Pesanan Baru Masuk', 'Pesanan #13 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:48', NULL, 'admin'),
(24, 'Pesanan Baru Masuk', 'Pesanan #14 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:48', NULL, 'admin'),
(26, 'Pesanan Baru Masuk', 'Pesanan #15 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:49', NULL, 'admin'),
(27, 'Pesanan Baru Masuk', 'Pesanan #16 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:50', NULL, 'admin'),
(28, 'Pesanan Baru Masuk', 'Pesanan #17 baru saja dibuat. Jenis: Ayam Legam, Jumlah: 1, Total: Rp 12.000.000', 'info', 0, '2025-12-22 12:33:52', NULL, 'admin'),
(30, 'Pembayaran Diterima', 'Pesanan #8 (Ayam Legam) telah mengupload bukti pembayaran.', 'info', 0, '2025-12-22 12:33:59', NULL, 'admin'),
(32, 'Pembayaran Diterima', 'Pesanan #8 (Ayam Legam) telah mengupload bukti pembayaran.', 'info', 0, '2025-12-22 12:34:02', NULL, 'admin'),
(34, 'Pesanan Selesai', 'Pesanan #8 telah selesai diproses.', 'success', 0, '2025-12-22 12:34:54', NULL, 'admin'),
(36, 'Pesanan Selesai', 'Pesanan #8 telah selesai diproses.', 'success', 0, '2025-12-22 12:35:00', NULL, 'admin'),
(38, '🔄 Status Pesanan Diperbarui', 'Status pesanan #2 telah berubah menjadi: Pesanan Selesai', 'info', 0, '2025-12-22 12:35:04', 1, 'pelanggan'),
(39, 'Pesanan Selesai', 'Pesanan #3 telah selesai diproses.', 'success', 0, '2025-12-22 12:35:04', NULL, 'admin'),
(40, 'Pesanan Selesai', 'Pesanan #2 telah selesai diproses.', 'success', 0, '2025-12-22 12:35:06', NULL, 'admin'),
(41, 'Hewan Baru Ditambahkan', 'Hewan Kambing Jawa telah ditambahkan ke katalog. Stok: 21 ekor, Harga: Rp 30.000.000', 'info', 0, '2025-12-22 12:36:20', NULL, 'admin'),
(42, 'Hewan Baru Ditambahkan', 'Hewan Kambing Racing telah ditambahkan ke katalog. Stok: 10 ekor, Harga: Rp 35.000.000', 'info', 0, '2025-12-22 12:46:18', NULL, 'admin'),
(43, 'Hewan Baru Ditambahkan', 'Hewan sapi turbo telah ditambahkan ke katalog. Stok: 12 ekor, Harga: Rp 10.000.000', 'info', 0, '2025-12-22 12:59:02', NULL, 'admin'),
(44, 'Hewan Baru Ditambahkan', 'Hewan sapi turbo telah ditambahkan ke katalog. Stok: 10 ekor, Harga: Rp 35.000.000', 'info', 0, '2025-12-22 13:46:05', NULL, 'admin'),
(46, 'Pesanan Baru Masuk', 'Pesanan #18 baru saja dibuat. Jenis: sapi turbo, Jumlah: 1, Total: Rp 35.000.000', 'info', 0, '2025-12-22 13:46:23', NULL, 'admin'),
(48, 'Pesanan Baru Masuk', 'Pesanan #19 baru saja dibuat. Jenis: sapi turbo, Jumlah: 1, Total: Rp 35.000.000', 'info', 0, '2025-12-22 13:48:41', NULL, 'admin'),
(50, 'Pesanan Baru Masuk', 'Pesanan #20 baru saja dibuat. Jenis: sapi turbo, Jumlah: 1, Total: Rp 35.000.000', 'info', 0, '2025-12-22 13:48:45', NULL, 'admin'),
(52, 'Pembayaran Diterima', 'Pesanan #20 (sapi turbo) telah mengupload bukti pembayaran.', 'info', 0, '2025-12-22 13:48:57', NULL, 'admin'),
(55, 'Pesanan Baru Masuk', 'Pesanan #22 baru saja dibuat. Jenis: sapi turbo, Jumlah: 1, Total: Rp 35.000.000', 'info', 0, '2025-12-22 14:09:03', NULL, 'admin'),
(56, 'Pesanan Baru Masuk', 'Pesanan #21 baru saja dibuat. Jenis: sapi turbo, Jumlah: 1, Total: Rp 35.000.000', 'info', 0, '2025-12-22 14:09:03', NULL, 'admin'),
(58, 'Pesanan Baru Masuk', 'Pesanan #23 baru saja dibuat. Jenis: sapi turbo, Jumlah: 1, Total: Rp 35.000.000', 'info', 0, '2025-12-22 14:46:32', NULL, 'admin'),
(61, 'Pesanan Baru Masuk', 'Pesanan #24 baru saja dibuat. Jenis: sapi turbo, Jumlah: 1, Total: Rp 35.000.000', 'info', 0, '2025-12-22 14:51:50', NULL, 'admin'),
(64, 'Pesanan Baru Masuk', 'Pesanan #25 baru saja dibuat. Jenis: sapi turbo, Jumlah: 1, Total: Rp 35.000.000', 'info', 0, '2025-12-22 14:57:13', NULL, 'admin'),
(67, 'Pesanan Baru Masuk', 'Pesanan #26 baru saja dibuat. Jenis: sapi turbo, Jumlah: 1, Total: Rp 35.000.000', 'info', 0, '2025-12-22 15:05:14', NULL, 'admin'),
(69, 'Pesanan Selesai', 'Pesanan #20 telah selesai diproses.', 'success', 0, '2025-12-22 15:05:46', NULL, 'admin');

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
  `total_angsuran` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pemesanan`
--

INSERT INTO `pemesanan` (`id`, `user_id`, `hewan_id`, `jumlah`, `total_harga`, `tanggal_pemesanan`, `jadwal_pemotongan`, `status_pesanan`, `bukti_transfer`, `status_hewan`, `is_cicilan`, `id_cicilan`, `dp_amount`, `remaining_amount`, `cicilan_status`, `metode_bayar`, `status_pembayaran`, `dp_nominal`, `dp_bukti`, `dp_date`, `total_dibayar`, `jatuh_tempo_cicilan`, `angsuran_ke`, `total_angsuran`) VALUES
(31, 2, 8, 1, 35000000.00, '2025-12-22 19:41:12', '2025-12-29', 'selesai', NULL, 'di_kandang', 0, NULL, 0.00, 0.00, 'full', 'cash', 'dp', 0.00, 'bukti-1766421680298.png', '2025-12-22 19:41:20', 0.00, NULL, 0, 0),
(33, 2, 8, 2, 70000000.00, '2025-12-22 19:41:39', '2025-12-29', 'dibayar', NULL, 'di_kandang', 0, NULL, 0.00, 0.00, 'full', 'cicilan', 'dp', 21000000.00, 'bukti-1766421706343.png', '2025-12-22 19:41:46', 0.00, '2026-01-21', 0, 12);

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
(2, 'laybahas', 'laybahas@gmail.com', '$2b$08$4zXgMpgZWqjzZAmdClJvQ.XntFLjRaoiIYNCWb0OrlqLtAIes2iqu', '0812121216', 'jl.kontol', 'pelanggan', '2025-12-19 14:27:30', '6f54813c676bc974d241b06b9cb18c9c28428eeb', '2025-12-19 18:53:48'),
(3, 'atharrayna', 'atharraynaad@gmail.com', '$2b$08$BHLyCWkdhMusj3bleyulg.3gp4iJSt/aZ21jUr5FiYwqgXGyip9fy', '0812121216', 'jl.kontol', 'pelanggan', '2025-12-19 15:13:18', 'e6f222e0460f66679b5e75a755c491591ad6dfac', '2025-12-19 19:13:23'),
(4, 'sensormyname', 'sensormyname@gmail.com', '$2b$08$mjrfv0L8guI7LQfPfuScFu/TT0Bo7GEJBniGTBHy./cTUa2L..j4a', '0812121216', 'jl.keong', 'pelanggan', '2025-12-19 15:31:04', NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cicilan`
--
ALTER TABLE `cicilan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pesanan_status` (`pesanan_id`,`status`);

--
-- Indexes for table `detail_angsuran`
--
ALTER TABLE `detail_angsuran`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_angsuran` (`id_cicilan`,`angsuran_ke`);

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
  ADD KEY `hewan_id` (`hewan_id`);

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
-- AUTO_INCREMENT for table `cicilan`
--
ALTER TABLE `cicilan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=97;

--
-- AUTO_INCREMENT for table `detail_angsuran`
--
ALTER TABLE `detail_angsuran`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hewan`
--
ALTER TABLE `hewan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `history_pembayaran`
--
ALTER TABLE `history_pembayaran`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `konfigurasi_notifikasi`
--
ALTER TABLE `konfigurasi_notifikasi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `laporan_keuangan`
--
ALTER TABLE `laporan_keuangan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `log_stok`
--
ALTER TABLE `log_stok`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cicilan`
--
ALTER TABLE `cicilan`
  ADD CONSTRAINT `cicilan_ibfk_1` FOREIGN KEY (`pesanan_id`) REFERENCES `pemesanan` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `detail_angsuran`
--
ALTER TABLE `detail_angsuran`
  ADD CONSTRAINT `detail_angsuran_ibfk_1` FOREIGN KEY (`id_cicilan`) REFERENCES `transaksi_cicilan` (`id`) ON DELETE CASCADE;

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
