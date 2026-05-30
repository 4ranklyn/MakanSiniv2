# Panduan Setup Android Capacitor - MakanSini

MakanSini frontend didekorasikan menggunakan Capacitor untuk dibungkus menjadi aplikasi Android Native. Ikuti petunjuk di bawah ini untuk membuka, mengompilasi, dan menjalankan aplikasi di emulator atau perangkat fisik.

---

## 1. Prasyarat (Prerequisites)
Sebelum memulai, pastikan perangkat pengembangan Anda telah terpasang:
- **Node.js** (v18+)
- **Android Studio** (dan Android SDK Platform-Tools)
- **Java Development Kit (JDK)** (direkomendasikan versi 17 yang terintegrasi dengan Android Studio)

---

## 2. Cara Membuka Proyek di Android Studio
Anda dapat membuka folder Android dari terminal:
```bash
npx cap open android
```
Atau secara manual:
1. Buka **Android Studio**.
2. Pilih **Open an Existing Project** (atau **File > Open**).
3. Arahkan ke folder proyek: `c:\Users\jasso\Documents\makansini_bwai\frontend\android` dan pilih folder tersebut.
4. Tunggu beberapa saat selagi Android Studio melakukan sinkronisasi Gradle (Gradle Sync) untuk pertama kalinya.

---

## 3. Konfigurasi Alamat API Backend

Aplikasi web MakanSini yang dimuat dalam Android WebView tidak dapat menggunakan `http://localhost:8080` untuk memanggil API backend karena `localhost` pada Android merujuk ke perangkat Android itu sendiri.

Untuk mempermudah pengembangan, alamat API diatur secara dinamis di `src/config/api.js`:
- **Emulator Android**: Mengarahkan ke IP loopback khusus `http://10.0.2.2:8080` secara otomatis untuk tersambung ke backend Go yang berjalan di laptop/host Anda.
- **Perangkat Fisik (Physical USB Device)**:
  Jika menguji aplikasi langsung di HP fisik, pastikan HP dan laptop terhubung dalam satu jaringan Wi-Fi yang sama, kemudian buat berkas `.env` di folder `frontend` dengan isi:
  ```env
  VITE_API_URL=http://<IP-LAPTOP-ANDA>:8080
  ```
  *(Ganti `<IP-LAPTOP-ANDA>` dengan IP lokal komputer Anda, misalnya `192.168.1.50`)*

---

## 4. Menjalankan Aplikasi

### A. Menggunakan Emulator
1. Di Android Studio, buat Virtual Device baru melalui **Device Manager** jika belum ada (disarankan menggunakan API level 30+).
2. Pilih Emulator tersebut sebagai target perangkat di toolbar bagian atas.
3. Klik tombol **Run** (ikon Play hijau atau `Shift + F10`).

### B. Menggunakan HP Fisik (USB Debugging)
1. Aktifkan **Developer Options** dan **USB Debugging** di HP Android Anda.
2. Hubungkan HP ke laptop menggunakan kabel USB.
3. Pilih nama perangkat HP Anda di toolbar perangkat target Android Studio.
4. Klik tombol **Run** (ikon Play).

---

## 5. Cara Sinkronisasi Perubahan Kode Web di Masa Depan
Setiap kali Anda mengubah kode React/Vite dan ingin menerapkannya ke proyek Android:

1. Build ulang kode frontend web:
   ```bash
   npm run build
   ```
2. Salin aset kompilasi web (`dist`) ke dalam folder aset native Android:
   ```bash
   npx cap copy
   ```
   *(Catatan: Jika Anda menambahkan library/plugin Capacitor baru, jalankan `npx cap sync` sebagai ganti `npx cap copy`)*
3. Klik **Run** kembali di Android Studio atau klik tombol **Apply Changes** untuk memuat ulang aplikasi dengan aset baru tanpa membangun ulang seluruh aplikasi dari awal.
