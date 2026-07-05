(function () {
  var MQ_MOBILE = window.matchMedia('(max-width: 640px)');

  var LABELS = {
    fi: { expand: 'Näytä kaikki', collapse: 'Näytä vähemmän', unit: 'kpl' },
    en: { expand: 'Show all',     collapse: 'Show less',       unit: '' },
    sv: { expand: 'Visa alla',    collapse: 'Visa färre',      unit: '' }
  };

  function getLabel() {
    return LABELS[document.documentElement.lang] || LABELS.fi;
  }

  function getLimit() {
    return MQ_MOBILE.matches ? 3 : 6;
  }

  function init(el) {
    var limit = getLimit();
    var items = Array.from(el.children);
    if (items.length <= limit) return;

    var total = items.length;
    var lbl   = getLabel();
    var countStr = lbl.unit ? total + ' ' + lbl.unit : String(total);

    // Hide items beyond the visible limit
    items.slice(limit).forEach(function (item) {
      item.classList.add('truncate-hidden');
    });

    // Wrap in shell (needed for the gradient overlay)
    var shell = document.createElement('div');
    shell.className = 'truncate-shell';
    el.parentNode.insertBefore(shell, el);
    shell.appendChild(el);

    // Footer with expand/collapse button
    var footer = document.createElement('div');
    footer.className = 'truncate-footer';

    var btn = document.createElement('button');
    btn.className = 'truncate-btn';
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.dataset.labelExpand   = lbl.expand + ' (' + countStr + ')';
    btn.dataset.labelCollapse = lbl.collapse;
    btn.textContent = btn.dataset.labelExpand;
    footer.appendChild(btn);
    shell.parentNode.insertBefore(footer, shell.nextSibling);

    btn.addEventListener('click', function () {
      var expanded = shell.classList.toggle('truncate-expanded');
      if (expanded) {
        items.slice(limit).forEach(function (item) { item.classList.remove('truncate-hidden'); });
      } else {
        items.slice(limit).forEach(function (item) { item.classList.add('truncate-hidden'); });
        shell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      btn.textContent = expanded ? btn.dataset.labelCollapse : btn.dataset.labelExpand;
      btn.setAttribute('aria-expanded', String(expanded));
    });
  }

  function run() {
    document.querySelectorAll('[data-mobile-truncate]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
}());
