document.addEventListener("DOMContentLoaded", function () {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const cartItemsContainer = document.getElementById("cart-items");
    const hiddenInput = document.getElementById("order-data");

    function updateCartDisplay() {
        cartItemsContainer.innerHTML = "";

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = "<p>Krepšelis tuščias.</p>";
            hiddenInput.value = "";
            return;
        }

        cart.forEach((item, index) => {
            const card = document.createElement("div");
            card.className = "cart-item-card";

            card.innerHTML = `
                <div class="cart-info">
                    <h3>${item.name}</h3>
                    <p>Kaina: €${item.price.toFixed(2)}</p>
                    <div class="quantity">
                        <button class="decrease">−</button>
                        <span>${item.quantity}</span>
                        <button class="increase">+</button>
                        <button class="remove">🗑️</button>
                    </div>
                    <strong>Iš viso: €${(item.price * item.quantity).toFixed(2)}</strong>
                </div>
            `;

            // Mygtukų funkcionalumas
            card.querySelector(".increase").addEventListener("click", () => {
                cart[index].quantity++;
                saveAndRender();
            });

            card.querySelector(".decrease").addEventListener("click", () => {
                if (cart[index].quantity > 1) {
                    cart[index].quantity--;
                } else {
                    cart.splice(index, 1);
                }
                saveAndRender();
            });

            card.querySelector(".remove").addEventListener("click", () => {
                cart.splice(index, 1);
                saveAndRender();
            });

            cartItemsContainer.appendChild(card);
        });

        hiddenInput.value = JSON.stringify(cart);
    }

    function saveAndRender() {
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartDisplay();
    }

    updateCartDisplay();

    // Grįžus išvalom krepšelį
    const backBtn = document.querySelector(".btn[href='/menu']");
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            localStorage.removeItem("cart");
        });
    }
});
