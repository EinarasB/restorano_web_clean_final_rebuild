// === chatbot.js (AI su veiksmais - stabili pataisyta versija) ===
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
            let reply = data.reply || data; // Jei nėra reply – naudojam visą data

            console.log("🧠 GPT atsakymas (data.reply):", reply);

            // Jeigu reply yra objektas – konvertuojam į tekstą
            const rawText = typeof reply === "object" ? JSON.stringify(reply) : reply;

            const actions = [];
            const regex = /{[^{}]+}/g;
            const matches = rawText.match(regex);

            if (matches) {
                for (const match of matches) {
                    try {
                        const obj = JSON.parse(match);
                        actions.push(obj);
                    } catch {
                        console.warn("❌ Nevalidus JSON blokas:", match);
                    }
                }
            }

            if (actions.length > 0) {
                for (const act of actions) {
                    const qty = act.quantity || 1;

                    if (act.action === "add_to_cart") {
                        const success = simulateAdd(act.item, qty);
                        if (success) addMessage("Sistema", `✅ Įdėta ${qty} x ${act.item}`, false);
                        else addMessage("Sistema", `❌ Nepavyko pridėti: ${act.item}`, false);
                    }

                    else if (act.action === "remove_from_cart") {
                        const success = removeFromCart(act.item);
                        if (success) addMessage("Sistema", `🗑️ Pašalinta: ${act.item}`, false);
                        else addMessage("Sistema", `⚠️ Nerasta: ${act.item}`, false);
                    }

                    else if (act.action === "get_cart") {
                        if (cart.length === 0) {
                            addMessage("Sistema", "🛒 Krepšelis tuščias.", false);
                        } else {
                            const list = cart.map(i => `- ${i.name} x ${i.quantity}`).join("<br>");
                            addMessage("Krepšelis", list, false);
                        }
                    }

                    else if (act.action === "get_total") {
                        const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
                        addMessage("Sistema", `💰 Iš viso: €${total.toFixed(2)}`, false);
                    }

                    else if (act.action === "filter_price") {
                        const max = act.max_price;
                        const cheap = cart.filter(i => i.price <= max);
                        if (cheap.length === 0) return addMessage("Sistema", `🔍 Nėra nieko iki €${max}`, false);
                        const result = cheap.map(i => `${i.name} (€${i.price})`).join(", ");
                        addMessage("Filtras", `Patiekalai iki €${max}: ${result}`, false);
                    }

                    else if (act.action === "daily_offer") {
                        const offerItems = ["Margarita", "Latte kava", "Spurga su šokoladu"];
                        offerItems.forEach(name => simulateAdd(name));
                        addMessage("Dienos pasiūlymas", `✅ Įdėti: ${offerItems.join(", ")}`, false);
                    }
                }
                return;
            }

            addMessage("Padavėjas AI", rawText || "🤖 Atsiprašau, negaliu atsakyti.", false);

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

    const micBtn = document.getElementById("mic-btn");

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'lt-LT';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript.trim();
            chatInput.value = transcript;
            sendBtn.click();
        };

        recognition.onerror = function (event) {
            console.error("🎤 Kalbos atpažinimo klaida:", event.error);
            addMessage("Sistema", "❌ Nepavyko suprasti balso. Bandyk dar kartą.", false);
        };

        micBtn.addEventListener("click", () => {
            recognition.start();
            addMessage("Sistema", "🎙️ Kalbėkite...", false);
        });
    } else {
        micBtn.style.display = "none";
        console.warn("🎤 Naršyklė nepalaiko kalbos atpažinimo");
    }


    addMessage("Padavėjas AI", "Sveiki! Kuo galiu padėti šiandien? 😊");

    updateCartCount();
});
