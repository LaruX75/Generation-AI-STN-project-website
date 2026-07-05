(function () {
  var LABELS = {
    fi: { expand: 'Näytä kaikki', collapse: 'Näytä vähemmän', unit: 'kpl' },
    en: { expand: 'Show all',     collapse: 'Show less',       unit: '' },
    sv: { expand: 'Visa alla',    collapse: 'Visa färre',      unit: '' }
  };

  function getLabel() {
    return LABELS[document.documentElement.lang] || LABELS.fi;
  }

  function init(el) {
    var items = Array.from(el.children);
    if (items.length <= 3) return;

    var total = items.length;
    var lbl = getLabel();
    var countStr = lbl.unit ? total + ' ' + lbl.unit : String(total);

    var shell = document.createElement('div');
    shell.className = 'truncate-shell';
    el.parentNode.insertBefore(shell, el);
    shell.appendChild(el);

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
      btn.textContent = expanded ? btn.dataset.labelCollapse : btn.dataset.labelExpand;
      btn.setAttribute('aria-expanded', String(expanded));
      if (!expanded) {
        shell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
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
