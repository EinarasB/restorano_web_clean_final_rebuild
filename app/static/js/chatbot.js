// === chatbot.js (AI su veiksmais - pataisyta versija) ===
document.addEventListener("DOMContentLoaded", function () {
    const toggleBtn = document.getElementById("chat-toggle");
    const chatWidget = document.getElementById("chat-widget");
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

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
        let found = false;
        for (let i = 0; i < quantity; i++) {
            buttons.forEach(btn => {
                if (btn.dataset.name.toLowerCase() === itemName.toLowerCase()) {
                    btn.click();
                    found = true;
                }
            });
        }

        // 💡 Atsinaujina lokalų krepšelio vaizdą
        if (found) {
            const updated = JSON.parse(localStorage.getItem("cart")) || [];
            cart.length = 0;
            cart.push(...updated);
            updateCartCount();
        }

        return found;
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
            console.log("🧠 GPT atsakymas (pilnas objektas):", data);

            const raw = typeof data.reply === "string" ? data.reply.trim() : "";
            let actions = [];

            // Bandome ištraukti visus JSON objektus iš teksto
            const regex = /{[^}]+}/g;
            const matches = raw.match(regex);
            if (matches) {
                matches.forEach(str => {
                    try {
                        const parsed = JSON.parse(str);
                        if (parsed.action) actions.push(parsed);
                    } catch (e) {
                        console.warn("❌ Nevalidus JSON veiksmas:", str);
                    }
                });
            }

            // Jei turim veiksmų – vykdom juos
            if (actions.length > 0) {
                for (const act of actions) {
                    const qty = act.quantity || 1;

                    if (act.action === "add_to_cart") {
                        const success = simulateAdd(act.item, qty);
                        if (success) addMessage("Sistema", `✅ Įdėta ${qty} x ${act.item}`, false);
                        else addMessage("Sistema", `❌ Nepavyko pridėti: ${act.item}`, false);
                    }

                    if (act.action === "remove_from_cart") {
                        const success = removeFromCart(act.item);
                        if (success) addMessage("Sistema", `🗑️ Pašalinta: ${act.item}`, false);
                        else addMessage("Sistema", `⚠️ Nerasta: ${act.item}`, false);
                    }

                    if (act.action === "get_cart") {
                        if (cart.length === 0) {
                            addMessage("Sistema", "🛒 Krepšelis tuščias.", false);
                        } else {
                            const list = cart.map(i => `- ${i.name} x ${i.quantity}`).join("<br>");
                            addMessage("Krepšelis", list, false);
                        }
                    }

                    if (act.action === "get_total") {
                        const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
                        addMessage("Sistema", `💰 Iš viso: €${total.toFixed(2)}`, false);
                    }

                    if (act.action === "daily_offer") {
                        const suggestions = ["Margarita", "Latte kava", "Šokoladinis pyragas"];
                        suggestions.forEach(item => simulateAdd(item, 1));
                        addMessage("Dienos pasiūlymas", suggestions.join(" + "), false);
                    }
                }
                return;
            }

            // Jei tai ne JSON ir nėra veiksmų – rodom tekstą
            addMessage("Padavėjas AI", raw || "🤖 Atsiprašau, negaliu atsakyti.", false);

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

    toggleBtn.addEventListener("click", () => {
        chatWidget.classList.toggle("active");
    });

    addMessage("Padavėjas AI", "Sveiki! Kuo galiu padėti šiandien? 😊");

    updateCartCount();
});
