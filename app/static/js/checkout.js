document.addEventListener("DOMContentLoaded", function () {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const cartItemsContainer = document.getElementById("cart-items");
    const hiddenInput = document.getElementById("order-data");
    const form = document.querySelector("form");

    const renderCart = () => {
        cartItemsContainer.innerHTML = "";
        let total = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = "<p>Krepšelis tuščias.</p>";
            return;
        }

        cart.forEach((item, index) => {
            const lineTotal = item.quantity * item.price;
            total += lineTotal;

            const card = document.createElement("div");
            card.className = "checkout-card";

            card.innerHTML = `
                <div class="checkout-card-content">
                    <img src="/static/images/${item.name.toLowerCase().replaceAll(" ", "")}.jpg" alt="${item.name}">
                    <div class="checkout-info">
                        <h3>${item.name}</h3>
                        <p>Kiekis: ${item.quantity} &nbsp; | &nbsp; Kaina: €${item.price.toFixed(2)}</p>
                        <p><strong>€${lineTotal.toFixed(2)}</strong></p>
                        <div class="checkout-buttons">
                            <button class="quantity-btn" data-index="${index}" data-action="decrease">➖</button>
                            <button class="quantity-btn" data-index="${index}" data-action="increase">➕</button>
                            <button class="remove-btn" data-index="${index}">❌ Pašalinti</button>
                        </div>
                    </div>
                </div>
            `;

            cartItemsContainer.appendChild(card);
        });

        const totalElement = document.createElement("p");
        totalElement.innerHTML = `<strong>Viso: €${total.toFixed(2)}</strong>`;
        totalElement.style.fontSize = "18px";
        totalElement.style.marginTop = "20px";
        cartItemsContainer.appendChild(totalElement);

        hiddenInput.value = JSON.stringify(cart);
    };

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
        }
        localStorage.setItem("cart", JSON.stringify(cart));
        renderCart();
    });

    form.addEventListener("submit", () => {
        localStorage.removeItem("cart");
    });

    renderCart();
});
