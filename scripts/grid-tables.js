(function () {
  var GridNS = window.gridjs;
  if (!GridNS || !GridNS.Grid || !GridNS.html) return;

  var MOBILE_QUERY = window.matchMedia("(max-width: 700px)");
  var I18N = {
    fi: {
      results: "tulosta",
      sortAsc: "Lajittele sarake nousevasti",
      sortDesc: "Lajittele sarake laskevasti",
      previous: "Edellinen",
      next: "Seuraava",
      page: "Sivu",
      showing: "Näytetään",
      of: "/",
      to: "-",
      loading: "Ladataan...",
      noRecordsFound: "Ei tuloksia.",
      error: "Taulukon latauksessa tapahtui virhe."
    },
    en: {
      results: "results",
      sortAsc: "Sort column ascending",
      sortDesc: "Sort column descending",
      previous: "Previous",
      next: "Next",
      page: "Page",
      showing: "Showing",
      of: "of",
      to: "to",
      loading: "Loading...",
      noRecordsFound: "No results.",
      error: "An error occurred while loading the table."
    },
    sv: {
      results: "resultat",
      sortAsc: "Sortera kolumn stigande",
      sortDesc: "Sortera kolumn fallande",
      previous: "Foregande",
      next: "Nasta",
      page: "Sida",
      showing: "Visar",
      of: "av",
      to: "-",
      loading: "Laddar...",
      noRecordsFound: "Inga resultat.",
      error: "Ett fel uppstod nar tabellen laddades."
    }
  };

  function getLang() {
    var lang = (document.documentElement.getAttribute("lang") || "fi").toLowerCase();
    if (lang.indexOf("en") === 0) return "en";
    if (lang.indexOf("sv") === 0) return "sv";
    return "fi";
  }

  function getMessages(section, emptyText) {
    var lang = getLang();
    var msg = I18N[lang] || I18N.fi;
    return {
      sort: {
        sortAsc: msg.sortAsc,
        sortDesc: msg.sortDesc
      },
      pagination: {
        previous: msg.previous,
        next: msg.next,
        navigate: function (page, pages) { return msg.page + " " + page + " / " + pages; },
        page: function (page) { return msg.page + " " + page; },
        showing: msg.showing,
        of: msg.of,
        to: msg.to,
        results: msg.results
      },
      loading: msg.loading,
      noRecordsFound: emptyText || msg.noRecordsFound,
      error: msg.error
    };
  }

  function shouldSort(className) {
    return !/(media-table-col--source|media-table-col--title|media-table-col--content|media-table-col--link|toiminta-table-col--extra)/.test(className);
  }

  function buildColumns(state, isMobile) {
    return state.columns.map(function (column) {
      return {
        name: column.name,
        hidden: !!(isMobile && column.mobileHide),
        sort: column.sortable,
        width: column.width || undefined,
        attributes: { class: column.className },
        formatter: function (cell) {
          return GridNS.html(cell == null ? "" : String(cell));
        }
      };
    });
  }

  function uniqueValues(rows, field) {
    var seen = {};
    rows.forEach(function (row) {
      var value = row.dataset[field];
      if (value) seen[value] = true;
    });
    return Object.keys(seen).sort(function (a, b) {
      if (/^\d+$/.test(a) && /^\d+$/.test(b)) return Number(b) - Number(a);
      return a.localeCompare(b);
    });
  }

  function populateFilterOptions(state) {
    state.filters.forEach(function (filter) {
      if (!filter.populateField) return;
      uniqueValues(state.rows, filter.populateField).forEach(function (value) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        filter.el.appendChild(option);
      });
    });
  }

  function filterRows(state) {
    var query = state.searchEl ? state.searchEl.value.toLowerCase().trim() : "";
    return state.rows.filter(function (row) {
      if (query && (!row.dataset.search || row.dataset.search.indexOf(query) === -1)) {
        return false;
      }

      return state.filters.every(function (filter) {
        var value = filter.el.value;
        var rowValue;
        if (!value) return true;
        rowValue = row.dataset[filter.field] || "";
        if (filter.mode === "contains") {
          return rowValue.indexOf(value.toLowerCase()) !== -1;
        }
        return rowValue === value.toLowerCase() || rowValue === value;
      });
    });
  }

  function renderGrid(state) {
    var filteredRows = filterRows(state);
    var isMobile = MOBILE_QUERY.matches;
    var data = filteredRows.map(function (row) { return row.cells; });

    state.countEl.textContent = filteredRows.length + "\u00a0" + state.messages.pagination.results;

    if (!state.grid) {
      state.grid = new GridNS.Grid({
        columns: buildColumns(state, isMobile),
        data: data,
        search: false,
        sort: true,
        pagination: {
          limit: state.pageSize,
          summary: false,
          buttonsCount: 5,
          resetPageOnUpdate: true
        },
        language: state.messages,
        className: {
          container: "media-gridjs-container",
          table: "media-gridjs-table",
          th: "media-gridjs-th",
          td: "media-gridjs-td",
          footer: "media-gridjs-footer",
          pagination: "media-gridjs-pagination",
          paginationButton: "media-gridjs-page-btn",
          paginationButtonCurrent: "media-gridjs-page-btn is-current",
          paginationButtonPrev: "media-gridjs-page-btn",
          paginationButtonNext: "media-gridjs-page-btn",
          notfound: "media-gridjs-notfound"
        }
      });
      state.grid.render(state.gridMount);
      return;
    }

    state.grid.updateConfig({
      columns: buildColumns(state, isMobile),
      data: data
    }).forceRender();
  }

  function parseTable(section) {
    var sourceTable = section.querySelector("table[data-grid-source]");
    var headerCells;
    var bodyRows;
    var wrap;
    var gridMount;
    var pagination;
    var emptyText;

    if (!sourceTable || !sourceTable.tHead || !sourceTable.tBodies.length) return null;

    headerCells = Array.from(sourceTable.tHead.querySelectorAll("th"));
    bodyRows = Array.from(sourceTable.tBodies[0].querySelectorAll("tr"));
    wrap = sourceTable.closest(".media-table-wrap");
    if (!wrap) return null;

    gridMount = document.createElement("div");
    gridMount.className = "media-gridjs";
    wrap.appendChild(gridMount);

    pagination = section.querySelector(".media-table-pagination");
    emptyText = (section.querySelector(".media-table-empty") || {}).textContent || "";

    section.classList.add("grid-table-enhanced");
    sourceTable.hidden = true;
    if (pagination) pagination.hidden = true;

    return {
      pageSize: Number(section.dataset.gridPageSize || 10),
      columns: headerCells.map(function (cell) {
        return {
          name: cell.innerHTML,
          className: cell.className || "",
          mobileHide: cell.classList.contains("media-table-col--mobile-hide"),
          sortable: shouldSort(cell.className || ""),
          width: cell.style.width || ""
        };
      }),
      rows: bodyRows.map(function (row) {
        return {
          dataset: row.dataset,
          cells: Array.from(row.cells).map(function (cell) { return cell.innerHTML.trim(); })
        };
      }),
      filters: Array.from(section.querySelectorAll("[data-grid-filter]")).map(function (el) {
        return {
          el: el,
          field: el.dataset.gridFilter,
          mode: el.dataset.gridFilterMode || "equals",
          populateField: el.dataset.gridPopulateOptions || ""
        };
      }),
      searchEl: section.querySelector("[data-grid-search]"),
      countEl: section.querySelector("[data-grid-count]"),
      gridMount: gridMount,
      messages: getMessages(section, emptyText.trim()),
      grid: null
    };
  }

  function initSection(section) {
    var state = parseTable(section);
    var lastMobileState;
    if (!state) return;

    populateFilterOptions(state);
    renderGrid(state);

    if (state.searchEl) {
      state.searchEl.addEventListener("input", function () {
        renderGrid(state);
      });
    }

    state.filters.forEach(function (filter) {
      filter.el.addEventListener("change", function () {
        renderGrid(state);
      });
    });

    lastMobileState = MOBILE_QUERY.matches;
    MOBILE_QUERY.addEventListener("change", function () {
      if (lastMobileState !== MOBILE_QUERY.matches) {
        lastMobileState = MOBILE_QUERY.matches;
        renderGrid(state);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-grid-enhance]").forEach(initSection);
  });
}());
