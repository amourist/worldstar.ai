<?php
// Simple chat.php untuk testing JSON

header("Content-Type: application/json");

// Ambil data dari frontend
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Cek apakah ada pesan
if (!isset($data['messages']) || !is_array($data['messages'])) {
    echo json_encode([
        "choices" => [
            ["message" => ["content" => "⚠️ Tidak ada pesan yang diterima."]]
        ]
    ]);
    exit;
}

// Ambil pesan terakhir user
$lastUserMessage = end($data['messages']);
$userText = isset($lastUserMessage['content']) ? $lastUserMessage['content'] : "";

// Balas dengan dummy response
$responseText = "Ini jawaban dummy AI untuk: " . $userText;

echo json_encode([
    "choices" => [
        ["message" => ["content" => $responseText]]
    ]
]);
?>