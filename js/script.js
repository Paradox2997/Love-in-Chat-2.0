// ============================================================
// 0. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================
let currentRooms = [];
let currentUsers = [];
let currentMessages = [];
let currentRoomId = 'main';
const currentUserName = 'Ты';

// ============================================================
// 1. ЗАГРУЗКА ДАННЫХ
// ============================================================
async function loadAllData() {
    try {
        const [messagesRes, roomsRes, usersRes] = await Promise.all([
            fetch('data/messages.json'),
            fetch('data/rooms.json'),
            fetch('data/users.json')
        ]);
        if (!messagesRes.ok || !roomsRes.ok || !usersRes.ok) throw new Error('Ошибка загрузки');
        currentMessages = await messagesRes.json();
        currentRooms = await roomsRes.json();
        currentUsers = await usersRes.json();
        buildUI();
    } catch (e) {
        console.error(e);
        document.getElementById('messageContainer').innerHTML = `
            <div class="msg system"><span class="nick">Система:</span><span class="text">Не удалось загрузить данные.</span></div>
        `;
    }
}

// ============================================================
// 2. ПОСТРОЕНИЕ ИНТЕРФЕЙСА
// ============================================================
function buildUI() {
    // --- 2.1 Вкладки (горизонтальная лента) - все комнаты ---
    const tabsList = document.getElementById('tabsList');
    tabsList.innerHTML = '';
    currentRooms.forEach((room, index) => {
        const tab = document.createElement('div');
        tab.className = 'tab' + (index === 0 ? ' active' : '');
        tab.dataset.roomId = room.id;
        let icon = (room.type === 'private') ? '👤' : '👥';
        tab.textContent = `${icon} ${room.label}`;
        if (room.password) {
            const lock = document.createElement('span');
            lock.textContent = ' 🔒';
            tab.appendChild(lock);
        }
        tab.addEventListener('click', () => switchTab(room.id));
        tabsList.appendChild(tab);
    });

    // --- 2.2 Список комнат в правой панели (только НЕ приватные) ---
    const roomsListContainer = document.getElementById('roomsList');
    const roomsTitle = roomsListContainer.querySelector('.section-title');
    roomsListContainer.innerHTML = '';
    roomsListContainer.appendChild(roomsTitle);

    // Фильтруем только public и group
    const groupRooms = currentRooms.filter(room => room.type !== 'private');
    groupRooms.forEach(room => {
        const item = document.createElement('div');
        item.className = 'room-item' + (room.id === currentRoomId ? ' active' : '');
        const icon = '👥';
        const lockHtml = room.password ? ' <span class="lock-icon">🔒</span>' : '';
        const membersCount = room.members ? room.members.length : 0;
        item.innerHTML = `<span>${icon} ${room.label}${lockHtml}</span><span class="count">${membersCount}</span>`;
        item.addEventListener('click', () => switchTab(room.id));
        roomsListContainer.appendChild(item);
    });

    // --- 2.3 Список пользователей (с кольцами-аватарками) ---
    const usersListContainer = document.getElementById('usersList');
    const usersTitle = usersListContainer.querySelector('.section-title');
    usersListContainer.innerHTML = '';
    usersListContainer.appendChild(usersTitle);
    currentUsers.forEach(user => {
        const item = document.createElement('div');
        item.className = 'user-item';
        const avatar = document.createElement('span');
        avatar.className = `avatar-circle gender-${user.gender}`;
        item.appendChild(avatar);
        const nameSpan = document.createElement('span');
        nameSpan.textContent = user.name;
        item.appendChild(nameSpan);
        usersListContainer.appendChild(item);
    });

    // --- 2.4 Сообщения ---
    renderMessages();

    // --- 2.5 Прокрутка вкладок ---
    setTimeout(updateScrollButtons, 50);
}

// ============================================================
// 3. ОТОБРАЖЕНИЕ СООБЩЕНИЙ (с кольцами-аватарками)
// ============================================================
function renderMessages() {
    const messagesContainer = document.getElementById('messageContainer');
    messagesContainer.innerHTML = '';
    const roomMessages = currentMessages.filter(msg => msg.roomId === currentRoomId || (!msg.roomId && currentRoomId === 'main'));
    roomMessages.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'msg' + (msg.isSystem ? ' system' : '');

        if (!msg.isSystem) {
            const avatar = document.createElement('span');
            const user = currentUsers.find(u => u.name === msg.author);
            const gender = user ? user.gender : 'Д';
            avatar.className = `avatar-circle gender-${gender}`;
            div.appendChild(avatar);
        }

        const content = document.createElement('div');
        content.className = 'msg-content';

        const nickSpan = document.createElement('span');
        nickSpan.className = 'nick';
        if (msg.author === currentUserName) nickSpan.classList.add('self');
        nickSpan.textContent = msg.author + ':';

        const textSpan = document.createElement('span');
        textSpan.className = 'text';
        textSpan.innerHTML = msg.text;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = msg.time;

        content.appendChild(nickSpan);
        content.appendChild(textSpan);
        content.appendChild(timeSpan);
        div.appendChild(content);
        messagesContainer.appendChild(div);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ============================================================
// 4. ПЕРЕКЛЮЧЕНИЕ ВКЛАДКИ (с проверкой пароля и пола)
// ============================================================
function switchTab(roomId) {
    const room = currentRooms.find(r => r.id === roomId);
    if (!room) return;

    if (room.password) {
        showPasswordModal(roomId);
        return;
    }

    const currentUser = currentUsers.find(u => u.name === currentUserName);
    if (currentUser && room.genderRestriction && room.genderRestriction.length > 0) {
        if (!room.genderRestriction.includes(currentUser.gender)) {
            alert(`Вход в комнату "${room.label}" разрешён только для полов: ${room.genderRestriction.join(', ')}`);
            return;
        }
    }

    activateRoom(roomId);
}

function activateRoom(roomId) {
    currentRoomId = roomId;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.tab[data-room-id="${roomId}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Обновляем список комнат справа (активный элемент)
    document.querySelectorAll('.room-item').forEach(item => item.classList.remove('active'));
    const roomItems = document.querySelectorAll('.room-item');
    // Находим индекс среди групповых комнат (фильтруем)
    const groupRooms = currentRooms.filter(r => r.type !== 'private');
    const index = groupRooms.findIndex(r => r.id === roomId);
    if (index >= 0 && roomItems[index]) roomItems[index].classList.add('active');

    renderMessages();
}

// ============================================================
// 5. МОДАЛЬНОЕ ОКНО ПАРОЛЯ
// ============================================================
let pendingRoomId = null;

function showPasswordModal(roomId) {
    pendingRoomId = roomId;
    const room = currentRooms.find(r => r.id === roomId);
    document.getElementById('passwordRoomName').textContent = room.label;
    document.getElementById('passwordModal').classList.add('active');
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordInput').focus();
}

document.getElementById('passwordSubmitBtn').addEventListener('click', () => {
    const pass = document.getElementById('passwordInput').value;
    const room = currentRooms.find(r => r.id === pendingRoomId);
    if (room && room.password === pass) {
        document.getElementById('passwordModal').classList.remove('active');
        const currentUser = currentUsers.find(u => u.name === currentUserName);
        if (currentUser && room.genderRestriction && room.genderRestriction.length > 0) {
            if (!room.genderRestriction.includes(currentUser.gender)) {
                alert(`Вход в комнату "${room.label}" разрешён только для полов: ${room.genderRestriction.join(', ')}`);
                return;
            }
        }
        activateRoom(pendingRoomId);
        pendingRoomId = null;
    } else {
        alert('Неверный пароль!');
    }
});

document.getElementById('passwordCancelBtn').addEventListener('click', () => {
    document.getElementById('passwordModal').classList.remove('active');
    pendingRoomId = null;
});

document.getElementById('passwordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('passwordSubmitBtn').click();
});

// ============================================================
// 6. СОЗДАНИЕ КОМНАТЫ (с чекбоксами)
// ============================================================
document.getElementById('createRoomBtn').addEventListener('click', () => {
    document.getElementById('createRoomModal').classList.add('active');
    document.getElementById('roomNameInput').value = '';
    document.getElementById('roomPasswordInput').value = '';
    document.querySelectorAll('.gender-check').forEach(cb => cb.checked = false);
});

document.getElementById('modalCreateBtn').addEventListener('click', () => {
    const name = document.getElementById('roomNameInput').value.trim();
    if (!name) {
        alert('Введите название комнаты');
        return;
    }
    const password = document.getElementById('roomPasswordInput').value.trim() || null;
    const checkedGenders = [];
    document.querySelectorAll('.gender-check:checked').forEach(cb => {
        checkedGenders.push(cb.value);
    });
    const genderRestriction = checkedGenders;

    const newRoom = {
        id: 'room_' + Date.now(),
        label: name,
        type: 'group',
        password: password,
        genderRestriction: genderRestriction,
        creator: currentUserName,
        members: [currentUserName]
    };
    currentRooms.push(newRoom);
    currentMessages.push({
        author: 'Система',
        text: `Создана новая комната "${name}"${password ? ' (защищена паролем)' : ''}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
        roomId: newRoom.id
    });
    document.getElementById('createRoomModal').classList.remove('active');
    buildUI();
    switchTab(newRoom.id);
});

document.getElementById('modalCancelBtn').addEventListener('click', () => {
    document.getElementById('createRoomModal').classList.remove('active');
});

// ============================================================
// 7. ПРОКРУТКА ВКЛАДОК (стрелки)
// ============================================================
function updateScrollButtons() {
    const container = document.getElementById('tabsContainer');
    const tabsList = document.getElementById('tabsList');
    const leftBtn = document.getElementById('tabScrollLeft');
    const rightBtn = document.getElementById('tabScrollRight');
    const containerWidth = container.clientWidth;
    const tabsWidth = tabsList.scrollWidth;
    const scrollPos = container.scrollLeft;

    if (tabsWidth <= containerWidth) {
        leftBtn.style.display = 'none';
        rightBtn.style.display = 'none';
    } else {
        leftBtn.style.display = 'block';
        rightBtn.style.display = 'block';
        leftBtn.disabled = scrollPos <= 0;
        rightBtn.disabled = scrollPos + containerWidth >= tabsWidth - 2;
    }
}

document.getElementById('tabScrollLeft').addEventListener('click', () => {
    const container = document.getElementById('tabsContainer');
    container.scrollBy({ left: -120, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 350);
});

document.getElementById('tabScrollRight').addEventListener('click', () => {
    const container = document.getElementById('tabsContainer');
    container.scrollBy({ left: 120, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 350);
});

window.addEventListener('resize', updateScrollButtons);

// ============================================================
// 8. ОТПРАВКА СООБЩЕНИЙ
// ============================================================
const input = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendButton');

function addMessage(nick, text, isSelf = false, isSystem = false, roomId = null) {
    const newMsg = {
        author: nick,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: isSystem,
        roomId: roomId || currentRoomId
    };
    currentMessages.push(newMsg);
    renderMessages();
}

sendBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) return;
    addMessage(currentUserName, val, true);
    input.value = '';
    setTimeout(() => {
        const answers = ['👍', 'Ага, понял', 'Интересно...', 'Продолжай', 'Окей', '😄'];
        const rand = answers[Math.floor(Math.random() * answers.length)];
        addMessage('Бот', rand, false);
    }, 1000 + Math.random() * 2000);
});

input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

// ============================================================
// 9. СВОРАЧИВАНИЕ ПРАВОЙ ПАНЕЛИ
// ============================================================
document.getElementById('toggleBtn').addEventListener('click', () => {
    const panel = document.getElementById('rightPanel');
    panel.classList.toggle('collapsed');
    document.getElementById('toggleBtn').textContent = panel.classList.contains('collapsed') ? '▶' : '◀';
});

// ============================================================
// 10. ЗАПУСК
// ============================================================
loadAllData();