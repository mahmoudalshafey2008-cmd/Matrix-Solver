const varCountInput = document.getElementById("varCount");
const methodSelect = document.getElementById("methodSelect");
const matrixGrid = document.getElementById("matrixGrid");
const solveBtn = document.getElementById("solveBtn");
const sampleBtn = document.getElementById("sampleBtn");
const clearBtn = document.getElementById("clearBtn");
const errorBox = document.getElementById("errorBox");
const resultsSection = document.getElementById("resultsSection");
const resultsContainer = document.getElementById("resultsContainer");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const HISTORY_KEY = "matrix_solver_history_v1";

function buildGrid(n, preset = null) {
    matrixGrid.innerHTML = "";
    // n coefficient columns + 1 divider + 1 constant column
    matrixGrid.style.gridTemplateColumns = `repeat(${n}, auto) auto auto`;

    // Header row
    for (let col = 0; col < n; col++) {
        const header = document.createElement("div");
        header.className = "grid-header";
        header.textContent = `x${col + 1}`;
        matrixGrid.appendChild(header);
    }
    const spacer = document.createElement("div");
    matrixGrid.appendChild(spacer);

    const constHeader = document.createElement("div");
    constHeader.className = "grid-header";
    constHeader.textContent = "b";
    matrixGrid.appendChild(constHeader);

    // Input rows
    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n + 1; col++) {
            if (col === n) {
                const divider = document.createElement("div");
                divider.className = "divider";
                matrixGrid.appendChild(divider);
            }
            const input = document.createElement("input");
            input.type = "text";
            input.className = "matrix-cell";
            input.placeholder = "0";
            input.dataset.row = row;
            input.dataset.col = col;
            if (preset && preset[row] && preset[row][col] !== undefined) {
                input.value = preset[row][col];
            }
            matrixGrid.appendChild(input);
        }
    }
}

function readMatrixFromGrid() {
    const n = parseInt(varCountInput.value, 10);
    const matrix = [];
    for (let r = 0; r < n; r++) {
        const row = [];
        for (let c = 0; c < n + 1; c++) {
            const cell = matrixGrid.querySelector(
                `input[data-row="${r}"][data-col="${c}"]`
            );
            const val = cell.value.trim();
            row.push(val === "" ? "0" : val);
        }
        matrix.push(row);
    }
    return matrix;
}

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
}

function hideError() {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
}

async function callSolveApi(matrix, method) {
    const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix, method }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || "Failed to solve matrix.");
    }
    return data;
}

function renderMethodResult(title, data) {
    const block = document.createElement("div");
    block.className = "method-block";

    const heading = document.createElement("h3");
    heading.textContent = title;
    block.appendChild(heading);

    const banner = document.createElement("div");
    banner.className = "solution-banner";

    if (data.outcome === "unique") {
        banner.innerHTML = `<div>Unique Solution:</div>`;
        const valuesDiv = document.createElement("div");
        valuesDiv.className = "solution-values";
        data.solution.forEach((val, idx) => {
            const pill = document.createElement("span");
            pill.className = "sol-pill";
            pill.textContent = `x${idx + 1} = ${val}`;
            valuesDiv.appendChild(pill);
        });
        banner.appendChild(valuesDiv);
    } else if (data.outcome === "none") {
        banner.textContent = "Outcome: No Solution (Inconsistent System)";
    } else if (data.outcome === "infinite") {
        banner.textContent = "Outcome: Infinitely Many Solutions";
    }

    block.appendChild(banner);

    data.steps.forEach((stepText, idx) => {
        const stepCard = document.createElement("div");
        stepCard.className = "step-card";

        const stepTitle = document.createElement("div");
        stepTitle.className = "step-title";
        stepTitle.textContent = `Step ${idx + 1}`;

        const pre = document.createElement("pre");
        pre.textContent = stepText;

        stepCard.appendChild(stepTitle);
        stepCard.appendChild(pre);
        block.appendChild(stepCard);
    });

    resultsContainer.appendChild(block);
}

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
        return [];
    }
}

function saveToHistory(entry) {
    const history = loadHistory();
    history.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 15)));
    renderHistory();
}

function renderHistory() {
    const history = loadHistory();
    historyList.innerHTML = "";
    if (history.length === 0) {
        historyList.innerHTML = `<li class="hint">No solved matrices yet.</li>`;
        return;
    }
    history.forEach((item) => {
        const li = document.createElement("li");
        li.className = "history-item";
        li.innerHTML = `
      <div class="history-meta">${item.n}×${item.n} (${item.method.toUpperCase()})</div>
      <div>${item.summary}</div>
    `;
        li.addEventListener("click", () => {
            varCountInput.value = item.n;
            methodSelect.value = item.method;
            buildGrid(item.n, item.matrix);
        });
        historyList.appendChild(li);
    });
}

solveBtn.addEventListener("click", async () => {
    hideError();
    resultsContainer.innerHTML = "";
    resultsSection.classList.add("hidden");

    const n = parseInt(varCountInput.value, 10);
    if (isNaN(n) || n < 1 || n > 10) {
        showError("Number of variables must be between 1 and 10.");
        return;
    }

    const matrix = readMatrixFromGrid();
    const method = methodSelect.value;

    solveBtn.disabled = true;
    solveBtn.textContent = "Solving...";

    try {
        let summary = "";
        if (method === "gauss" || method === "both") {
            const gaussData = await callSolveApi(matrix, "gauss");
            renderMethodResult("Gaussian Elimination", gaussData);
            summary =
                gaussData.outcome === "unique"
                    ? gaussData.solution.map((v, i) => `x${i + 1}=${v}`).join(", ")
                    : gaussData.outcome;
        }
        if (method === "jordan" || method === "both") {
            const jordanData = await callSolveApi(matrix, "jordan");
            renderMethodResult("Gauss-Jordan Elimination", jordanData);
            if (!summary) {
                summary =
                    jordanData.outcome === "unique"
                        ? jordanData.solution.map((v, i) => `x${i + 1}=${v}`).join(", ")
                        : jordanData.outcome;
            }
        }

        resultsSection.classList.remove("hidden");
        saveToHistory({ n, method, matrix, summary });
    } catch (err) {
        showError(err.message);
    } finally {
        solveBtn.disabled = false;
        solveBtn.textContent = "Solve System";
    }
});

varCountInput.addEventListener("change", () => {
    const n = Math.min(10, Math.max(1, parseInt(varCountInput.value, 10) || 1));
    varCountInput.value = n;
    buildGrid(n);
});

sampleBtn.addEventListener("click", () => {
    varCountInput.value = 3;
    buildGrid(3, [
        ["2", "1", "-1", "8"],
        ["-3", "-1", "2", "-11"],
        ["-2", "1", "2", "-3"],
    ]);
    hideError();
});

clearBtn.addEventListener("click", () => {
    const n = parseInt(varCountInput.value, 10) || 3;
    buildGrid(n);
    hideError();
    resultsSection.classList.add("hidden");
});

clearHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
});

matrixGrid.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    const inputs = Array.from(matrixGrid.querySelectorAll("input.matrix-cell"));
    const currentIndex = inputs.indexOf(event.target);

    if (currentIndex === -1) return;

    event.preventDefault();

    if (currentIndex < inputs.length - 1) {
        inputs[currentIndex + 1].focus();
        inputs[currentIndex + 1].select();
    } else {
        solveBtn.click();
    }
});

// Initialize default 3x3 grid and history
buildGrid(3);
renderHistory();