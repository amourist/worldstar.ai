// ==========================================
// ⚙️ KONFIGURASI FRONTEND
// ==========================================

// URL Backend yang akan dipanggil
const BACKEND_URL = 'chat.php'; 

// ==========================================

// --- DOM Elements ---
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const openSidebarBtn = document.getElementById('open-sidebar-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const chatHistoryList = document.getElementById('chat-history-list');
const toggleDarkModeBtn = document.getElementById('toggle-dark-mode');
const exportChatBtn = document.getElementById('export-chat-btn'); 

const currentChatTitle = document.getElementById('current-chat-title');
const conversationContainer = document.getElementById('conversation-container');

const chatForm = document.getElementById('chat-form');
const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');

const renameDialog = document.getElementById('rename-dialog');
const renameInput = document.getElementById('rename-input');
const confirmRenameBtn = document.getElementById('confirm-rename-btn');
const cancelRenameBtn = document.getElementById('cancel-rename-btn');

// --- State Management ---
let currentChatId = null;
let chatSessions = {}; 
let isSending = false; // Flag untuk mencegah double submit

// --- Utility Functions ---

function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

/**
 * Membuat elemen pesan chat + Tombol Copy
 */
function createMessageElement(role, content, isLoading = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', role);
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble', role);

    if (isLoading) {
        bubbleDiv.innerHTML = `
            <div class="loading-dots">
                <span></span><span></span><span></span>
            </div>
        `;
    }else {
        const textPre = document.createElement('pre'); // Gunakan PRE untuk mempertahankan format baris baru
        
        // 🌟 BARIS PERBAIKAN: Memastikan teks panjang (misal URL atau kode tanpa spasi) akan memecah baris
        textPre.style.whiteSpace = 'pre-wrap'; 
        textPre.style.wordBreak = 'break-word';
        
        textPre.textContent = content; 
        
        const contentWrapper = document.createElement('div');
        contentWrapper.appendChild(textPre);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Salin';
        copyBtn.onclick = () => copyToClipboard(content, copyBtn);
        
        contentWrapper.appendChild(copyBtn);
        bubbleDiv.appendChild(contentWrapper);
    }
    
    messageDiv.appendChild(bubbleDiv);
    return messageDiv;
}

function copyToClipboard(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-check"></i> Tersalin';
        btnElement.style.color = 'var(--color-primary)';
        
        setTimeout(() => {
            btnElement.innerHTML = originalHtml;
            btnElement.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Gagal menyalin:', err);
    });
}

/**
 * Fungsi untuk menampilkan halaman (chat, welcome, about)
 */
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Atur input area hanya muncul di halaman chat dan welcome
        document.getElementById('input-area').style.display = (pageId === 'chat' || pageId === 'welcome') ? 'flex' : 'none';
        
        // Tutup sidebar di mobile setelah navigasi
        if (window.innerWidth <= 768) sidebar.classList.remove('open');
    }
}

// --- Chat History Functions ---

function renderChatHistory() {
    chatHistoryList.innerHTML = '';
    const sortedChats = Object.keys(chatSessions).sort((a, b) => b - a); 

    sortedChats.forEach(id => {
        const session = chatSessions[id];
        const listItem = document.createElement('li');
        listItem.classList.add('history-item');
        listItem.dataset.chatId = id;
        if (id === currentChatId) listItem.classList.add('active'); 
        
        listItem.innerHTML = `
            <span class="history-title-text">${session.title}</span>
            <div class="history-actions">
                <button class="history-action-btn rename-btn" title="Ganti Nama"><i class="fas fa-edit"></i></button>
                <button class="history-action-btn delete-btn" title="Hapus"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;

        listItem.addEventListener('click', (e) => {
            if (!e.target.closest('.history-actions')) loadChatSession(id);
        });
        
        listItem.querySelector('.rename-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showRenameDialog(id, session.title);
        });
        
        listItem.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChatSession(id);
        });

        chatHistoryList.appendChild(listItem);
    });
}

function loadChatSession(id) {
    if (!chatSessions[id]) return;
    currentChatId = id;
    const session = chatSessions[id];
    currentChatTitle.textContent = session.title;
    conversationContainer.innerHTML = '';
    
    session.messages.forEach(msg => {
        // Hapus pesan system dari tampilan jika ada (walaupun seharusnya tidak tersimpan)
        if (msg.role !== 'system') {
            conversationContainer.appendChild(createMessageElement(msg.role, msg.content));
        }
    });

    showPage('chat');
    conversationContainer.scrollTop = conversationContainer.scrollHeight;
    renderChatHistory(); 
}

/**
 * Memulai sesi chat baru dan kembali ke halaman welcome
 */
function startNewChat() {
    currentChatId = null;
    currentChatTitle.textContent = "Chat Baru";
    conversationContainer.innerHTML = '';
    renderChatHistory();
    showPage('welcome');
}

function addMessage(role, content) {
    if (!currentChatId) {
        const newId = generateId();
        // Set judul awal, akan diperbarui setelah mendapat respons AI jika perlu
        const initialTitle = content.length > 30 ? content.substring(0, 30) + '...' : content; 
        chatSessions[newId] = { title: initialTitle, messages: [] };
        currentChatId = newId;
        currentChatTitle.textContent = initialTitle;
        showPage('chat');
        renderChatHistory();
    }
    
    chatSessions[currentChatId].messages.push({ role, content });
    conversationContainer.appendChild(createMessageElement(role, content));
    conversationContainer.scrollTop = conversationContainer.scrollHeight;
    
    localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
}

function deleteChatSession(id) {
    if (confirm("Hapus percakapan ini?")) {
        delete chatSessions[id];
        localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
        renderChatHistory();
        if (currentChatId === id) startNewChat();
    }
}

// --- API Handler (Memanggil chat.php) ---

async function fetchAIResponse() {
    let messagesPayload = [];

    if (currentChatId && chatSessions[currentChatId]) {
        // Hanya kirim role 'user' dan 'assistant' (sebagai 'ai' di state)
        messagesPayload = chatSessions[currentChatId].messages.map(msg => ({
            role: (msg.role === 'ai' ? 'assistant' : msg.role), // konversi 'ai' ke 'assistant'
            content: msg.content
        }));
    }

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages: messagesPayload }) 
        });

        const data = await response.json(); 

        if (!response.ok) {
            // Tangani error dari PHP (misal cURL error) atau error dari OpenRouter
            const errorMsg = data.error || `Server Error: HTTP ${response.status}`;
            throw new Error(errorMsg);
        }
        
        // Respons berhasil
        return data.choices[0].message.content;

    } catch (error) {
        console.error("API Error:", error);
        // Tampilkan pesan error yang informatif di chat
        return `⚠️ Error: ${error.message}. Mohon cek koneksi, status server PHP (Laragon aktif), dan validitas API Key OpenRouter Anda.`;
    }
}

async function handleChatSubmit(e) {
    e.preventDefault();
    if (isSending) return; // Mencegah double submit

    const userPrompt = promptInput.value.trim();
    if (!userPrompt) return;

    isSending = true;
    const isNewChat = !currentChatId; 

    // 1. Tampilkan pesan user dan simpan ke state
    addMessage('user', userPrompt);

    promptInput.value = '';
    promptInput.style.height = 'auto';
    sendBtn.disabled = true;

    // 2. Tampilkan Loading
    const loadingEl = createMessageElement('ai', '', true);
    conversationContainer.appendChild(loadingEl);
    conversationContainer.scrollTop = conversationContainer.scrollHeight;

    // 3. Panggil API melalui PHP
    const aiResponse = await fetchAIResponse();

    // 4. Hapus loading & Tampilkan respon
    loadingEl.remove();
    addMessage('ai', aiResponse); 

    isSending = false;
    sendBtn.disabled = false;
    promptInput.focus();

    // 5. Update judul jika ini adalah chat baru dan tidak error
    if (isNewChat && !aiResponse.startsWith('⚠️ Error:')) {
        // Karena respons pertama sudah menjadi judul, render ulang history
        renderChatHistory();
    }
}

// --- Export Chat (Fitur Tambahan) ---
function exportChat() {
    if (!currentChatId || !chatSessions[currentChatId]) {
        alert("Tidak ada sesi chat aktif untuk diekspor.");
        return;
    }

    const session = chatSessions[currentChatId];
    let exportText = `*** WorldStar.ai Chat Export: ${session.title} ***\n\n`;

    session.messages.forEach(msg => {
        exportText += `[${msg.role.toUpperCase()}]: ${msg.content}\n\n`;
    });

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`Chat "${session.title}" berhasil diekspor.`);
}


// --- Rename Dialog Logic ---
let renamingChatId = null;
function showRenameDialog(id, currentTitle) {
    renamingChatId = id;
    renameInput.value = currentTitle;
    renameDialog.classList.add('visible');
    renameInput.focus();
}
function closeRenameDialog() {
    renameDialog.classList.remove('visible');
    renamingChatId = null;
}
function handleRename() {
    const newTitle = renameInput.value.trim();
    if (renamingChatId && newTitle) {
        chatSessions[renamingChatId].title = newTitle;
        if (currentChatId === renamingChatId) currentChatTitle.textContent = newTitle;
        localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
        renderChatHistory();
        closeRenameDialog();
    }
}

// --- Event Listeners & Init ---

document.addEventListener('DOMContentLoaded', () => {
    // Load LocalStorage Dark Mode
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        toggleDarkModeBtn.innerHTML = `<i class="fas fa-sun"></i> Mode Terang`;
    }

    // Load LocalStorage Chat Sessions
    const savedChats = localStorage.getItem('chatSessions');
    if (savedChats) {
        try { chatSessions = JSON.parse(savedChats); } catch (e) { console.error(e); }
    }

    renderChatHistory();
    startNewChat(); // Mulai dengan halaman welcome

    // Listeners
    toggleSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
    newChatBtn.addEventListener('click', startNewChat);
    chatForm.addEventListener('submit', handleChatSubmit);
    
    // Auto Resize Textarea & Enable/Disable Send Button
    promptInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        sendBtn.disabled = this.value.trim() === '' || isSending;
    });

    // Prompt Cards
    document.querySelectorAll('.prompt-card').forEach(card => {
        card.addEventListener('click', () => {
            promptInput.value = card.dataset.prompt;
            promptInput.dispatchEvent(new Event('input')); 
            promptInput.focus();
        });
    });

    // Listener untuk Navigasi Sidebar (Tentang AI & Kembali)
    document.querySelectorAll('.sidebar-option').forEach(link => {
        link.addEventListener('click', (e) => {
            const page = link.dataset.page;
            
            if (page) {
                e.preventDefault(); 
                
                if (page === 'welcome') {
                    startNewChat(); // Kembali ke welcome akan memulai sesi baru
                } else if (page === 'about') {
                    showPage(page);
                    currentChatTitle.textContent = "Tentang Ayaa.ai";
                } else {
                    showPage(page);
                }
            }
        });
    });

    // Listener Tombol Export & Dark Mode
    exportChatBtn.addEventListener('click', (e) => {
        e.preventDefault();
        exportChat();
    });

    toggleDarkModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        toggleDarkModeBtn.innerHTML = isDark ? `<i class="fas fa-sun"></i> Mode Terang` : `<i class="fas fa-moon"></i> Mode Gelap`;
        localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    });

    // Rename Dialog
    confirmRenameBtn.addEventListener('click', handleRename);
    cancelRenameBtn.addEventListener('click', closeRenameDialog);
    // Tutup dialog saat klik di luar
    renameDialog.addEventListener('click', (e) => { if (e.target === renameDialog) closeRenameDialog(); });
});