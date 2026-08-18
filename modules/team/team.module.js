(function (global) {
  'use strict';

  var _C = global.CONTRACTS || {};
  var EV = _C.EVENTS || {};
  var TEAM_CFG = _C.TEAM || {};

  function el(id) { return document.getElementById(id); }
  function fmt(v) { return global.ui && global.ui.formatCurrency ? global.ui.formatCurrency(v) : ('$' + Number(v || 0).toFixed(2)); }
  function showToast(msg, type) { if (global.ui && global.ui.showToast) global.ui.showToast(msg, type); else alert(msg); }
  function copyClip(txt) {
    if (global.ui && global.ui.copyToClipboard) return global.ui.copyToClipboard(txt);
    try {
      var ta = document.createElement('textarea'); ta.value = txt;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      return true;
    } catch (e) { return false; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function initials(name) {
    var s = String(name == null ? '?' : name).trim();
    if (!s) return '?';
    if (s.length <= 3) return s.toUpperCase();
    var parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
  }

  function ensureTreeDefault() {
    var st = teamModule.storage;
    if (!st) return null;
    var tree = st.getTree();
    if (!tree) {
      tree = (global.treeEngine && global.treeEngine.defaultSeedTree) ? global.treeEngine.defaultSeedTree() : null;
      if (tree) st.saveTree(tree);
    }
    if (!st.getTreeFocus()) st.saveTreeFocus({ focusNodeId: tree && tree.id ? tree.id : 'eu' });
    return tree;
  }

  var teamModule = {
    storage: global.storageService || null,
    bus: global.eventBus || null,
    eng: global.binaryEngine || null,
    tEng: global.treeEngine || null,

    currentFocusId: 'eu',
    currentTree: null,

    init: function () {
      ensureTreeDefault.call(this);
      this.currentTree = this.storage ? this.storage.getTree() : null;
      var f = this.storage ? this.storage.getTreeFocus() : null;
      if (f && f.focusNodeId) this.currentFocusId = f.focusNodeId;

      if (this.bus) {
        var self = this;
        this.bus.on(EV.RENDER_REQUIRED, function () { self.render(); });
        this.bus.on(EV.DATA_RESET, function () { self.currentTree = self.storage ? self.storage.getTree() : null; self.currentFocusId = 'eu'; self.render(); });
        this.bus.on(EV.APPLICATION_CREATED, function () { self.render(); });
      }
    },

    getStats: function () {
      if (!this.eng || !this.storage) return null;
      var team = this.storage.getTeam() || {};
      var bin = this.storage.getBinary() || {};
      var wall = this.storage.getWallet() || {};
      var tree = this.currentTree || ensureTreeDefault.call(this);
      return this.eng.calcTeamStats(team, bin, wall, tree);
    },

    getFocusNode: function () {
      if (!this.tEng || !this.currentTree) return null;
      return this.tEng.findNodeById(this.currentTree, this.currentFocusId);
    },

    focusNode: function (nodeId) {
      if (!nodeId || !this.tEng || !this.currentTree) return;
      var target = this.tEng.findNodeById(this.currentTree, nodeId);
      if (!target) { showToast('Usuário não encontrado na rede', 'error'); return; }
      this.currentFocusId = nodeId;
      if (this.storage) this.storage.saveTreeFocus({ focusNodeId: nodeId });
      if (this.bus) this.bus.emit(EV.TREE_FOCUS_CHANGED || 'team:tree-focus-changed', { nodeId: nodeId });
      this.renderTree();
    },

    goBackToParent: function () {
      if (!this.tEng || !this.currentTree) return;
      var parent = this.tEng.findParentNode(this.currentTree, this.currentFocusId);
      if (!parent) { showToast('Você já está na raiz (Eu)', 'info'); return; }
      this.focusNode(parent.id);
    },

    goToRoot: function () { this.focusNode(this.currentTree ? this.currentTree.id : 'eu'); },

    doSearch: function (q) {
      var self = this;
      var box = el('team-search-results');
      if (!box) return;
      var query = String(q == null ? '' : q).trim();
      if (!query || !this.tEng || !this.currentTree) { box.classList.remove('open'); box.innerHTML = ''; return; }
      var list = this.tEng.searchNodes(this.currentTree, query).slice(0, 8);
      if (list.length === 0) {
        box.innerHTML = '<div class="sr-empty">Nenhum usuário encontrado</div>';
        box.classList.add('open');
        return;
      }
      box.innerHTML = list.map(function (n) {
        return '<div class="sr-item" data-id="' + esc(n.id) + '">' +
               '<div class="sr-avatar">' + esc(initials(n.name)) + '</div>' +
               '<div class="sr-info"><div class="sr-name">' + esc(n.name) + '</div><div class="sr-user">@' + esc(n.username) + ' · ' + fmt(n.amount) + '</div></div>' +
               '</div>';
      }).join('');
      box.classList.add('open');
      box.querySelectorAll('.sr-item').forEach(function (it) {
        it.addEventListener('click', function () {
          var id = it.getAttribute('data-id');
          box.classList.remove('open');
          var inp = el('team-search-input');
          if (inp) inp.value = '';
          self.focusNode(id);
        });
      });
    },

    buildTreeNodeHTML: function (node) {
      if (!node) node = { empty: true, name: 'Vaga', amount: 0 };
      var empty = !!node.empty || !node.active || Number(node.amount || 0) <= 0;
      var self = this;
      var isFocus = node.id === this.currentFocusId;
      var qual = this.eng ? this.eng.getQualificationStatus(node) : null;
      var hasChildren = !!node.left || !!node.right;

      var posClass = empty ? 'pos-empty' : (node.level === 0 ? 'pos-root' : (node.position === 'L' || String(node.position).endsWith('L') ? 'pos-left' : 'pos-right'));

      var caret = hasChildren && !empty ? '<span class="caret" title="Ver rede abaixo">↧</span>' : '';
      var tooltip = empty ? '' : (
        '<div class="binary-tooltip" style="display:none;" id="tip-' + esc(node.id) + '">' +
          '<div><strong>' + esc(node.name) + '</strong></div>' +
          '<div style="font-family:monospace;font-size:0.7rem;opacity:0.8;">@' + esc(node.username || '') + '</div>' +
          '<div style="margin-top:0.25rem;">Investimento: <strong>' + fmt(node.amount) + '</strong></div>' +
          (node.points ? '<div>Pts E: ' + esc(node.points.left || 0) + ' · D: ' + esc(node.points.right || 0) + '</div>' : '') +
          (qual ? '<div style="margin-top:0.35rem;color:' + (qual.qualified ? '#10B981' : '#F59E0B') + ';">' + esc(qual.text) + '</div>' : '') +
          (node.joinedAt ? '<div style="margin-top:0.25rem;opacity:0.6;">Entrada: ' + esc(node.joinedAt) + '</div>' : '') +
        '</div>'
      );

      var childrenHTML = '';
      if (!empty) {
        childrenHTML =
          '<div class="tree-node-children">' +
            '<div class="tree-child">' + this.buildTreeNodeHTML(node.left || { empty: true, name: 'Vaga E', amount: 0 }) + '</div>' +
            '<div class="tree-child">' + this.buildTreeNodeHTML(node.right || { empty: true, name: 'Vaga D', amount: 0 }) + '</div>' +
          '</div>';
      }

      var meta = empty ? '' : (
        '<div class="node-meta">' +
          '<div class="nm-name">' + esc(node.name) + '</div>' +
          (node.username ? '<div class="nm-user">@' + esc(node.username) + '</div>' : '') +
          '<div class="nm-vol">' + fmt(node.amount) + '</div>' +
        '</div>'
      );

      return (
        '<div class="tree-node-wrapper" data-node-id="' + esc(node.id || ('empty-' + Math.random().toString(36).slice(2, 7))) + '">' +
          '<div class="binary-node ' + (empty ? 'is-empty' : '') + ' ' + (isFocus ? 'is-focus' : '') + '" data-id="' + esc(node.id || '') + '" style="display:inline-flex;flex-direction:column;align-items:center;">' +
            '<div class="binary-avatar ' + posClass + '">' + esc(initials(empty ? '+' : node.name)) + caret + '</div>' +
            meta +
            tooltip +
          '</div>' +
          childrenHTML +
        '</div>'
      );
    },

    attachTreeEvents: function () {
      var self = this;
      var box = el('team-tree-viewport');
      if (!box) return;
      box.querySelectorAll('.binary-node[data-id]').forEach(function (nodeEl) {
        var id = nodeEl.getAttribute('data-id');
        if (!id) return;
        nodeEl.addEventListener('click', function (e) {
          e.stopPropagation();
          var tip = el('tip-' + id);
          if (tip) tip.style.display = 'none';
          self.focusNode(id);
        });
        nodeEl.addEventListener('mouseenter', function () {
          var tip = el('tip-' + id);
          if (!tip) return;
          var r = nodeEl.getBoundingClientRect();
          var br = box.getBoundingClientRect();
          tip.style.display = 'block';
          tip.style.left = Math.max(8, (r.left - br.left + box.scrollLeft) - 90) + 'px';
          tip.style.top = (r.bottom - br.top + box.scrollTop + 6) + 'px';
        });
        nodeEl.addEventListener('mouseleave', function () {
          var tip = el('tip-' + id);
          if (tip) tip.style.display = 'none';
        });
      });
    },

    renderTree: function () {
      var box = el('team-tree-viewport');
      if (!box) return;
      var focus = this.getFocusNode() || this.currentTree;
      var crumbBox = el('team-tree-breadcrumb');
      if (crumbBox && this.tEng && this.currentTree) {
        var path = this.tEng.getBreadcrumb(this.currentTree, this.currentFocusId) || [];
        var self = this;
        crumbBox.innerHTML = path.map(function (n, i) {
          var last = i === path.length - 1;
          return '<span class="crumb ' + (last ? 'current' : '') + '" data-crumb-id="' + esc(n.id) + '">' + esc(n.name) + '</span>' +
                 (last ? '' : '<span class="sep">›</span>');
        }).join('');
        crumbBox.querySelectorAll('.crumb:not(.current)').forEach(function (c) {
          c.addEventListener('click', function () { self.focusNode(c.getAttribute('data-crumb-id')); });
        });
        var btnBack = el('team-btn-back');
        if (btnBack) {
          var parent = self.tEng.findParentNode(self.currentTree, self.currentFocusId);
          btnBack.disabled = !parent;
        }
        var btnRoot = el('team-btn-root');
        if (btnRoot) btnRoot.disabled = self.currentFocusId === (self.currentTree && self.currentTree.id);
      }
      if (!focus) { box.innerHTML = '<div style="padding:2rem;text-align:center;color:#6B7280;">Sem dados da árvore</div>'; return; }
      var qInfo = this.eng ? this.eng.getQualificationStatus(focus) : null;
      var qLegs = this.tEng ? this.tEng.getDirectLegStatus(focus) : { leftActive: false, rightActive: false };
      var qualBox = el('team-qualification-badge');
      if (qualBox && qInfo) {
        qualBox.className = 'qualification-badge ' + (qInfo.qualified ? 'qualified' : 'not-qualified') + ' legs';
        qualBox.innerHTML =
          '<span>' + (qInfo.qualified ? '✅ Qualificado' : '⚠️ Em qualificação') + '</span>' +
          '<span class="leg-pill left ' + (qLegs.leftActive ? 'ok' : 'no') + '">Esq' + (qLegs.leftActive ? ' ✓' : '') + '</span>' +
          '<span class="leg-pill right ' + (qLegs.rightActive ? 'ok' : 'no') + '">Dir' + (qLegs.rightActive ? ' ✓' : '') + '</span>';
        qualBox.title = qInfo.text;
      }
      box.innerHTML = '<div class="tree-wrapper">' + this.buildTreeNodeHTML(focus) + '</div>';
      this.attachTreeEvents();
    },

    render: function () {
      var stats = this.getStats();
      if (!stats) return;

      var rc = el('team-direct-count'); if (rc) rc.textContent = stats.directCount;
      var rac = el('team-active-count'); if (rac) rac.textContent = stats.activeCount;
      var rlg = el('team-lesser-leg'); if (rlg) rlg.textContent = fmt(stats.lesserLeg);
      var rgr = el('team-greater-leg'); if (rgr) rgr.textContent = fmt(stats.greaterLeg);
      var rbp = el('team-binary-pending'); if (rbp) rbp.textContent = fmt(stats.pendingBinaryPayout);
      var rpt = el('team-payout-type');
      if (rpt) rpt.textContent = stats.payoutMode === 'FIXED' ? ('$' + Number(stats.fixedPayoutAmount || 0).toFixed(0) + ' fixos por rodada') : (Number((stats.eng && stats.eng.CONFIG && stats.eng.CONFIG.BINARY_PERCENTAGE) || TEAM_CFG.BINARY_PERCENTAGE || 0.10) * 100 + '% menor perna');
      var rpk = el('team-payout-skip');
      if (rpk) {
        if (!stats.payoutSkipped) { rpk.style.display = 'none'; }
        else {
          rpk.style.display = '';
          rpk.textContent = stats.payoutSkipReason === 'NOT_QUALIFIED' ? 'Binário bloqueado: complete a qualificação primeiro' : 'Sem pontos suficientes para rodar';
        }
      }
      var prog = stats.bonusProgress || {};
      var bp = el('team-bonus-progress'); if (bp) bp.style.width = prog.percentage + '%';
      var bpt = el('team-bonus-progress-text');
      if (bpt) bpt.textContent = prog.activeCount + ' / ' + prog.target + ' ativos · Bônus ' + fmt(prog.bonusAmount);

      var btnClaim = el('team-btn-claim-bonus');
      if (btnClaim) { btnClaim.disabled = !prog.eligible; btnClaim.textContent = prog.claimed ? 'Bônus resgatado' : (prog.eligible ? 'Resgatar Bônus de 10 Indicados' : ('Bloqueado: ' + prog.activeCount + '/' + prog.target)); }

      this.renderTree();
    },

    copyRefLink: function () {
      var u = this.storage && this.storage.getUser ? this.storage.getUser() : null;
      var uname = u && u.username ? u.username : 'g7investidor';
      var url = 'https://g7goldinvest.com/signup?ref=' + encodeURIComponent(uname);
      var ok = copyClip(url);
      showToast(ok ? 'Link de indicação copiado!' : 'Erro ao copiar link', ok ? 'success' : 'error');
    },

    claimTeamBonus: function () {
      var stats = this.getStats();
      if (!stats || !stats.bonusProgress || !stats.bonusProgress.eligible) { showToast('Bônus ainda não liberado', 'error'); return; }
      var team = this.storage.getTeam() || {};
      team.bonusClaimed = true;
      this.storage.saveTeam(team);
      var wall = this.storage.getWallet() || {};
      wall.bonusGains = Number(wall.bonusGains || 0) + stats.bonusProgress.bonusAmount;
      wall.availableWithdraw = Number(wall.availableWithdraw || 0) + stats.bonusProgress.bonusAmount;
      wall.totalGains = Number(wall.totalGains || 0) + stats.bonusProgress.bonusAmount;
      this.storage.saveWallet(wall);
      if (this.bus) {
        this.bus.emit(EV.BONUS_CLAIMED, { amount: stats.bonusProgress.bonusAmount });
        this.bus.emit(EV.WALLET_UPDATED, wall);
        this.bus.emit(EV.RENDER_REQUIRED);
      }
      showToast('Bônus de R$100 creditado!', 'success');
    },

    simAddReferral: function () {
      var side = Math.random() < 0.5 ? 'left' : 'right';
      var pts = 100 + Math.floor(Math.random() * 500);
      var team = this.storage.getTeam() || {};
      var t2 = this.eng.addReferral(team, pts);
      this.storage.saveTeam(t2);
      var bin = this.storage.getBinary() || {};
      var b2 = this.eng.addBinaryPoints(bin, side, pts);
      this.storage.saveBinary(b2);
      if (this.bus) { this.bus.emit(EV.REFERRAL_ADDED, { side: side, amount: pts }); this.bus.emit(EV.RENDER_REQUIRED); }
      showToast('Indicado simulado adicionado na ' + (side === 'left' ? 'Esquerda' : 'Direita') + ' com ' + fmt(pts), 'success');
    },

    simAddBinaryPoints: function () {
      var side = Math.random() < 0.5 ? 'left' : 'right';
      var pts = 100 + Math.floor(Math.random() * 1000);
      var bin = this.storage.getBinary() || {};
      var b2 = this.eng.addBinaryPoints(bin, side, pts);
      this.storage.saveBinary(b2);
      if (this.bus) this.bus.emit(EV.RENDER_REQUIRED);
      showToast(pts + ' pontos adicionados na ' + (side === 'left' ? 'Esquerda' : 'Direita'), 'success');
    },

    processBinaryPayout: function () {
      var bin = this.storage.getBinary() || { leftPoints: 0, rightPoints: 0 };
      var tree = this.currentTree || (this.storage && this.storage.getTree());
      var qual = this.eng.getQualificationStatus(tree);
      var result = this.eng.calcBinaryPayout(bin.leftPoints, bin.rightPoints, { qualified: qual.qualified });
      if (result.skipped) {
        showToast(result.skipReason === 'NOT_QUALIFIED' ? 'Você ainda não está qualificado. Cadastre 1 ativo em cada perna.' : 'Sem pontos suficientes para rodar o binário', 'warning');
        return;
      }
      this.storage.saveBinary({ leftPoints: result.newLeft, rightPoints: result.newRight });
      var wall = this.storage.getWallet() || {};
      wall.teamGains = Number(wall.teamGains || 0) + result.payout;
      wall.availableWithdraw = Number(wall.availableWithdraw || 0) + result.payout;
      wall.totalGains = Number(wall.totalGains || 0) + result.payout;
      this.storage.saveWallet(wall);
      if (this.bus) {
        this.bus.emit(EV.BINARY_PAYOUT_PROCESSED, result);
        this.bus.emit(EV.WALLET_UPDATED, wall);
        this.bus.emit(EV.RENDER_REQUIRED);
      }
      showToast('Binário processado! ' + fmt(result.payout) + ' creditados.', 'success');
    }
  };

  global.teamModule = teamModule;

  document.addEventListener && document.addEventListener('DOMContentLoaded', function () {
    var inp = el('team-search-input');
    if (inp) {
      var tm;
      inp.addEventListener('input', function () {
        clearTimeout(tm);
        var v = inp.value;
        tm = setTimeout(function () { teamModule.doSearch(v); }, 180);
      });
      inp.addEventListener('focus', function () { if (inp.value) teamModule.doSearch(inp.value); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var box = el('team-search-results'); if (box) box.classList.remove('open'); } });
    }
    document.addEventListener('click', function (e) {
      var wrap = document.querySelector('.team-search');
      if (!wrap) return;
      if (!wrap.contains(e.target)) {
        var box = el('team-search-results');
        if (box) box.classList.remove('open');
      }
    });
    var bBack = el('team-btn-back'); if (bBack) bBack.addEventListener('click', function () { teamModule.goBackToParent(); });
    var bRoot = el('team-btn-root'); if (bRoot) bRoot.addEventListener('click', function () { teamModule.goToRoot(); });
  });
})(window);
