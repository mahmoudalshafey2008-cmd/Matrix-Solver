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
    matrixGrid.className = "input-matrix-container";

    const gridTemplate = `repeat(${cols}, 72px) 6px 72px`;

    // 1. Column headers row (outside the top of the brackets)
    const headerRow = document.createElement("div");
    headerRow.className = "input-headers-row";
    headerRow.style.gridTemplateColumns = gridTemplate;

    for (let c = 0; c < cols; c++) {
        const header = document.createElement("div");
        header.className = "grid-header";
        header.textContent = `x${c + 1}`;
        headerRow.appendChild(header);
    }
    // Spacer above the augmented divider
    headerRow.appendChild(document.createElement("div"));

    const constHeader = document.createElement("div");
    constHeader.className = "grid-header";
    constHeader.textContent = "b";
    headerRow.appendChild(constHeader);
    matrixGrid.appendChild(headerRow);

    // 2. Bracketed input cells container: [  cells | b  ]
    const bracketBody = document.createElement("div");
    bracketBody.className = "input-bracket-body";

    const cellsGrid = document.createElement("div");
    cellsGrid.className = "input-cells-grid";
    cellsGrid.style.gridTemplateColumns = gridTemplate;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols + 1; c++) {
            if (c === cols) {
                const divider = document.createElement("div");
                divider.className = "divider";
                cellsGrid.appendChild(divider);
            }
            const input = document.createElement("input");
            input.type = "text";
            input.className = "matrix-cell";
            input.placeholder = "0";
            input.dataset.row = r;
            input.dataset.col = c;
            if (preset && preset[r] && preset[r][c] !== undefined) {
                input.value = preset[r][c];
            }
            cellsGrid.appendChild(input);
        }
    }

    bracketBody.appendChild(createBracketSvg("left"));
    bracketBody.appendChild(cellsGrid);
    bracketBody.appendChild(createBracketSvg("right"));
    matrixGrid.appendChild(bracketBody);
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

function createBracketSvg(side) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 12 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.classList.add("bracket-svg");

    const path = document.createElementNS(svgNS, "path");
    // Left bracket: top-right -> top-left -> bottom-left -> bottom-right
    // Right bracket: top-left -> top-right -> bottom-right -> bottom-left
    const d =
        side === "left"
            ? "M 11 2 L 2 2 L 2 98 L 11 98"
            : "M 1 2 L 10 2 L 10 98 L 1 98";

    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    path.setAttribute("stroke-linecap", "square");

    svg.appendChild(path);
    return svg;
}

function buildBracketedMatrixElement(matrixLines) {
    const container = document.createElement("div");
    container.className = "bracket-matrix-row";

    const table = document.createElement("table");
    table.className = "matrix-cells-table";

    matrixLines.forEach((rawLine) => {
        const inner = rawLine.slice(1, -1);
        const [coeffsPart, constPart] = inner.split("|");
        const coeffs = coeffsPart.trim().split(/\s+/).filter(Boolean);

        const tr = document.createElement("tr");
        coeffs.forEach((val) => {
            const td = document.createElement("td");
            td.textContent = val;
            tr.appendChild(td);
        });

        if (constPart !== undefined) {
            const tdConst = document.createElement("td");
            tdConst.className = "aug-separator";
            tdConst.textContent = constPart.trim();
            tr.appendChild(tdConst);
        }

        table.appendChild(tr);
    });

    container.appendChild(createBracketSvg("left"));
    container.appendChild(table);
    container.appendChild(createBracketSvg("right"));

    return container;
}

function formatStepContent(stepText) {
    const lines = stepText.split("\n");
    const matrixLines = lines.filter((line) => line.startsWith("[") && line.endsWith("]"));

    if (matrixLines.length === 0) {
        const pre = document.createElement("div");
        pre.className = "math-note-line";
        pre.textContent = stepText;
        return pre;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "math-step-display";

    const opLine = lines.find((line) => !line.startsWith("["));
    if (opLine) {
        const opDiv = document.createElement("div");
        opDiv.className = "math-op-label";
        opDiv.textContent = opLine;
        wrapper.appendChild(opDiv);
    }

    wrapper.appendChild(buildBracketedMatrixElement(matrixLines));
    return wrapper;
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

        stepCard.appendChild(stepTitle);
        stepCard.appendChild(formatStepContent(stepText));
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