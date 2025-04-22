// === chatbot.js (atnaujinta) ===
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

    const simulateClick = (itemName) => {
        const buttons = document.querySelectorAll(".add-to-cart");
        for (let btn of buttons) {
            const name = btn.getAttribute("data-name")?.toLowerCase();
            if (name && name.includes(itemName.toLowerCase())) {
                btn.click();
                return true;
            }
        }
        return false;
    };

    const askAI = async (question) => {
        try {
            const response = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: question })
            });

            const data = await response.json();
            console.log("🧠 GPT atsakymas:", data);

            if (data.reply) {
                addMessage("Padavėjas AI", data.reply, false);
            } else if (data.action === "add_to_cart" && data.item) {
                addMessage("Padavėjas AI", `Pridedu į krepšelį: ${data.item}`, false);
                simulateClick(data.item);
            } else {
                addMessage("Padavėjas AI", "🤖 Atsiprašau, nesupratau užklausos.", false);
            }


            // Automatizuotas veiksmų atlikimas
            if (data.action === "add_to_cart" && data.item) {
                const success = simulateClick(data.item);
                if (success) addMessage("Sistema", `✅ ${data.item} pridėtas į krepšelį automatiškai.`, false);
                else addMessage("Sistema", `❌ Nepavyko pridėti ${data.item} - nerasta.`);
            }
        } catch (e) {
            console.error("💥 Klaida:", e);
            addMessage("Padavėjas AI", "Atsiprašome, įvykė serverio klaida.", false);
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

    addMessage("Padavėjas AI", "Sveiki! Kuo galiu padėti šiandien? 😊");
});