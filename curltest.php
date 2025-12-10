<?php
if (function_exists('curl_version')) {
    echo "✅ CURL aktif! Version: " . curl_version()['version'];
} else {
    echo "❌ CURL TIDAK AKTIF";
}
?>