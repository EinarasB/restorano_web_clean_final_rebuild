﻿
let pendingAction = null;
let chatMessages;

const speak = (text) => {
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'lt-LT';

        const loadVoices = () => {
            const voices = speechSynthesis.getVoices();
            if (!voices.length) {
                setTimeout(loadVoices, 100);
                return;
            }

            const preferredVoice = voices.find(v =>
                v.lang === 'lt-LT' &&
                (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('microsoft'))
            ) || voices.find(v => v.lang === 'lt-LT');

            if (preferredVoice) msg.voice = preferredVoice;

            speechSynthesis.speak(msg);
        };

        loadVoices();
    }
};

const showTyping = () => {
    const p = document.createElement("p");
    p.id = "typing-indicator";
    p.innerHTML = "<em>Padavėjas DI rašo...</em>";
    chatMessages.appendChild(p);
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

const removeTyping = () => {
    const typing = document.getElementById("typing-indicator");
    if (typing) typing.remove();
};

document.addEventListener("DOMContentLoaded", function () {
    const toggleBtn = document.getElementById("chat-toggle");
    const chatWidget = document.getElementById("chat-widget");
    chatMessages = document.getElementById("chat-messages");
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

    const simulateAdd = (itemName, quantity = 1, customizations = null) => {
        let cartItems = JSON.parse(localStorage.getItem("cart")) || [];

        const existing = cartItems.find(item =>
            item.name.toLowerCase() === itemName.toLowerCase() &&
            JSON.stringify(item.customizations || []) === JSON.stringify(customizations || [])
        );

        if (existing) {
            existing.quantity += quantity;
        } else {
            const price = parseFloat(
                [...document.querySelectorAll(".add-to-cart")]
                    .find(btn => btn.dataset.name.toLowerCase() === itemName.toLowerCase())?.dataset.price
            );

            if (isNaN(price)) return false;

            cartItems.push({
                name: itemName,
                quantity,
                price,
                customizations
            });
        }

        localStorage.setItem("cart", JSON.stringify(cartItems));
        cart.length = 0;
        cart.push(...cartItems);
        updateCartCount();
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
            showTyping();

            const response = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: question })
            });

            removeTyping();

            const data = await response.json();
            let reply = data.reply || data;
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
                        console.warn("Nevalidus JSON blokas:", match);
                    }
                }
            }

            if (actions.length > 0) {
                for (const act of actions) {
                    const qty = act.quantity || 1;

                    if (act.action === "customize_item") {
                        const customItem = {
                            name: act.item,
                            price: 0,
                            quantity: 1,
                            customizations: act.remove || []
                        };

                        const buttons = document.querySelectorAll(".add-to-cart");
                        buttons.forEach(btn => {
                            if (btn.dataset.name.toLowerCase() === customItem.name.toLowerCase()) {
                                customItem.price = parseFloat(btn.dataset.price);
                            }
                        });

                        if (customItem.price === 0) {
                            addMessage("Sistema", `⚠️ Nepavyko nustatyti ${customItem.name} kainos.`, false);
                            return;
                        }

                        addMessage("Sistema", `🧑‍🍳 Pašalinti ingredientai: ${customItem.customizations.join(", ")}.<br>Ar pridėti šį patiekalą į krepšelį? (Atsakykite „taip“)`, false);
                        pendingAction = {
                            type: "add_custom_item",
                            item: customItem
                        };
                        return;
                    }

                    if (act.action === "add_to_cart") {
                        const success = simulateAdd(act.item, qty, act.customizations || null);
                        if (success) {
                            const ing = act.customizations?.length ? ` (be: ${act.customizations.join(", ")})` : "";
                            addMessage("Sistema", `✅ ĮDĖTA ${qty} x ${act.item}${ing}`, false);
                        } else {
                            addMessage("Sistema", `❌ Nepavyko pridėti: ${act.item}`, false);
                        }
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
                        addMessage("Dienos pasiūlymas", `✅ ĮDĖTA: ${offerItems.join(", ")}`, false);
                    }

                    else if (act.action === "reserve_table") {
                        const formData = new FormData();
                        formData.append("table_id", act.table_id);
                        formData.append("date", act.date);
                        formData.append("time", act.time);

                        fetch("/reserve-table", {
                            method: "POST",
                            body: formData
                        }).then(res => res.json())
                            .then(data => {
                                if (data.message) {
                                    addMessage("Sistema", data.message, false);
                                } else {
                                    addMessage("Sistema", "❌ Klaida rezervuojant: " + data.detail, false);
                                }
                            }).catch(err => {
                                addMessage("Sistema", "⚠️ Nepavyko atlikti užklausos", false);
                            });
                    }

                    else if (act.action === "my_reservations") {
                        const res = await fetch("/my-reservations");
                        const data = await res.json();

                        if (!data.reservations.length) {
                            addMessage("Sistema", `🪑 Neturite jokių rezervacijų.`, false);
                        } else {
                            const lines = data.reservations.map(r => `• ${r.table_id} – ${r.date} ${r.time}`);
                            addMessage("Rezervacijos", `👤 Prisijungęs kaip: ${data.username}<br>${lines.join("<br>")}`, false);
                        }
                    }

                    else if (act.action === "get_my_reservations") {
                        const res = await fetch("/my-reservations");
                        const data = await res.json();

                        if (data.reservations.length === 0) {
                            addMessage("Sistema", `🔍 Neturi jokių rezervacijų, ${data.username}.`, false);
                        } else {
                            const list = data.reservations.map(r => `🪑 ${r.table_id} ${r.date} ${r.time}`).join("<br>");
                            addMessage("Tavo rezervacijos", list, false);
                        }
                    }



                    else if (act.action === "check_tables") {
                        if (!act.date || !act.time) {
                            addMessage("Sistema", "❗ Prašau nurodyti datą ir laiką.", false);
                            return;
                        }

                        const url = `/available-tables?reservation_date=${encodeURIComponent(act.date)}&reservation_time=${encodeURIComponent(act.time)}`;
                        const res = await fetch(url);
                        const data = await res.json();

                        const available = data.available_tables;

                        if (!available || available.length === 0) {
                            addMessage("Sistema", "Šiuo metu visi staliukai yra užimti.", false);
                        } else {
                            addMessage("Sistema", `🪑 Laisvi staliukai: ${available.join(", ")}. Kurį norėtumėte rezervuoti?`, false);
                        }
                    }

                    else if (act.action === "cancel_reservation") {
                        const res = await fetch("/cancel-reservation", {
                            method: "POST"
                        });
                        const data = await res.json();
                        addMessage("Sistema", data.message || "Atsakymo nėra.", false);

                        
                        if (data.available_tables) {
                            addMessage("Sistema", `🪑 Dabar laisvi: ${data.available_tables.join(", ")}`, false);
                        }
                    }



                }
                return;
            }

            addMessage("Padavėjas DI", rawText || "🤖 Atsiprašau, negaliu atsakyti.", false);

        } catch (e) {
            console.error("💥 Klaida:", e);
            removeTyping();
            addMessage("Padavėjas DI", "⚠️ Klaida jungiantis prie serverio.", false);
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
        if (chatWidget.classList.contains("active")) {
            playChatSound();
        }
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

    updateCartCount();

    chatWidget.classList.add("active");

    function playChatSound() {
        const audio = new Audio("/static/sounds/relax-message-tone.mp3");
        audio.play().catch(e => console.warn("🎵 Nepavyko paleisti garso:", e));
    }

    function getUsernameFromCookie() {
        const match = document.cookie.match(/username=([^;]+)/);
        return match ? match[1] : "";
    }


    if (!sessionStorage.getItem("ai-greeted")) {
        sessionStorage.setItem("ai-greeted", "true");

        setTimeout(() => {
            const greeting = "Sveiki atvykę į RestoranasAI! Aš esu jūsų padavėjas dirbtinis intelektas. Ar galiu padėti išsirinkti vakarienę?";
            addMessage("Padavėjas DI", greeting, false);
            speak(greeting);
        }, 800);

        setTimeout(() => {
            const followUp = "Beje, šiandien siūlome Margaritą, Latte kavą ir spurgą. Jei norėsite – sakykit!";
            addMessage("Padavėjas DI", followUp, false);
        }, 30000);
    }
});