<?php
// ==============================================================
// 🔐 CHAT.PHP: FILE BACKEND (PROXY) UNTUK OPENROUTER.AI
// ==============================================================

// ⚠️ WAJIB: GANTI INI DENGAN OPENROUTER API KEY ANDA
// Kunci ini harus dimulai dengan 'sk-or-v1-'
$openai_api_key = getenv('OPENROUTER_API_KEY');

// URL Endpoint OpenRouter
$api_url = 'https://openrouter.ai/api/v1/chat/completions';

// Model yang diminta: openai/gpt-5.1-chat
$model_name = 'openai/gpt-5.1-chat'; 

// Atur CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Hanya izinkan POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method Not Allowed"]);
    exit;
}

// Ambil data JSON dari frontend
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

if (!isset($data['messages']) || !is_array($data['messages'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing or invalid 'messages' data in request."]);
    exit;
}

$messages_payload = $data['messages'];

// Tambahkan pesan sistem (System Message)
array_unshift($messages_payload, [
    "role" => "system", 
    "content" => "Kamu adalah asisten AI yang membantu, ramah, dan pintar bernama WorldStar.ai Kamu menggunakan model {$model_name} dari OpenRouter. Jawablah dalam Bahasa Indonesia dan gunakan format Markdown."
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
// ... (Jika Anda belum menambahkan timeout, tambahkan di sini)
curl_setopt($ch, CURLOPT_TIMEOUT, 60);       
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $openai_api_key,
    'HTTP-Referer: http://worldstar.gt.tc' // Direkomendasikan OpenRouter
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

// Eksekusi request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Tangani error cURL (kesalahan koneksi)
if (curl_errno($ch)) {
    $curl_error_message = curl_error($ch);
    curl_close($ch);
    http_response_code(500);
    echo json_encode(["error" => "cURL Error: Gagal koneksi ke API. Mohon cek koneksi server Anda atau hubungi penyedia layanan hosting. Pesan: " . $curl_error_message]);
    exit;
}

// Tangani error API (Key salah, kredit habis, model tidak tersedia)
if ($http_code !== 200) {
    $error_body = json_decode($response, true);
    
    $error_message = "Unknown API Error. HTTP Code: {$http_code}.";
    if (isset($error_body['error']['message'])) {
        $error_message = $error_body['error']['message'];
    } elseif (isset($error_body['message'])) {
        $error_message = $error_body['message'];
    }
    
    curl_close($ch);
    http_response_code($http_code);
    echo json_encode(["error" => "OpenRouter Error: {$error_message}"]);
    exit;
}

curl_close($ch);

// Berhasil: Teruskan respons dari API ke frontend
echo $response;
?>