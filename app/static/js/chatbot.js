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
        let found = false;
        buttons.forEach(btn => {
            const btnName = btn.dataset.name?.toLowerCase();
            const targetName = itemName.toLowerCase();
            if (btnName === targetName) {
                console.log("🔘 Paspaudžiam mygtuką:", btnName);
                btn.click();
                found = true;
            }
        });
        return found;
    };

    const askAI = async (question) => {
        try {
            const response = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: question })
            });

            const data = await response.json();
            console.log("🧠 GPT atsakymas (data.reply):", data.reply);

            let parsed = null;
            try {
                parsed = JSON.parse(data.reply);
                console.log("📦 Parsuotas JSON:", parsed);
            } catch {
                console.warn("⚠️ Atsakymas nėra JSON, rodome tekstą.");
            }

            if (parsed && parsed.action === "add_to_cart" && parsed.item) {
                const success = simulateClick(parsed.item);
                if (success) {
                    addMessage("Padavėjas AI", `✅ Patiekalas „${parsed.item}“ įdėtas į krepšelį.`, false);
                } else {
                    addMessage("Padavėjas AI", `⚠️ Nepavyko pridėti – neradau patiekalo pavadinimu „${parsed.item}“.`, false);
                }
                return;
            }

            // Ne JSON atsakymas
            addMessage("Padavėjas AI", data.reply || "🤖 Atsiprašau, negaliu atsakyti.", false);

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

    addMessage("Padavėjas AI", "Sveiki! Kuo galiu padėti šiandien? 😊");
});
