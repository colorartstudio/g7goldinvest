(function (global) {
  'use strict';

  var _C = global.CONTRACTS || {};
  var EV = _C.EVENTS || {};

  function el(id) { return document.getElementById(id); }

  var settingsModule = {
    storage: global.storageService || null,
    bus: global.eventBus || null,
    ui: global.ui || null,

    init: function () {
      if (this.bus) {
        this.bus.on(EV.RENDER_REQUIRED, this.render.bind(this));
        this.bus.on(EV.DATA_RESET, this.render.bind(this));
      }
    },

    render: function () {
      if (!this.storage) return;
      var user = this.storage.getUser() || {};
      var eName = el('settingName');
      var eUser = el('settingUsername');
      var eEmail = el('settingEmail');
      var eWallet = el('settingWalletAddress');
      if (eName) eName.value = user.name || '';
      if (eUser) eUser.value = user.username || '';
      if (eEmail) eEmail.value = user.email || '';
      if (eWallet) eWallet.value = user.walletAddress || '';
    },

    saveProfileSettings: function () {
      if (!this.storage || !this.bus || !this.ui) return;
      var user = this.storage.getUser() || {};
      var eName = el('settingName');
      var eUser = el('settingUsername');
      var eEmail = el('settingEmail');
      if (eName) user.name = eName.value;
      if (eUser) user.username = eUser.value;
      if (eEmail) user.email = eEmail.value;
      this.storage.saveUser(user);
      this.bus.emit(EV.RENDER_REQUIRED);
      this.ui.showToast('Dados de perfil salvos com sucesso!', 'success');
    },

    saveWalletAddress: function () {
      if (!this.storage || !this.bus || !this.ui) return;
      var user = this.storage.getUser() || {};
      var eWallet = el('settingWalletAddress');
      if (eWallet) user.walletAddress = eWallet.value;
      this.storage.saveUser(user);
      this.bus.emit(EV.WALLET_UPDATED, this.storage.getWallet());
      this.bus.emit(EV.RENDER_REQUIRED);
      this.ui.showToast('Endereço de carteira USDT BEP-20 atualizado!', 'success');
    }
  };

  global.settingsModule = settingsModule;
})(window);
