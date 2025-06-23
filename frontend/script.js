const socket = io('http://localhost:3000');
const chat = document.getElementById('chat');

function appendMessage(user, text) {
    const msg = document.createElement('div');
    msg.textContent = `${user}: ${text}`;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('message');
    const text = input.value.trim();
    if (text) {
        socket.emit('chat message', text);
        appendMessage('Tú', text);
        input.value = '';
    }
}

socket.on('chat message', (msg) => {
    appendMessage('Otro', msg);
});
