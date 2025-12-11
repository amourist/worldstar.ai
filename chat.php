<?php
// ==============================================================
// 🔐 CHAT.PHP: FILE BACKEND (PROXY) UNTUK OPENROUTER.AI
// ==============================================================

// 🛑 PENCEGAHAN AGRESIF 1: Mulai Output Buffering
// Ini akan menangkap SEMUA output yang dicetak sebelum kode selesai
ob_start();

// 🛑 PENCEGAHAN AGRESIF 2: Nonaktifkan Semua Error Reporting
// Error, Notice, atau Warning PHP TIDAK AKAN dicetak dan merusak JSON
error_reporting(0);
ini_set('display_errors', 0);


// ⚠️ WAJIB: GANTI INI DENGAN OPENROUTER API KEY ANDA
$openai_api_key = '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'; 

// URL Endpoint OpenRouter
$api_url = 'https://openrouter.ai/api/v1/chat/completions';
$model_name = 'openai/gpt-5.1-chat'; 

// Atur Header CORS dan Content Type
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Hanya izinkan POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method Not Allowed"]);
    
    // 🛑 PENCEGAHAN AGRESIF 3: Bersihkan Buffer dan Kirim Output
    ob_end_flush();
    exit;
}

// Ambil data JSON dari frontend
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

if (!isset($data['messages']) || !is_array($data['messages'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing or invalid 'messages' data in request."]);
    ob_end_flush();
    exit;
}

$messages_payload = $data['messages'];

// Tambahkan pesan sistem (System Message)
array_unshift($messages_payload, [
    "role" => "system", 
    "content" => "Kamu adalah asisten AI yang membantu, ramah, dan pintar bernama WorldStar.ai. Kamu menggunakan model {$model_name} dari OpenRouter. Jawablah dalam Bahasa Indonesia dan gunakan format Markdown."
]);

// Siapkan payload untuk API
$payload = json_encode([
    'model' => $model_name,
    'messages' => $messages_payload,
    'temperature' => 0.7, 
    'max_tokens' => 2048 
]);

// Inisialisasi cURL
$ch = curl_init($api_url);

// Set Timeout
curl_setopt($ch, CURLOPT_TIMEOUT, 60);       
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $openai_api_key,
    // ⚠️ WAJIB GANTI: SESUAIKAN DENGAN DOMAIN ANDA
    'HTTP-Referer: http://worldstarai-production.up.railway.app' 
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

// Eksekusi request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Tangani error cURL (kesalahan koneksi)
if (curl_errno($ch)) {
    curl_close($ch);
    http_response_code(500);
    echo json_encode(["error" => "Koneksi Gagal. Mohon cek ketersediaan server atau koneksi internet."]);
    ob_end_flush();
    exit;
}

// Tangani error API (Key salah, kredit habis, dll.)
if ($http_code !== 200) {
    curl_close($ch);
    http_response_code($http_code);
    echo json_encode(["error" => "Layanan AI tidak dapat diakses saat ini. Mohon cek API Key dan status layanan OpenRouter. Code: {$http_code}"]);
    ob_end_flush();
    exit;
}

curl_close($ch);

// Berhasil: Teruskan respons dari API ke frontend
echo $response;

// 🛑 PENCEGAHAN AGRESIF 4: Bersihkan Buffer dan Kirim Output
ob_end_flush();

// 🚫 JANGAN TAMBAH TAG PENUTUP PHP (?>) DI SINI!