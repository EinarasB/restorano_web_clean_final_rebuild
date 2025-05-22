document.addEventListener("DOMContentLoaded", function () {
    const tableButtons = document.querySelectorAll(".table-btn");
    const modal = document.getElementById("modal");
    const modalTable = document.getElementById("modal-table");
    const confirmBtn = document.getElementById("confirm-reserve");
    const cancelBtn = document.getElementById("cancel-reserve");
    const form = document.getElementById("reservation-form");
    const tableInput = document.getElementById("selected-table");

    
    const dateInput = document.getElementById("reservation-date");
    const timeInput = document.getElementById("reservation-time");
    const hiddenDateInput = document.getElementById("reservation-date-hidden");
    const hiddenTimeInput = document.getElementById("reservation-time-hidden");

    let selectedTable = "";

    tableButtons.forEach(button => {
        button.addEventListener("click", () => {
            selectedTable = button.dataset.table;
            modalTable.textContent = selectedTable;
            modal.style.display = "flex";
        });
    });

    confirmBtn.addEventListener("click", () => {
        const selectedDate = dateInput.value;
        const selectedTime = timeInput.value;

        if (!selectedDate || !selectedTime) {
            alert("Pasirinkite datą ir laiką");
            return;
        }

        
        tableInput.value = selectedTable;
        hiddenDateInput.value = selectedDate;
        hiddenTimeInput.value = selectedTime;

        form.submit();
    });

    cancelBtn.addEventListener("click", () => {
        modal.style.display = "none";
        selectedTable = "";
    });
});
