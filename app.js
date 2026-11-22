"use strict";

const XML_URL = "employees.xml";

const columns = [
    { tag: "id", label: "ID", numeric: true },
    { tag: "name", label: "Name" },
    { tag: "department", label: "Department" },
    { tag: "designation", label: "Designation" },
    { tag: "email", label: "Email" },
    { tag: "phone", label: "Phone" },
    { tag: "city", label: "City" },
    { tag: "joiningDate", label: "Joining Date", format: formatDate },
    { tag: "salary", label: "Salary (INR)", numeric: true, format: formatMoney }
];

const state = {
    rows: [],
    sortTag: "id",
    sortDir: 1
};

const els = {
    thead: document.querySelector("#empTable thead"),
    tbody: document.querySelector("#empTable tbody"),
    search: document.getElementById("search"),
    dept: document.getElementById("deptFilter"),
    file: document.getElementById("fileInput"),
    status: document.getElementById("status"),
    count: document.getElementById("count")
};

function formatMoney(value) {
    const number = Number(value);
    return Number.isNaN(number) ? value : number.toLocaleString("en-IN");
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function parseXML(text) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");

    if (xml.getElementsByTagName("parsererror").length) {
        throw new Error("Invalid XML file.");
    }

    const employees = xml.getElementsByTagName("employee");

    if (!employees.length) {
        throw new Error("No employee records found.");
    }

    return Array.from(employees, employee => {
        const row = {};

        columns.forEach(column => {
            const element = employee.getElementsByTagName(column.tag)[0];
            row[column.tag] = element ? element.textContent.trim() : "";
        });

        return row;
    });
}

function setStatus(message, type = "") {
    els.status.textContent = message;
    els.status.className = "status " + type;
}

function loadXML(text) {
    try {
        state.rows = parseXML(text);
        fillDepartments();
        render();
        setStatus("Employee data loaded successfully.", "success");
    } catch (error) {
        state.rows = [];
        fillDepartments();
        render();
        setStatus(error.message, "error");
    }
}

function buildHeader() {
    const tr = document.createElement("tr");

    columns.forEach(column => {
        const th = document.createElement("th");
        th.textContent = column.label;

        const arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.textContent = state.sortTag === column.tag
            ? (state.sortDir === 1 ? "▲" : "▼")
            : "";

        th.appendChild(arrow);

        th.addEventListener("click", () => {
            if (state.sortTag === column.tag) {
                state.sortDir *= -1;
            } else {
                state.sortTag = column.tag;
                state.sortDir = 1;
            }
            render();
        });

        tr.appendChild(th);
    });

    els.thead.replaceChildren(tr);
}

function visibleRows() {
    const query = els.search.value.trim().toLowerCase();
    const department = els.dept.value;
    const column = columns.find(item => item.tag === state.sortTag);

    const rows = state.rows.filter(row => {
        if (department && row.department !== department) return false;
        if (!query) return true;

        return columns.some(item =>
            row[item.tag].toLowerCase().includes(query)
        );
    });

    rows.sort((a, b) => {
        const x = a[state.sortTag];
        const y = b[state.sortTag];

        if (column.numeric) {
            return (Number(x) - Number(y)) * state.sortDir;
        }

        return x.localeCompare(y, undefined, {
            sensitivity: "base"
        }) * state.sortDir;
    });

    return rows;
}

function render() {
    buildHeader();

    const rows = visibleRows();
    els.tbody.replaceChildren();

    if (rows.length === 0) {
        const tr = document.createElement("tr");
        tr.className = "empty-row";

        const td = document.createElement("td");
        td.colSpan = columns.length;
        td.textContent = state.rows.length
            ? "No employees match your search."
            : "No data to display.";

        tr.appendChild(td);
        els.tbody.appendChild(tr);
    } else {
        rows.forEach(row => {
            const tr = document.createElement("tr");

            columns.forEach(column => {
                const td = document.createElement("td");

                if (column.numeric) td.className = "num";

                td.textContent = column.format
                    ? column.format(row[column.tag])
                    : row[column.tag];

                tr.appendChild(td);
            });

            els.tbody.appendChild(tr);
        });
    }

    els.count.textContent =
        `Showing ${rows.length} of ${state.rows.length} employees`;
}

function fillDepartments() {
    const current = els.dept.value;

    const departments = [...new Set(
        state.rows.map(row => row.department).filter(Boolean)
    )].sort();

    els.dept.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All Departments";
    els.dept.appendChild(allOption);

    departments.forEach(department => {
        const option = document.createElement("option");
        option.value = department;
        option.textContent = department;
        els.dept.appendChild(option);
    });

    els.dept.value = departments.includes(current) ? current : "";
}

els.search.addEventListener("input", render);
els.dept.addEventListener("change", render);

els.file.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => loadXML(String(reader.result));
    reader.onerror = () => setStatus("Could not read the XML file.", "error");

    reader.readAsText(file);
    this.value = "";
});

setStatus("Loading employee data...");

fetch(XML_URL)
    .then(response => {
        if (!response.ok) {
            throw new Error("Unable to load employees.xml. Run the site with Live Server.");
        }
        return response.text();
    })
    .then(loadXML)
    .catch(error => setStatus(error.message, "error"));
