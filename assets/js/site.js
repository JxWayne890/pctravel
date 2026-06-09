(function () {
  const integrations = {
    leadWebhookUrl: "",
    googleSheetsWebhookUrl: "",
    crmWebhookUrl: "",
    consultationEmbedUrl: "https://calendly.com/pc-fantasy-travel/consultation"
  };

  const config = Object.assign({}, integrations, window.PC_INTEGRATIONS || {});
  const storageKeys = {
    packages: "pcFantasyPackages",
    leads: "pcFantasyLeads"
  };
  const leadStatuses = ["New", "Contacted", "Quoted", "Booked", "Closed"];

  const defaultPackages = Array.isArray(window.PC_FANTASY_PACKAGES) ? window.PC_FANTASY_PACKAGES : [];
  const packageFilters = Array.isArray(window.PC_PACKAGE_FILTERS) ? window.PC_PACKAGE_FILTERS : [];

  document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initScheduler();
    initPackages();
    initLeadForms();
    initAdmin();
  });

  function initNavigation() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-site-nav]");
    if (!toggle || !nav) return;

    setCurrentNavItem(nav);

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        nav.querySelectorAll("[data-nav-more]").forEach((details) => {
          details.open = false;
        });
      }
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-site-nav]") || event.target.closest("[data-nav-toggle]")) return;
      nav.querySelectorAll("[data-nav-more]").forEach((details) => {
        details.open = false;
      });
    });
  }

  function setCurrentNavItem(nav) {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    nav.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href") || "";
      const linkPage = href.split("#")[0] || "index.html";
      const isCurrent = linkPage === currentPage;
      if (isCurrent) {
        link.setAttribute("aria-current", "page");
        link.closest(".nav-more")?.classList.add("has-current");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function initScheduler() {
    document.querySelectorAll("[data-scheduler-frame]").forEach((frame) => {
      const url = frame.getAttribute("data-scheduler-frame") || config.consultationEmbedUrl;
      if (!url) return;
      frame.src = url;
    });
  }

  function getPackages() {
    const saved = localStorage.getItem(storageKeys.packages);
    if (!saved) return defaultPackages;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : defaultPackages;
    } catch (error) {
      return defaultPackages;
    }
  }

  function savePackages(packages) {
    localStorage.setItem(storageKeys.packages, JSON.stringify(packages, null, 2));
  }

  function initPackages() {
    const preview = document.querySelector("[data-package-preview]");
    const library = document.querySelector("[data-package-library]");
    const filters = document.querySelector("[data-package-filters]");
    const packages = getPackages();

    if (preview) {
      const previewFilter = preview.getAttribute("data-package-preview");
      const previewPackages = previewFilter
        ? packages.filter((pkg) => pkg.tags.includes(previewFilter) || pkg.leadType === previewFilter)
        : packages;
      preview.innerHTML = previewPackages.slice(0, 6).map((pkg) => packageCard(pkg, true)).join("");
    }

    if (filters && library) {
      const allFilters = ["All", ...packageFilters];
      filters.innerHTML = allFilters
        .map((filter, index) => `<button class="filter-button${index === 0 ? " is-active" : ""}" type="button" data-filter="${escapeHtml(filter)}">${escapeHtml(filter)}</button>`)
        .join("");

      filters.addEventListener("click", (event) => {
        const button = event.target.closest("[data-filter]");
        if (!button) return;
        filters.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        renderLibrary(library, packages, button.dataset.filter);
      });

      renderLibrary(library, packages, "All");
    }
  }

  function renderLibrary(container, packages, filter) {
    const selected = filter === "All" ? packages : packages.filter((pkg) => pkg.tags.includes(filter));
    container.innerHTML = selected.map((pkg) => packageCard(pkg, false)).join("");
  }

  function packageCard(pkg, compact) {
    const requestUrl = `plan-my-trip.html?package=${encodeURIComponent(pkg.title)}&packageId=${encodeURIComponent(pkg.id)}&leadType=${encodeURIComponent(pkg.leadType || "custom package")}`;
    const included = listToText(pkg.included);
    const notIncluded = listToText(pkg.notIncluded);
    const idealFor = listToText(pkg.idealFor);
    const tags = pkg.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("");
    const details = compact
      ? ""
      : `
        <p><strong>What's included:</strong> ${escapeHtml(included)}</p>
        <p><strong>What's not included:</strong> ${escapeHtml(notIncluded)}</p>
        <p><strong>Ideal for:</strong> ${escapeHtml(idealFor)}</p>
      `;

    return `
      <article class="package-card">
        <img src="${escapeAttribute(pkg.image)}" alt="${escapeAttribute(pkg.title)}" loading="lazy">
        <div class="package-body">
          <div class="tag-row">${tags}</div>
          <h3>${escapeHtml(pkg.title)}</h3>
          <div class="package-meta">
            <span>${escapeHtml(pkg.destination)}</span>
            <span>${escapeHtml(pkg.travelType)}</span>
            <span>${escapeHtml(pkg.duration)}</span>
          </div>
          <p>${escapeHtml(pkg.dates)}</p>
          <p class="price">${escapeHtml(pkg.price)}</p>
          ${details}
          <p class="disclaimer">Prices, dates, cabins, rooms, and availability are subject to change until confirmed.</p>
          <div class="card-actions">
            <a class="button small" href="${requestUrl}">${escapeHtml(pkg.cta || "Request This Package")}</a>
            <a class="button-outline small" href="${escapeAttribute(pkg.vendorUrl)}" target="_blank" rel="noopener">${escapeHtml(pkg.vendorLabel || "Book With Vendor Link")}</a>
          </div>
        </div>
      </article>
    `;
  }

  function initLeadForms() {
    const params = new URLSearchParams(window.location.search);
    const packageName = params.get("package");
    const packageId = params.get("packageId");
    const leadType = params.get("leadType");

    if (leadType) {
      setFieldValue("leadType", leadType);
    }

    if (packageName) {
      setFieldValue("packageInterest", "specific-package");
      setFieldValue("packageName", packageName);
      setFieldValue("leadType", leadType || inferLeadType(packageId));
      const packageField = document.querySelector("[data-selected-package]");
      if (packageField) packageField.textContent = packageName;
    }

    document.querySelectorAll("[data-lead-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector("[type='submit']");
        if (submitButton) submitButton.disabled = true;

        const lead = collectLead(form);
        saveLead(lead);
        await postLead(lead);
        renderFormSuccess(form, lead);

        if (submitButton) submitButton.disabled = false;
      });
    });
  }

  function collectLead(form) {
    const formData = new FormData(form);
    const get = (name) => String(formData.get(name) || "").trim();
    const getAll = (name) => formData.getAll(name).map((value) => String(value).trim()).filter(Boolean);
    const formType = form.getAttribute("data-lead-form") || "vacation";

    return {
      id: `lead-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      formType,
      leadType: get("leadType") || formType,
      firstName: get("firstName"),
      lastName: get("lastName"),
      email: get("email"),
      phone: get("phone"),
      preferredContact: get("preferredContact"),
      bestTime: get("bestTime"),
      cityState: get("cityState"),
      timeZone: get("timeZone"),
      destination: get("destination"),
      openToSuggestions: get("openToSuggestions"),
      departureCity: get("departureCity"),
      travelDates: get("travelDates"),
      datesFlexible: get("datesFlexible"),
      tripLength: get("tripLength"),
      travelers: get("travelers"),
      adults: get("adults"),
      childrenAges: get("childrenAges"),
      roomsCabins: get("roomsCabins"),
      occasion: get("occasion"),
      travelStyles: getAll("travelStyle"),
      totalBudget: get("totalBudget"),
      budgetPerPerson: get("budgetPerPerson"),
      budgetIncludesFlights: get("budgetIncludesFlights"),
      readyToBook: get("readyToBook"),
      paymentPlan: get("paymentPlan"),
      depositRange: get("depositRange"),
      preferredVendor: get("preferredVendor"),
      virginVoyages: get("virginVoyages"),
      carnival: get("carnival"),
      starRating: get("starRating"),
      roomPreference: get("roomPreference"),
      excursions: get("excursions"),
      dietaryNeeds: get("dietaryNeeds"),
      accessibilityNeeds: get("accessibilityNeeds"),
      passportStatus: get("passportStatus"),
      validPassports: get("validPassports"),
      travelInsurance: get("travelInsurance"),
      doNotWant: get("doNotWant"),
      packageInterest: get("packageInterest"),
      packageName: get("packageName"),
      vendorLinkUsed: get("vendorLinkUsed"),
      notes: get("notes"),
      consents: getAll("consent"),
      tags: buildLeadTags(formType, get("leadType"), getAll("travelStyle")),
      status: "New",
      sourcePage: document.title,
      sourceUrl: window.location.href
    };
  }

  function getLeads() {
    const saved = localStorage.getItem(storageKeys.leads);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.map(normalizeLead) : [];
    } catch (error) {
      return [];
    }
  }

  function saveLeads(leads) {
    localStorage.setItem(storageKeys.leads, JSON.stringify(leads.map(normalizeLead), null, 2));
  }

  function normalizeLead(lead, index) {
    const normalized = Object.assign({}, lead || {});
    normalized.id = normalized.id || `lead-${normalized.submittedAt || Date.now()}-${index || 0}`;
    normalized.status = leadStatuses.includes(normalized.status) ? normalized.status : "New";
    normalized.tags = Array.isArray(normalized.tags) ? normalized.tags : textToList(String(normalized.tags || ""));
    normalized.consents = Array.isArray(normalized.consents) ? normalized.consents : textToList(String(normalized.consents || ""));
    normalized.travelStyles = Array.isArray(normalized.travelStyles) ? normalized.travelStyles : textToList(String(normalized.travelStyles || ""));
    return normalized;
  }

  function saveLead(lead) {
    const leads = getLeads();
    leads.push(normalizeLead(lead));
    saveLeads(leads);
  }

  async function postLead(lead) {
    const payload = buildPayload(lead);
    const endpoints = [
      config.leadWebhookUrl,
      config.googleSheetsWebhookUrl,
      config.crmWebhookUrl
    ].filter(Boolean);

    await Promise.allSettled(
      endpoints.map((url) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      )
    );
  }

  function buildPayload(lead) {
    return {
      lead,
      emails: {
        clientConfirmation: applyTemplate(window.PC_EMAIL_TEMPLATES?.clientConfirmation, lead),
        leadNotification: applyTemplate(window.PC_EMAIL_TEMPLATES?.leadNotification, lead)
      }
    };
  }

  function applyTemplate(template, lead) {
    if (!template) return null;
    const values = Object.assign({}, lead, {
      travelers: lead.travelers || [lead.adults, lead.childrenAges].filter(Boolean).join("; "),
      travelStyles: Array.isArray(lead.travelStyles) ? lead.travelStyles.join(", ") : lead.travelStyles
    });

    const replace = (text) => String(text || "").replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || "Not provided");
    return {
      subject: replace(template.subject),
      body: replace(template.body)
    };
  }

  function renderFormSuccess(form, lead) {
    const message = form.querySelector("[data-form-success]");
    if (message) {
      message.textContent = "Thank you! PC Fantasy Travel received your request. We'll review your trip details and follow up with next steps.";
      message.classList.add("is-visible");
      message.focus();
    }
    form.reset();
    if (lead.packageName) {
      setFieldValue("packageInterest", "specific-package");
      setFieldValue("packageName", lead.packageName);
    }
  }

  function setFieldValue(name, value) {
    const field = document.querySelector(`[name="${CSS.escape(name)}"]`);
    if (!field) return;
    field.value = value || "";
  }

  function inferLeadType(packageId) {
    const pkg = getPackages().find((item) => item.id === packageId);
    return pkg?.leadType || "custom package";
  }

  function buildLeadTags(formType, leadType, travelStyles) {
    const tags = new Set();
    if (formType) tags.add(formType);
    if (leadType) tags.add(leadType);
    travelStyles.forEach((style) => {
      const lower = style.toLowerCase();
      if (lower.includes("cruise")) tags.add("cruise");
      if (lower.includes("group")) tags.add("group");
      if (lower.includes("resort")) tags.add("resort");
      if (lower.includes("event")) tags.add("event travel");
      if (lower.includes("flight") || lower.includes("hotel")) tags.add("custom package");
    });
    return Array.from(tags);
  }

  function initAdmin() {
    const adminRoot = document.querySelector("[data-admin-root]");
    if (!adminRoot) return;

    initAdminTabs(adminRoot);
    initLeadAdmin(adminRoot);
    initPackageAdmin(adminRoot);
  }

  function initAdminTabs(adminRoot) {
    const tabs = adminRoot.querySelectorAll("[data-admin-tab]");
    const views = adminRoot.querySelectorAll("[data-admin-view]");
    if (!tabs.length || !views.length) return;

    const activate = (section) => {
      tabs.forEach((tab) => {
        const isActive = tab.dataset.adminTab === section;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
      });

      views.forEach((view) => {
        const isActive = view.dataset.adminView === section;
        view.classList.toggle("hidden", !isActive);
        view.hidden = !isActive;
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const section = tab.dataset.adminTab || "leads";
        activate(section);
        if (history.replaceState) {
          history.replaceState(null, "", `#${section}`);
        }
      });
    });

    activate(window.location.hash.replace("#", "") === "packages" ? "packages" : "leads");
  }

  function initLeadAdmin(adminRoot) {
    const leadRoot = adminRoot.querySelector("[data-admin-view='leads']");
    if (!leadRoot) return;

    let leads = getLeads().sort(sortNewest);
    let selectedId = leads[0]?.id || "";
    const list = leadRoot.querySelector("[data-leads-list]");
    const detail = leadRoot.querySelector("[data-lead-detail]");
    const stats = leadRoot.querySelector("[data-lead-stats]");
    const search = leadRoot.querySelector("[data-lead-search]");
    const typeFilter = leadRoot.querySelector("[data-lead-type-filter]");
    const statusFilter = leadRoot.querySelector("[data-lead-status-filter]");
    const exportCsv = leadRoot.querySelector("[data-leads-export-csv]");
    const exportJson = leadRoot.querySelector("[data-leads-export-json]");

    const filteredLeads = () => {
      const query = String(search?.value || "").trim().toLowerCase();
      const selectedType = String(typeFilter?.value || "").trim();
      const selectedStatus = String(statusFilter?.value || "").trim();

      return leads.filter((lead) => {
        const matchesQuery = !query || leadSearchText(lead).includes(query);
        const matchesType = !selectedType || getLeadType(lead) === selectedType;
        const matchesStatus = !selectedStatus || lead.status === selectedStatus;
        return matchesQuery && matchesType && matchesStatus;
      });
    };

    const render = () => {
      leads = getLeads().sort(sortNewest);
      populateLeadTypeFilter(typeFilter, leads);
      renderLeadStats(stats, leads);

      const visibleLeads = filteredLeads();
      if (!visibleLeads.some((lead) => lead.id === selectedId)) {
        selectedId = visibleLeads[0]?.id || leads[0]?.id || "";
      }

      renderLeadList(list, visibleLeads, selectedId);
      renderLeadDetail(detail, leads.find((lead) => lead.id === selectedId));
    };

    list?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-lead-id]");
      if (!button) return;
      selectedId = button.dataset.leadId;
      render();
    });

    detail?.addEventListener("change", (event) => {
      const statusSelect = event.target.closest("[data-lead-status]");
      if (!statusSelect) return;
      leads = getLeads().sort(sortNewest).map((lead) => {
        if (lead.id !== statusSelect.dataset.leadStatus) return lead;
        return Object.assign({}, lead, {
          status: statusSelect.value,
          statusUpdatedAt: new Date().toISOString()
        });
      });
      saveLeads(leads);
      render();
    });

    search?.addEventListener("input", render);
    typeFilter?.addEventListener("change", render);
    statusFilter?.addEventListener("change", render);

    exportCsv?.addEventListener("click", () => {
      downloadCsv("pc-fantasy-leads.csv", filteredLeads());
    });

    exportJson?.addEventListener("click", () => {
      downloadJson("pc-fantasy-leads.json", filteredLeads());
    });

    render();
  }

  function initPackageAdmin(adminRoot) {
    let packages = getPackages().map((pkg) => Object.assign({}, pkg));
    let selectedId = packages[0]?.id || "";
    const list = adminRoot.querySelector("[data-admin-list]");
    const form = adminRoot.querySelector("[data-admin-form]");
    const preview = adminRoot.querySelector("[data-admin-preview]");
    const exportButton = adminRoot.querySelector("[data-admin-export]");
    const resetButton = adminRoot.querySelector("[data-admin-reset]");

    const render = () => {
      if (list) {
        list.innerHTML = packages.map((pkg) => `
          <div class="admin-item">
            <strong>${escapeHtml(pkg.title)}</strong>
            <p>${escapeHtml(pkg.destination)} - ${escapeHtml(pkg.travelType)}</p>
            <button class="button-outline small" type="button" data-edit-package="${escapeAttribute(pkg.id)}">Edit</button>
          </div>
        `).join("");
      }

      if (preview) {
        preview.textContent = JSON.stringify(packages, null, 2);
      }

      fillAdminForm(form, packages.find((pkg) => pkg.id === selectedId) || packages[0]);
    };

    list?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit-package]");
      if (!button) return;
      selectedId = button.dataset.editPackage;
      render();
    });

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const updated = collectAdminPackage(form);
      const index = packages.findIndex((pkg) => pkg.id === updated.id);
      if (index >= 0) {
        packages[index] = updated;
      } else {
        packages.push(updated);
      }
      selectedId = updated.id;
      savePackages(packages);
      render();
    });

    adminRoot.querySelector("[data-admin-new]")?.addEventListener("click", () => {
      selectedId = `package-${Date.now()}`;
      packages.push({
        id: selectedId,
        title: "New Package",
        destination: "Destination",
        travelType: "Travel type",
        dates: "Flexible dates",
        duration: "Duration",
        price: "Request Quote",
        image: "assets/images/hero-travel.jpg",
        tags: ["Custom"],
        included: ["Supplier booking support"],
        notIncluded: ["Travel insurance"],
        idealFor: ["Travelers"],
        cta: "Request This Package",
        vendorLabel: "Vendor Link",
        vendorUrl: "https://example.com/vendor-link",
        leadType: "custom package"
      });
      savePackages(packages);
      render();
    });

    exportButton?.addEventListener("click", () => {
      downloadJson("pc-fantasy-packages.json", packages);
    });

    resetButton?.addEventListener("click", () => {
      packages = defaultPackages.map((pkg) => Object.assign({}, pkg));
      selectedId = packages[0]?.id || "";
      savePackages(packages);
      render();
    });

    render();
  }

  function sortNewest(a, b) {
    return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
  }

  function getLeadType(lead) {
    return lead.leadType || lead.formType || "General";
  }

  function getLeadName(lead) {
    return [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim() || "Unnamed Lead";
  }

  function leadSearchText(lead) {
    return [
      getLeadName(lead),
      lead.email,
      lead.phone,
      getLeadType(lead),
      lead.destination,
      lead.departureCity,
      lead.packageName,
      lead.notes,
      lead.tags
    ]
      .flat()
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function populateLeadTypeFilter(select, leads) {
    if (!select) return;
    const current = select.value;
    const types = Array.from(new Set(leads.map(getLeadType).filter(Boolean))).sort();
    select.innerHTML = `<option value="">All types</option>${types.map((type) => `<option${type === current ? " selected" : ""}>${escapeHtml(type)}</option>`).join("")}`;
  }

  function renderLeadStats(container, leads) {
    if (!container) return;
    const total = leads.length;
    const newCount = leads.filter((lead) => lead.status === "New").length;
    const activeCount = leads.filter((lead) => ["Contacted", "Quoted"].includes(lead.status)).length;
    const bookedCount = leads.filter((lead) => lead.status === "Booked").length;
    container.innerHTML = [
      statPill(total, "Total"),
      statPill(newCount, "New"),
      statPill(activeCount, "Active"),
      statPill(bookedCount, "Booked")
    ].join("");
  }

  function statPill(value, label) {
    return `<div class="stat-pill"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function renderLeadList(container, leads, selectedId) {
    if (!container) return;
    if (!leads.length) {
      container.innerHTML = `<div class="empty-state"><h3>No leads found</h3><p>Submitted requests will appear here.</p></div>`;
      return;
    }

    container.innerHTML = leads.map((lead) => {
      const isSelected = lead.id === selectedId;
      return `
        <button class="lead-card${isSelected ? " is-selected" : ""}" type="button" data-lead-id="${escapeAttribute(lead.id)}">
          <span class="lead-card-top">
            <strong>${escapeHtml(getLeadName(lead))}</strong>
            <span class="status-badge">${escapeHtml(lead.status)}</span>
          </span>
          <span class="lead-contact">${escapeHtml([lead.email, lead.phone].filter(Boolean).join(" / ") || "No contact details")}</span>
          <span class="lead-meta">${escapeHtml(formatDate(lead.submittedAt))} | ${escapeHtml(getLeadType(lead))}</span>
        </button>
      `;
    }).join("");
  }

  function renderLeadDetail(container, lead) {
    if (!container) return;
    if (!lead) {
      container.innerHTML = `<div class="empty-state"><h3>No lead selected</h3><p>Choose a lead to view the full request.</p></div>`;
      return;
    }

    const payload = buildPayload(lead);
    container.innerHTML = `
      <div class="lead-detail-head">
        <div>
          <p class="eyebrow">${escapeHtml(getLeadType(lead))}</p>
          <h2>${escapeHtml(getLeadName(lead))}</h2>
          <p>${escapeHtml(formatDate(lead.submittedAt))}</p>
        </div>
        <div class="field lead-status-field">
          <label for="status-${escapeAttribute(lead.id)}">Status</label>
          <select id="status-${escapeAttribute(lead.id)}" data-lead-status="${escapeAttribute(lead.id)}">
            ${leadStatuses.map((status) => `<option${status === lead.status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="cta-row">
        ${lead.email ? `<a class="button-outline small" href="mailto:${escapeAttribute(lead.email)}">Email</a>` : ""}
        ${lead.phone ? `<a class="button-outline small" href="tel:${escapeAttribute(lead.phone)}">Call</a>` : ""}
      </div>
      ${detailGroup("Contact", [
        ["Email", lead.email],
        ["Phone", lead.phone],
        ["Preferred contact", lead.preferredContact],
        ["Best time", lead.bestTime],
        ["City/state", lead.cityState],
        ["Time zone", lead.timeZone]
      ])}
      ${detailGroup("Trip", [
        ["Destination", lead.destination],
        ["Departure city", lead.departureCity],
        ["Travel dates", lead.travelDates],
        ["Dates flexible", lead.datesFlexible],
        ["Trip length", lead.tripLength],
        ["Travelers", lead.travelers || [lead.adults && `${lead.adults} adults`, lead.childrenAges].filter(Boolean).join(", ")],
        ["Rooms/cabins", lead.roomsCabins],
        ["Occasion", lead.occasion]
      ])}
      ${detailGroup("Budget And Preferences", [
        ["Total budget", lead.totalBudget],
        ["Budget per person", lead.budgetPerPerson],
        ["Budget includes flights", lead.budgetIncludesFlights],
        ["Ready to book", lead.readyToBook],
        ["Payment plan", lead.paymentPlan],
        ["Deposit range", lead.depositRange],
        ["Travel styles", lead.travelStyles],
        ["Preferred vendor", lead.preferredVendor],
        ["Virgin Voyages", lead.virginVoyages],
        ["Carnival", lead.carnival],
        ["Star rating", lead.starRating],
        ["Room preference", lead.roomPreference],
        ["Excursions", lead.excursions],
        ["Dietary needs", lead.dietaryNeeds],
        ["Accessibility needs", lead.accessibilityNeeds],
        ["Passport status", lead.passportStatus],
        ["Valid passports", lead.validPassports],
        ["Travel insurance", lead.travelInsurance],
        ["Do not want", lead.doNotWant]
      ])}
      ${detailGroup("Package And Notes", [
        ["Package interest", lead.packageInterest],
        ["Package name", lead.packageName],
        ["Vendor link used", lead.vendorLinkUsed],
        ["Notes", lead.notes],
        ["Consents", lead.consents],
        ["Tags", lead.tags],
        ["Source page", lead.sourcePage]
      ])}
      ${payload.emails?.leadNotification ? `
        <div class="lead-detail-section">
          <h3>Email Draft</h3>
          <p><strong>${escapeHtml(payload.emails.leadNotification.subject)}</strong></p>
          <pre class="admin-preview">${escapeHtml(payload.emails.leadNotification.body)}</pre>
        </div>
      ` : ""}
      <div class="lead-detail-section">
        <h3>Full Lead JSON</h3>
        <pre class="admin-preview">${escapeHtml(JSON.stringify(lead, null, 2))}</pre>
      </div>
    `;
  }

  function detailGroup(title, rows) {
    const visibleRows = rows.filter((row) => formatValue(row[1]));
    if (!visibleRows.length) return "";
    return `
      <div class="lead-detail-section">
        <h3>${escapeHtml(title)}</h3>
        <dl class="detail-list">
          ${visibleRows.map(([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(formatValue(value))}</dd>
            </div>
          `).join("")}
        </dl>
      </div>
    `;
  }

  function formatValue(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join(", ");
    return String(value || "").trim();
  }

  function formatDate(value) {
    if (!value) return "Date not saved";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function downloadCsv(filename, leads) {
    const headers = [
      "Submitted",
      "Status",
      "Lead Type",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Preferred Contact",
      "Destination",
      "Travel Dates",
      "Travelers",
      "Budget",
      "Package",
      "Notes",
      "Tags"
    ];
    const rows = leads.map((lead) => [
      lead.submittedAt,
      lead.status,
      getLeadType(lead),
      lead.firstName,
      lead.lastName,
      lead.email,
      lead.phone,
      lead.preferredContact,
      lead.destination,
      lead.travelDates,
      lead.travelers || [lead.adults && `${lead.adults} adults`, lead.childrenAges].filter(Boolean).join(", "),
      lead.totalBudget || lead.budgetPerPerson,
      lead.packageName,
      lead.notes,
      lead.tags
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    downloadText(filename, csv, "text/csv");
  }

  function csvCell(value) {
    const text = formatValue(value).replace(/"/g, "\"\"");
    return `"${text}"`;
  }

  function fillAdminForm(form, pkg) {
    if (!form || !pkg) return;
    setFormValue(form, "id", pkg.id);
    setFormValue(form, "title", pkg.title);
    setFormValue(form, "destination", pkg.destination);
    setFormValue(form, "travelType", pkg.travelType);
    setFormValue(form, "dates", pkg.dates);
    setFormValue(form, "duration", pkg.duration);
    setFormValue(form, "price", pkg.price);
    setFormValue(form, "image", pkg.image);
    setFormValue(form, "tags", listToText(pkg.tags));
    setFormValue(form, "included", listToText(pkg.included));
    setFormValue(form, "notIncluded", listToText(pkg.notIncluded));
    setFormValue(form, "idealFor", listToText(pkg.idealFor));
    setFormValue(form, "cta", pkg.cta);
    setFormValue(form, "vendorLabel", pkg.vendorLabel);
    setFormValue(form, "vendorUrl", pkg.vendorUrl);
    setFormValue(form, "leadType", pkg.leadType);
  }

  function collectAdminPackage(form) {
    const formData = new FormData(form);
    const get = (name) => String(formData.get(name) || "").trim();
    return {
      id: slugify(get("id") || get("title") || `package-${Date.now()}`),
      title: get("title"),
      destination: get("destination"),
      travelType: get("travelType"),
      dates: get("dates"),
      duration: get("duration"),
      price: get("price") || "Request Quote",
      image: get("image") || "assets/images/hero-travel.jpg",
      tags: textToList(get("tags")),
      included: textToList(get("included")),
      notIncluded: textToList(get("notIncluded")),
      idealFor: textToList(get("idealFor")),
      cta: get("cta") || "Request This Package",
      vendorLabel: get("vendorLabel") || "Vendor Link",
      vendorUrl: get("vendorUrl") || "https://example.com/vendor-link",
      leadType: get("leadType") || "custom package"
    };
  }

  function setFormValue(form, name, value) {
    const field = form.querySelector(`[name="${CSS.escape(name)}"]`);
    if (field) field.value = value || "";
  }

  function downloadJson(filename, data) {
    downloadText(filename, JSON.stringify(data, null, 2), "application/json");
  }

  function downloadText(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function textToList(value) {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function listToText(value) {
    return Array.isArray(value) ? value.join(", ") : String(value || "");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
