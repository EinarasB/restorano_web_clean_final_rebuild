﻿document.addEventListener("DOMContentLoaded", function () {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let currentEditIndex = null;
    let isSplitCustomization = false;

    const cartItemsContainer = document.getElementById("cart-items");
    const hiddenInput = document.getElementById("order-data");
    const orderForm = document.querySelector('form[action="/checkout"]');
    const modal = document.getElementById("customize-modal");
    const optionsContainer = document.getElementById("ingredient-checkboxes");
    const cancelBtn = document.getElementById("cancel-customize");
    const customizeForm = document.getElementById("customize-form");

    const decisionModal = document.getElementById("customize-decision");
    const editAllBtn = document.getElementById("edit-all");
    const splitItemBtn = document.getElementById("split-item");

    const imageMap = {
        "Margarita": "pica.jpg",
        "Burgeris": "burger.jpg",
        "Vištienos sriuba": "sriuba.jpg",
        "Makaronai su vištiena": "pasta.jpg",
        "Cezario salotos": "salotos.jpg",
        "Jautienos kepsnys": "kepsnys.jpg",
        "Spurga su šokoladu": "desertas.jpg",
        "Blyneliai": "pankekai.jpg",
        "Latte kava": "kava.jpg",
        "Coca-Cola": "cola.jpg",
        "Žalioji arbata": "arbata.jpg"
    };

    const ingredientsMap = {
        "Margarita": ["Pomidorai", "Mocarela", "Bazilikas"],
        "Burgeris": ["Jautiena", "Sūris", "Padažas", "Salotos"],
        "Vištienos sriuba": ["Vištiena", "Morkos", "Selerijos"],
        "Makaronai su vištiena": ["Makaronai", "Vištiena", "Sūris", "Padažas"],
        "Cezario salotos": ["Vištiena", "Salotos", "Parmezanas", "Krutonai"],
        "Jautienos kepsnys": ["Jautiena", "Bulvės", "Padažas"],
        "Spurga su šokoladu": ["Miltai", "Šokoladas", "Saldainiukai"],
        "Blyneliai": ["Miltai", "Medus", "Mėlynės"],
        "Latte kava": ["Espresso", "Pienas"],
        "Coca-Cola": ["Cukrus", "Kofeinas", "Burbuliukai"],
        "Žalioji arbata": ["Žalioji arbata"]
    };

    function renderCart() {
        cartItemsContainer.innerHTML = "";
        let total = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = "<p>Krepšelis tuščias.</p>";
            return;
        }

        cart.forEach((item, index) => {
            const lineTotal = item.quantity * item.price;
            total += lineTotal;

            const imageFile = imageMap[item.name] || "default.jpg";

            const card = document.createElement("div");
            card.className = "checkout-card";

            card.innerHTML = `
                <div class="checkout-card-content">
                    <img src="/static/images/${imageFile}" alt="${item.name}" class="checkout-img">
                    <div class="checkout-info">
                        <h3>${item.name}</h3>
                        <p>Kiekis: ${item.quantity} &nbsp; | &nbsp; Kaina: €${item.price.toFixed(2)}</p>
                        <p><strong>€${lineTotal.toFixed(2)}</strong></p>
                        ${item.customizations ? `<p><em>Pašalinti ingredientai: ${item.customizations.join(", ")}</em></p>` : ""}
                        <div class="checkout-buttons">
                            <button class="quantity-btn" data-index="${index}" data-action="decrease">➖</button>
                            <button class="quantity-btn" data-index="${index}" data-action="increase">➕</button>
                            <button class="remove-btn" data-index="${index}">❌ Pašalinti</button>
                            <button class="customize-btn" data-index="${index}">Sudėtis</button>
                        </div>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(card);
        });

        const totalElement = document.createElement("p");
        totalElement.innerHTML = `<strong>Viso: €${total.toFixed(2)}</strong>`;
        totalElement.classList.add("total-price");
        cartItemsContainer.appendChild(totalElement);

        hiddenInput.value = JSON.stringify(cart);
        localStorage.setItem("cart", JSON.stringify(cart));
    }

    cartItemsContainer.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        if (e.target.classList.contains("quantity-btn")) {
            const action = e.target.dataset.action;
            if (action === "increase") {
                cart[index].quantity += 1;
            } else if (action === "decrease") {
                cart[index].quantity -= 1;
                if (cart[index].quantity <= 0) cart.splice(index, 1);
            }
        } else if (e.target.classList.contains("remove-btn")) {
            cart.splice(index, 1);
        } else if (e.target.classList.contains("customize-btn")) {
            currentEditIndex = index;
            const item = cart[index];

            if (item.quantity > 1) {
                decisionModal.style.display = "flex";

                editAllBtn.onclick = () => {
                    isSplitCustomization = false;
                    decisionModal.style.display = "none";
                    openCustomizeModal(item);
                };

                splitItemBtn.onclick = () => {
                    isSplitCustomization = true;
                    decisionModal.style.display = "none";
                    openCustomizeModal(item);
                };
            } else {
                isSplitCustomization = false;
                openCustomizeModal(item);
            }
        }

        renderCart();
    });

    orderForm.addEventListener("submit", () => {
        localStorage.removeItem("cart");
    });

    customizeForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const checked = document.querySelectorAll('#ingredient-checkboxes input:not(:checked)');
        const removed = Array.from(checked).map(cb => cb.value);

        if (isSplitCustomization) {
            const original = cart[currentEditIndex];
            original.quantity -= 1;
            const newItem = {
                name: original.name,
                quantity: 1,
                price: original.price,
                customizations: removed.length > 0 ? removed : null
            };
            cart.splice(currentEditIndex + 1, 0, newItem);
        } else {
            cart[currentEditIndex].customizations = removed.length > 0 ? removed : null;
        }

        modal.style.display = "none";
        renderCart();
    });

    cancelBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    function openCustomizeModal(item) {
        const ingredients = ingredientsMap[item.name] || [];
        optionsContainer.innerHTML = "";

        ingredients.forEach(ingr => {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = ingr;
            checkbox.id = ingr;
            checkbox.name = "ingredient";
            checkbox.checked = !(item.customizations || []).includes(ingr);

            const label = document.createElement("label");
            label.htmlFor = ingr;
            label.textContent = ingr;

            const wrapper = document.createElement("div");
            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            optionsContainer.appendChild(wrapper);
        });

        modal.style.display = "flex";
    }

    function generateRecommendations() {
        const allDishes = [
            { name: "Kava", price: 2.49, image: "kava.jpg" },
            { name: "Spurga su šokoladu", price: 5.49, image: "desertas.jpg" },
            { name: "Cezario salotos", price: 6.49, image: "salotos.jpg" },
            { name: "Makaronai su vištiena", price: 9.49, image: "pasta.jpg" },
            { name: "Blyneliai", price: 4.99, image: "pankekai.jpg" },
            { name: "Jautienos kepsnys", price: 13.99, image: "kepsnys.jpg" },
            { name: "Latte kava", price: 2.49, image: "kava.jpg" },
            { name: "Vištienos sriuba", price: 4.99, image: "sriuba.jpg" },
            { name: "Margarita", price: 7.99, image: "pica.jpg" },
            { name: "Burgeris", price: 8.49, image: "burger.jpg" },
            { name: "Coca-Cola", price: 1.99, image: "cola.jpg" },
            { name: "Žalioji arbata", price: 1.49, image: "arbata.jpg" }
        ];

        const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
        const cartNames = cartItems.map(item => item.name);
        const recWrapper = document.getElementById("recommendations");
        if (!recWrapper) return;

        recWrapper.innerHTML = "";

        const suggestions = allDishes.filter(d => !cartNames.includes(d.name)).slice(0, 3);

        suggestions.forEach(item => {
            const card = document.createElement("div");
            card.className = "menu-card";
            card.innerHTML = `
                <img src="/static/images/${item.image}" alt="${item.name}">
                <div class="menu-info">
                    <h3>${item.name}</h3>
                    <span class="price">€${item.price.toFixed(2)}</span>
                    <button class="add-to-cart" data-name="${item.name}" data-price="${item.price}">Į krepšelį</button>
                </div>
            `;
            recWrapper.appendChild(card);
        });

        recWrapper.addEventListener("click", function (e) {
            if (e.target.classList.contains("add-to-cart")) {
                const name = e.target.dataset.name;
                const price = parseFloat(e.target.dataset.price);
                const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
                const existing = cartItems.find(i => i.name === name);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    cartItems.push({ name, price, quantity: 1 });
                }
                localStorage.setItem("cart", JSON.stringify(cartItems));
                location.reload();
            }
        });
    }

    renderCart();
    generateRecommendations();
});
