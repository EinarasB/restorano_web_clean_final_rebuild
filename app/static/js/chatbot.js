// === chatbot.js (AI su veiksmais) ===
document.addEventListener("DOMContentLoaded", function () {
    const toggleBtn = document.getElementById("chat-toggle");
    const chatWidget = document.getElementById("chat-widget");
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");

    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    const updateCartCount = () => {
        const total = cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartCount = document.getElementById("cart-count");
        if (cartCount) cartCount.textContent = total;
    };

    const saveCart = () => {
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount();
    };

    const addMessage = (sender, text, isUser = false) => {
        const p = document.createElement("p");
        p.innerHTML = `<strong class="${isUser ? 'user' : 'ai'}">${sender}:</strong> ${text}`;
        chatMessages.appendChild(p);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const simulateAdd = (itemName, quantity = 1) => {
        const buttons = document.querySelectorAll(".add-to-cart");
        for (let i = 0; i < quantity; i++) {
            let found = false;
            buttons.forEach(btn => {
                if (btn.dataset.name.toLowerCase() === itemName.toLowerCase()) {
                    btn.click();
                    found = true;
                }
            });
            if (!found) return false;
        }
        return true;
    };

    const removeFromCart = (itemName) => {
        const index = cart.findIndex(item => item.name.toLowerCase() === itemName.toLowerCase());
        if (index !== -1) {
            cart.splice(index, 1);
            saveCart();
            return true;
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
            console.log("🧠 GPT atsakymas (data.reply):", data.reply);

            try {
                const parsed = JSON.parse(data.reply);

                // Veiksmai
                if (parsed.action === "add_to_cart") {
                    const qty = parsed.quantity || 1;
                    const success = simulateAdd(parsed.item, qty);
                    if (success) addMessage("Sistema", `✅ Įdėta ${qty} x ${parsed.item}`, false);
                    else addMessage("Sistema", `❌ Nepavyko pridėti „${parsed.item}"`, false);
                }

                else if (parsed.action === "remove_from_cart") {
                    const success = removeFromCart(parsed.item);
                    if (success) addMessage("Sistema", `🗑️ Pašalinta: ${parsed.item}`, false);
                    else addMessage("Sistema", `⚠️ Neradau: ${parsed.item}`, false);
                }

                else if (parsed.action === "get_cart") {
                    if (cart.length === 0) return addMessage("Sistema", "🛒 Krepšelis tuščias.", false);
                    const list = cart.map(i => `- ${i.name} x ${i.quantity}`).join("<br>");
                    addMessage("Krepšelis", list, false);
                }

                else if (parsed.action === "get_total") {
                    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
                    addMessage("Sistema", `💰 Iš viso: €${total.toFixed(2)}`, false);
                }

                else if (parsed.action === "filter_price") {
                    const max = parsed.max_price;
                    const cheap = cart.filter(i => i.price <= max);
                    if (cheap.length === 0) return addMessage("Sistema", `🔍 Nėra nieko iki €${max}`, false);
                    const result = cheap.map(i => `${i.name} (€${i.price})`).join(", ");
                    addMessage("Filtras", `Patiekalai iki €${max}: ${result}`, false);
                }

                else if (parsed.action === "daily_offer") {
                    const suggestions = ["Margarita", "Latte kava", "Šokoladinis pyragas"];
                    addMessage("Dienos pasiūlymas", suggestions.join(" + "), false);
                }

                return;
            } catch (err) {
                console.log("⚠️ Nepavyko JSON.parse – rodome kaip tekstą");
            }

            // Ne JSON
            addMessage("Padavėjas AI", data.reply || "🤖 Atsiprašau, negaliu atsakyti.", false);

        } catch (e) {
            console.error("💥 Klaida:", e);
            addMessage("Padavėjas AI", "⚠️ Įvyko klaida jungiantis prie serverio.", false);
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
