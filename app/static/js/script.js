document.addEventListener("DOMContentLoaded", function () {
    let count = 0;
    const cartCount = document.getElementById("cart-count");
    const buttons = document.querySelectorAll(".add-to-cart");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            count++;
            cartCount.textContent = count;
        });
    });
});
