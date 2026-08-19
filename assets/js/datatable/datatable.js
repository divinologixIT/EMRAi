(function () {
  "use strict";

  const users = [
    { id: 1, fullName: "System Administrator", username: "superadmin", email: "manager@novastack.com", mobile: "3353213131", userType: "SuperAdmin", verified: true, status: "Active" },
    { id: 2, fullName: "Retina Maity", username: "retina1991m", email: "retina1991m@gmail.com", mobile: "9641630881", userType: "Admin", verified: true, status: "Active" },
    { id: 3, fullName: "Sandeep Gupta", username: "sandeep.gupta", email: "sandeep.gupta@gmail.com", mobile: "9876543210", userType: "Receptionist", verified: true, status: "Active" },
    { id: 4, fullName: "Anita Patel", username: "anita.patel", email: "anita.patel@gmail.com", mobile: "9123456780", userType: "Coordinator", verified: true, status: "Active" },
    { id: 5, fullName: "Vikram Singh", username: "vikram.singh", email: "vikram.singh@gmail.com", mobile: "9988776655", userType: "Front Desk", verified: true, status: "Active" },
    { id: 6, fullName: "Sarah Johnson", username: "sarah.johnson", email: "sarah.johnson@cliniflow.com", mobile: "9988123401", userType: "Receptionist", verified: true, status: "Active" },
    { id: 7, fullName: "Riya Banerjee", username: "riya.banerjee", email: "riya.banerjee@cliniflow.com", mobile: "9830014822", userType: "Front Desk", verified: true, status: "Active" },
    { id: 8, fullName: "Megha Kapoor", username: "megha.kapoor", email: "megha.kapoor@cliniflow.com", mobile: "9811052231", userType: "Coordinator", verified: false, status: "Inactive" },
    { id: 9, fullName: "Arjun Mehta", username: "arjun.mehta", email: "arjun.mehta@cliniflow.com", mobile: "9899017634", userType: "Admin", verified: true, status: "Active" },
    { id: 10, fullName: "Nisha Rao", username: "nisha.rao", email: "nisha.rao@cliniflow.com", mobile: "9845019923", userType: "Receptionist", verified: true, status: "Active" },
    { id: 11, fullName: "Pooja Kapoor", username: "pooja.kapoor", email: "pooja.kapoor@cliniflow.com", mobile: "9873004182", userType: "Front Desk", verified: false, status: "Inactive" },
    { id: 12, fullName: "Amit Sharma", username: "amit.sharma", email: "amit.sharma@cliniflow.com", mobile: "9818035501", userType: "Coordinator", verified: true, status: "Active" }
  ];

  const state = {
    page: 1,
    pageSize: 5,
    query: "",
    sortKey: "fullName",
    sortDirection: "asc",
    selectedIds: new Set(),
    hiddenColumns: new Set()
  };

  const elements = {
    body: document.getElementById("tableBody"),
    summary: document.getElementById("tableSummary"),
    pageButtons: document.getElementById("pageButtons"),
    previous: document.getElementById("previousPage"),
    next: document.getElementById("nextPage"),
    selectAll: document.getElementById("selectAll"),
    search: document.getElementById("searchInput"),
    pageSize: document.getElementById("pageSizeSelect"),
    columnPicker: document.getElementById("columnPicker"),
    columnButton: document.getElementById("columnButton"),
    modal: document.getElementById("userModal"),
    form: document.getElementById("userForm"),
    modalTitle: document.getElementById("modalTitle"),
    modalSubtitle: document.getElementById("modalSubtitle"),
    saveButton: document.getElementById("saveUserButton"),
    toast: document.getElementById("datatableToast")
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character];
    });
  }

  function initials(name) {
    return name.split(/\s+/).map(function (part) { return part[0]; }).join("").slice(0, 2).toUpperCase();
  }

  function visibleUsers() {
    const query = state.query.trim().toLowerCase();
    const filtered = users.filter(function (user) {
      if (!query) return true;
      return [user.fullName, user.username, user.email, user.mobile, user.userType, user.status]
        .some(function (value) { return String(value).toLowerCase().includes(query); });
    });

    return filtered.sort(function (first, second) {
      const firstValue = typeof first[state.sortKey] === "boolean" ? Number(first[state.sortKey]) : String(first[state.sortKey]).toLowerCase();
      const secondValue = typeof second[state.sortKey] === "boolean" ? Number(second[state.sortKey]) : String(second[state.sortKey]).toLowerCase();
      if (firstValue < secondValue) return state.sortDirection === "asc" ? -1 : 1;
      if (firstValue > secondValue) return state.sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  function currentPageUsers(filteredUsers) {
    const start = (state.page - 1) * state.pageSize;
    return filteredUsers.slice(start, start + state.pageSize);
  }

  function rowTemplate(user) {
    const checked = state.selectedIds.has(user.id) ? " checked" : "";
    const statusClass = user.status === "Active" ? "" : " inactive";
    const verifiedClass = user.verified ? "" : " no";
    return `
      <tr data-user-id="${user.id}">
        <td class="select-column"><label class="dt-checkbox"><input class="row-checkbox" type="checkbox" aria-label="Select ${escapeHtml(user.fullName)}"${checked}><span></span></label></td>
        <td data-column="fullName"><div class="user-identity"><span class="user-avatar">${initials(user.fullName)}</span><span class="user-name"><strong>${escapeHtml(user.fullName)}</strong><span class="role-mini">${escapeHtml(user.userType)}</span></span></div></td>
        <td data-column="username">${escapeHtml(user.username)}</td>
        <td data-column="email">${escapeHtml(user.email)}</td>
        <td data-column="mobile">${escapeHtml(user.mobile)}</td>
        <td data-column="userType"><span class="data-pill role">${escapeHtml(user.userType)}</span></td>
        <td data-column="verified"><span class="data-pill${verifiedClass}">${user.verified ? "Yes" : "No"}</span></td>
        <td data-column="status"><span class="data-pill${statusClass}">${escapeHtml(user.status)}</span></td>
        <td data-column="actions"><div class="action-group">
          <button class="action-button" type="button" data-action="view" aria-label="View ${escapeHtml(user.fullName)}"><i data-lucide="eye"></i></button>
          <button class="action-button" type="button" data-action="edit" aria-label="Edit ${escapeHtml(user.fullName)}"><i data-lucide="pencil"></i></button>
          <button class="action-button delete" type="button" data-action="delete" aria-label="Delete ${escapeHtml(user.fullName)}"><i data-lucide="trash-2"></i></button>
        </div></td>
      </tr>`;
  }

  function applyColumnVisibility() {
    document.querySelectorAll("[data-column]").forEach(function (cell) {
      cell.classList.toggle("hidden-column", state.hiddenColumns.has(cell.dataset.column));
    });
  }

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
  }

  function renderPagination(totalPages) {
    elements.pageButtons.innerHTML = "";
    for (let page = 1; page <= totalPages; page += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "page-number" + (page === state.page ? " active" : "");
      button.textContent = page;
      button.setAttribute("aria-label", "Go to page " + page);
      button.setAttribute("aria-current", page === state.page ? "page" : "false");
      button.addEventListener("click", function () { state.page = page; render(); });
      elements.pageButtons.appendChild(button);
    }
    elements.previous.disabled = state.page <= 1;
    elements.next.disabled = state.page >= totalPages;
  }

  function render() {
    const filtered = visibleUsers();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const pageUsers = currentPageUsers(filtered);

    elements.body.innerHTML = pageUsers.length
      ? pageUsers.map(rowTemplate).join("")
      : '<tr><td class="empty-cell" colspan="9">No users match your search.</td></tr>';

    const first = filtered.length ? (state.page - 1) * state.pageSize + 1 : 0;
    const last = Math.min(state.page * state.pageSize, filtered.length);
    elements.summary.textContent = `Showing ${first} to ${last} of ${filtered.length} users`;
    elements.selectAll.checked = pageUsers.length > 0 && pageUsers.every(function (user) { return state.selectedIds.has(user.id); });
    elements.selectAll.indeterminate = pageUsers.some(function (user) { return state.selectedIds.has(user.id); }) && !elements.selectAll.checked;

    document.querySelectorAll(".sort-button").forEach(function (button) {
      button.classList.toggle("active", button.dataset.sort === state.sortKey);
    });
    renderPagination(totalPages);
    applyColumnVisibility();
    refreshIcons();
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { elements.toast.classList.remove("show"); }, 2400);
  }

  function formFields() {
    return {
      id: document.getElementById("userId"),
      fullName: document.getElementById("fullNameField"),
      username: document.getElementById("usernameField"),
      email: document.getElementById("emailField"),
      mobile: document.getElementById("mobileField"),
      userType: document.getElementById("userTypeField"),
      status: document.getElementById("statusField"),
      verified: document.getElementById("verifiedField")
    };
  }

  function openModal(mode, user) {
    const fields = formFields();
    const isView = mode === "view";
    elements.form.reset();
    fields.id.value = user ? user.id : "";
    fields.fullName.value = user ? user.fullName : "";
    fields.username.value = user ? user.username : "";
    fields.email.value = user ? user.email : "";
    fields.mobile.value = user ? user.mobile : "";
    fields.userType.value = user ? user.userType : "Receptionist";
    fields.status.value = user ? user.status : "Active";
    fields.verified.checked = user ? user.verified : true;

    elements.modalTitle.textContent = isView ? "User Details" : user ? "Update User" : "Add User";
    elements.modalSubtitle.textContent = isView ? "Review this user's account information." : user ? "Edit the selected system user." : "Create a new system user.";
    elements.saveButton.hidden = isView;
    Object.keys(fields).forEach(function (key) { if (key !== "id") fields[key].disabled = isView; });
    elements.modal.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(function () { (isView ? document.getElementById("closeModalButton") : fields.fullName).focus(); }, 0);
  }

  function closeModal() {
    elements.modal.hidden = true;
    document.body.style.overflow = "";
  }

  function exportCsv() {
    const columns = ["fullName", "username", "email", "mobile", "userType", "verified", "status"].filter(function (column) { return !state.hiddenColumns.has(column); });
    const headings = { fullName: "Full Name", username: "User Name", email: "Email", mobile: "Mobile", userType: "User Type", verified: "Email Verified", status: "Status" };
    const rows = visibleUsers().map(function (user) {
      return columns.map(function (column) {
        const value = column === "verified" ? (user.verified ? "Yes" : "No") : user[column];
        return '"' + String(value).replace(/"/g, '""') + '"';
      }).join(",");
    });
    const csv = [columns.map(function (column) { return headings[column]; }).join(",")].concat(rows).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "cliniflow-users.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV export created.");
  }

  elements.search.addEventListener("input", function () { state.query = elements.search.value; state.page = 1; render(); });
  elements.pageSize.addEventListener("change", function () { state.pageSize = Number(elements.pageSize.value); state.page = 1; render(); });
  elements.previous.addEventListener("click", function () { if (state.page > 1) { state.page -= 1; render(); } });
  elements.next.addEventListener("click", function () {
    const pages = Math.max(1, Math.ceil(visibleUsers().length / state.pageSize));
    if (state.page < pages) { state.page += 1; render(); }
  });

  document.querySelectorAll(".sort-button").forEach(function (button) {
    button.addEventListener("click", function () {
      if (state.sortKey === button.dataset.sort) state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      else { state.sortKey = button.dataset.sort; state.sortDirection = "asc"; }
      render();
    });
  });

  elements.selectAll.addEventListener("change", function () {
    currentPageUsers(visibleUsers()).forEach(function (user) {
      if (elements.selectAll.checked) state.selectedIds.add(user.id);
      else state.selectedIds.delete(user.id);
    });
    render();
  });

  elements.body.addEventListener("change", function (event) {
    if (!event.target.matches(".row-checkbox")) return;
    const id = Number(event.target.closest("tr").dataset.userId);
    if (event.target.checked) state.selectedIds.add(id); else state.selectedIds.delete(id);
    render();
  });

  elements.body.addEventListener("click", function (event) {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const row = actionButton.closest("tr");
    const id = Number(row.dataset.userId);
    const user = users.find(function (item) { return item.id === id; });
    if (actionButton.dataset.action === "view") openModal("view", user);
    if (actionButton.dataset.action === "edit") openModal("edit", user);
    if (actionButton.dataset.action === "delete" && window.confirm("Delete " + user.fullName + "?")) {
      const index = users.findIndex(function (item) { return item.id === id; });
      users.splice(index, 1);
      state.selectedIds.delete(id);
      render();
      showToast("User deleted.");
    }
  });

  elements.columnButton.addEventListener("click", function () {
    const isOpen = elements.columnPicker.classList.toggle("open");
    elements.columnButton.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll("[data-column-toggle]").forEach(function (checkbox) {
    checkbox.addEventListener("change", function () {
      if (checkbox.checked) state.hiddenColumns.delete(checkbox.dataset.columnToggle);
      else state.hiddenColumns.add(checkbox.dataset.columnToggle);
      applyColumnVisibility();
    });
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest("#columnPicker")) {
      elements.columnPicker.classList.remove("open");
      elements.columnButton.setAttribute("aria-expanded", "false");
    }
  });

  document.getElementById("exportButton").addEventListener("click", exportCsv);
  document.getElementById("addUserButton").addEventListener("click", function () { openModal("add"); });
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
  document.getElementById("cancelModalButton").addEventListener("click", closeModal);
  elements.modal.addEventListener("click", function (event) { if (event.target === elements.modal) closeModal(); });

  elements.form.addEventListener("submit", function (event) {
    event.preventDefault();
    const fields = formFields();
    const id = Number(fields.id.value);
    const record = {
      id: id || Math.max.apply(null, users.map(function (user) { return user.id; })) + 1,
      fullName: fields.fullName.value.trim(),
      username: fields.username.value.trim(),
      email: fields.email.value.trim(),
      mobile: fields.mobile.value.trim(),
      userType: fields.userType.value,
      verified: fields.verified.checked,
      status: fields.status.value
    };
    if (id) Object.assign(users.find(function (user) { return user.id === id; }), record);
    else users.unshift(record);
    closeModal();
    state.page = 1;
    render();
    showToast(id ? "User updated." : "User added.");
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !elements.modal.hidden) closeModal();
  });

  render();
})();
