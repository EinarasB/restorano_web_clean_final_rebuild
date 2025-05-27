document.addEventListener("DOMContentLoaded", function () {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const cartItemsContainer = document.getElementById("cart-items");
    const hiddenInput = document.getElementById("order-data");
    const form = document.querySelector("form");
    const modal = document.getElementById("customize-modal");
    const optionsContainer = document.getElementById("ingredient-checkboxes");
    const cancelBtn = document.getElementById("cancel-customize");
    const customizeForm = document.getElementById("customize-form");
    let currentEditIndex = null;

    if (!cartItemsContainer || !form || !modal || !optionsContainer || !cancelBtn || !customizeForm) {
        console.error("Vienas ar daugiau DOM elementų nerasti. Patikrink HTML struktūrą.");
        return;
    }

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

    const ingredientCases = {
        "Pomidorai": "pomidorų",
        "Mocarela": "mocarelos",
        "Bazilikas": "baziliko",
        "Jautiena": "jautienos",
        "Sūris": "sūrio",
        "Padažas": "padažo",
        "Salotos": "salotų",
        "Vištiena": "vištienos",
        "Morkos": "morkų",
        "Selerijos": "selerijų",
        "Makaronai": "makaronų",
        "Parmezanas": "parmezano",
        "Krutonai": "krutonų",
        "Bulvės": "bulvių",
        "Miltai": "miltų",
        "Šokoladas": "šokolado",
        "Saldainiukai": "saldainiukų",
        "Medus": "medaus",
        "Mėlynės": "mėlynių",
        "Espresso": "espreso",
        "Pienas": "pieno",
        "Cukrus": "cukraus",
        "Kofeinas": "kofeino",
        "Burbuliukai": "burbuliukų",
        "Žalioji arbata": "žaliosios arbatos"
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
            const ingredients = ingredientsMap[item.name] || [];
            optionsContainer.innerHTML = "";

            ingredients.forEach(ingr => {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = ingr;
                checkbox.id = ingr;
                checkbox.name = "ingredient";
                checkbox.checked = !(item.customizations || []).includes(`Be ${ingredientCases[ingr] || ingr.toLowerCase()}`);

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

        localStorage.setItem("cart", JSON.stringify(cart));
        renderCart();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        localStorage.removeItem("cart");
        cart = [];
        renderCart();
        alert("Užsakymas pateiktas!");
    });

    customizeForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const checked = document.querySelectorAll('#ingredient-checkboxes input:not(:checked)');
        const removed = Array.from(checked).map(cb => {
            const ingr = cb.value;
            const form = ingredientCases[ingr] || ingr.toLowerCase();
            return `Be ${form}`;
        });
        cart[currentEditIndex].customizations = removed.length > 0 ? removed : null;
        localStorage.setItem("cart", JSON.stringify(cart));
        modal.style.display = "none";
        renderCart();
    });

    cancelBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    renderCart();
    generateRecommendations();
});
