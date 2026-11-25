const eqCountInput = document.getElementById("eqCount");
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

function buildGrid(rows, cols, preset = null) {
    matrixGrid.innerHTML = "";
    // Define CSS grid columns: `cols` variable inputs + 1 vertical divider + 1 constant column
    matrixGrid.style.gridTemplateColumns = `repeat(${cols}, auto) auto auto`;

    // Render column headers x1, x2, ..., x_cols
    for (let c = 0; c < cols; c++) {
        const header = document.createElement("div");
        header.className = "grid-header";
        header.textContent = `x${c + 1}`;
        matrixGrid.appendChild(header);
    }
    // Empty header cell above the vertical divider line
    matrixGrid.appendChild(document.createElement("div"));

    // Header cell for the constants column (b)
    const constHeader = document.createElement("div");
    constHeader.className = "grid-header";
    constHeader.textContent = "b";
    matrixGrid.appendChild(constHeader);

    // Build `rows` equation rows, each having `cols + 1` input cells
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols + 1; c++) {
            // Insert the vertical augmented-matrix divider right before the last column (b)
            if (c === cols) {
                const divider = document.createElement("div");
                divider.className = "divider";
                matrixGrid.appendChild(divider);
            }
            const input = document.createElement("input");
            input.type = "text";
            input.className = "matrix-cell";
            input.placeholder = "0";
            // Store row and column coordinates on each input for easy lookup later
            input.dataset.row = r;
            input.dataset.col = c;
            // Pre-fill value if restoring from history or loading an example
            if (preset && preset[r] && preset[r][c] !== undefined) {
                input.value = preset[r][c];
            }
            matrixGrid.appendChild(input);
        }
    }
}

// Reads a rectangular (rows x (cols + 1)) 2D array of strings from the DOM grid
function readMatrixFromGrid(rows, cols) {
    const matrix = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        // Loop through all variable columns plus the constant column
        for (let c = 0; c < cols + 1; c++) {
            const cell = matrixGrid.querySelector(
                `input[data-row="${r}"][data-col="${c}"]`
            );
            const val = cell.value.trim();
            // Default blank inputs to "0" so the Python Fraction parser receives valid numbers
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

async function callSolveApi(matrix, method, numVars) {
    const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix, method, num_vars: numVars }),
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
        const rows = item.rows ?? item.n ?? 2;
        const cols = item.cols ?? item.n ?? 3;
        const li = document.createElement("li");
        li.className = "history-item";
        li.innerHTML = `
            <div class="history-meta">${rows}×${cols + 1} (${item.method.toUpperCase()})</div>
            <div>${item.summary}</div>
        `;
        li.addEventListener("click", () => {
            eqCountInput.value = rows;
            varCountInput.value = cols;
            methodSelect.value = item.method;
            buildGrid(rows, cols, item.matrix);
        });
        historyList.appendChild(li);
    });
}

function handleDimensionChange() {
    const rows = Math.min(10, Math.max(1, parseInt(eqCountInput.value, 10) || 1));
    const cols = Math.min(10, Math.max(1, parseInt(varCountInput.value, 10) || 1));
    eqCountInput.value = rows;
    varCountInput.value = cols;
    buildGrid(rows, cols);
}

solveBtn.addEventListener("click", async () => {
    hideError();
    resultsContainer.innerHTML = "";
    resultsSection.classList.add("hidden");

    const rows = parseInt(eqCountInput.value, 10);
    const cols = parseInt(varCountInput.value, 10);
    if (isNaN(rows) || rows < 1 || rows > 10 || isNaN(cols) || cols < 1 || cols > 10) {
        showError("Equations and variables must each be between 1 and 10.");
        return;
    }

    const matrix = readMatrixFromGrid(rows, cols);
    const method = methodSelect.value;

    solveBtn.disabled = true;
    solveBtn.textContent = "Solving...";

    try {
        let summary = "";
        if (method === "gauss" || method === "both") {
            const gaussData = await callSolveApi(matrix, "gauss", cols);
            renderMethodResult("Gaussian Elimination", gaussData);
            summary =
                gaussData.outcome === "unique"
                    ? gaussData.solution.map((v, i) => `x${i + 1}=${v}`).join(", ")
                    : gaussData.outcome;
        }
        if (method === "jordan" || method === "both") {
            const jordanData = await callSolveApi(matrix, "jordan", cols);
            renderMethodResult("Gauss-Jordan Elimination", jordanData);
            if (!summary) {
                summary =
                    jordanData.outcome === "unique"
                        ? jordanData.solution.map((v, i) => `x${i + 1}=${v}`).join(", ")
                        : jordanData.outcome;
            }
        }

        resultsSection.classList.remove("hidden");
        saveToHistory({ rows, cols, method, matrix, summary });
    } catch (err) {
        showError(err.message);
    } finally {
        solveBtn.disabled = false;
        solveBtn.textContent = "Solve System";
    }
});

eqCountInput.addEventListener("change", handleDimensionChange);
varCountInput.addEventListener("change", handleDimensionChange);

sampleBtn.addEventListener("click", () => {
    eqCountInput.value = 2;
    varCountInput.value = 3;
    buildGrid(2, 3, [
        ["1", "2", "1", "4"],
        ["0", "1", "-1", "2"],
    ]);
    hideError();
});

clearBtn.addEventListener("click", () => {
    const rows = parseInt(eqCountInput.value, 10) || 2;
    const cols = parseInt(varCountInput.value, 10) || 3;
    buildGrid(rows, cols);
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

// Initialize default 2 equations x 3 variables grid and history
buildGrid(2, 3);
renderHistory();