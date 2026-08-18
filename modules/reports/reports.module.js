(function (global) {
  'use strict';

  var _C = global.CONTRACTS || {};
  var EV = _C.EVENTS || {};

  function el(id) { return document.getElementById(id); }

  var reportsModule = {
    storage: global.storageService || null,
    bus: global.eventBus || null,
    currentFilter: 'all',

    init: function () {
      if (this.bus) {
        this.bus.on(EV.RENDER_REQUIRED, this.render.bind(this));
        this.bus.on(EV.DATA_RESET, this.render.bind(this));
      }
    },

    filterReports: function (filter) {
      this.currentFilter = filter;
      var buttons = document.querySelectorAll('.report-filter-btn');
      buttons.forEach(function (btn) {
        btn.className = 'report-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-hover text-gray-400 hover:text-white';
      });
      if (buttons.length) {
        var filterIndex = ['all', 'application', 'daily', 'team', 'withdraw'].indexOf(filter);
        if (filterIndex >= 0 && buttons[filterIndex]) {
          buttons[filterIndex].className = 'report-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-black';
        }
      }
      this.render();
    },

    _matchFilter: function (tx) {
      var f = this.currentFilter;
      if (f === 'all') return true;
      var type = (tx.type || '').toLowerCase();
      if (f === 'application') return type.indexOf('depósito') >= 0 || type.indexOf('aplica') >= 0;
      if (f === 'daily') return type.indexOf('rendimento') >= 0 || type.indexOf('diário') >= 0 || type.indexOf('daily') >= 0;
      if (f === 'team') return type.indexOf('comissão') >= 0 || type.indexOf('binário') >= 0 || type.indexOf('bônus') >= 0 || type.indexOf('equipe') >= 0;
      if (f === 'withdraw') return type.indexOf('saque') >= 0;
      return true;
    },

    render: function () {
      if (!this.storage) return;
      var body = el('reportsTableBody');
      if (!body) return;

      var txs = (this.storage.getTransactions() || []).filter(this._matchFilter.bind(this));

      if (txs.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhuma movimentação registrada.</td></tr>';
        return;
      }

      body.innerHTML = txs.map(function (tx) {
        var amtClass = tx.amount < 0 ? 'text-red-400' : 'text-emerald-400';
        var sign = tx.amount < 0 ? '-' : '+';
        return (
          '<tr class="hover:bg-dark-hover transition">' +
            '<td class="p-4 text-amber-400 font-bold">' + tx.id + '</td>' +
            '<td class="p-4">' + tx.type + '</td>' +
            '<td class="p-4 text-gray-400">' + tx.date + '</td>' +
            '<td class="p-4 font-bold ' + amtClass + '">' + sign + '$' + Math.abs(tx.amount).toFixed(2) + '</td>' +
            '<td class="p-4"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">' + tx.status + '</span></td>' +
          '</tr>'
        );
      }).join('');
    }
  };

  global.reportsModule = reportsModule;
})(window);
