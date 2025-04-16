document.addEventListener("DOMContentLoaded", function () {
    const toggleBtn = document.getElementById("chat-toggle");
    const chatWidget = document.getElementById("chat-widget");
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");

    toggleBtn.addEventListener("click", () => {
        chatWidget.classList.toggle("active");
    });

    const addMessage = (sender, text, isUser = false) => {
        const p = document.createElement("p");
        p.innerHTML = `<strong class="${isUser ? 'user' : 'ai'}">${sender}:</strong> ${text}`;
        chatMessages.appendChild(p);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const askAI = async (question) => {
        try {
            const response = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: question })
            });

            const data = await response.json();

            // 🔍 DEBUG: parodyti konsolėje ką gavom
            console.log("🧠 GPT atsakymas:", data);

            const reply = data.reply || "🤖 Atsiprašau, šiuo metu negaliu atsakyti.";
            addMessage("Padavėjas AI", reply, false);
        } catch (e) {
            console.error("💥 Klaida:", e);
            addMessage("Padavėjas AI", "Atsiprašome, įvyko klaida jungiantis prie serverio.", false);
        }
    };

    sendBtn.addEventListener("click", () => {
        const msg = chatInput.value.trim();
        if (!msg) return;
        addMessage("Jūs", msg, true);
        chatInput.value = "";
        askAI(msg);
    });

    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendBtn.click();
    });

    // Pasveikinimas
    addMessage("Padavėjas AI", "Sveiki! Kuo galiu padėti šiandien? 😊");
});
