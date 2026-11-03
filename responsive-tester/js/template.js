window.RT_TEMPLATE = `<div id="app" class="app">
  <header class="appbar">
    <div class="brand"><span class="brand-mark" data-icon="devices"></span><span class="brand-name" data-i18n="appName"></span></div>
    <div class="btn-group nav-group">
      <button class="btn-icon" id="btnBack" data-icon="arrow_back" data-i18n-title="back"></button>
      <button class="btn-icon" id="btnFwd" data-icon="arrow_forward" data-i18n-title="forward"></button>
      <button class="btn-icon" id="btnReload" data-icon="refresh" data-i18n-title="reload"></button>
    </div>
    <div class="urlbar">
      <span class="urlbar-lead" data-icon="public"></span>
      <input id="urlInput" type="text" spellcheck="false" autocomplete="off" data-i18n-ph="urlPlaceholder">
      <button class="go-btn" id="btnGo" data-icon="arrow_forward" data-i18n-title="reload"></button>
    </div>
    <button class="icon-btn toggle" id="btnPanel" data-icon="menu_open" data-i18n-title="menu"></button>
    <button class="icon-btn" id="btnSettings" data-icon="settings" data-i18n-title="settings"></button>
    <button class="icon-btn close-btn" id="btnClose" data-icon="close" data-i18n-title="closeSim"></button>
  </header>

  <aside id="panel" class="panel">
    <div class="btn-group seg" id="modeSeg">
      <button data-mode="single"><span data-icon="mobile"></span><span data-i18n="single"></span></button>
      <button data-mode="compare"><span data-icon="compare"></span><span data-i18n="compare"></span></button>
    </div>
    <label class="search"><span data-icon="search"></span><input id="devSearch" type="search" data-i18n-ph="search" autocomplete="off"></label>
    <div class="chips" id="filterChips"></div>
    <div class="bp-block">
      <div class="sec-title" data-i18n="breakpoints"></div>
      <div class="chips bp" id="bpChips"></div>
    </div>
    <div class="dev-list" id="devList"></div>
    <button class="fab-ext" id="btnAddDevice"><span data-icon="add"></span><span data-i18n="addDevice"></span></button>
  </aside>
  <div class="scrim" id="panelScrim"></div>

  <main id="stage" class="stage">
    <div id="canvas" class="canvas"></div>
    <div id="empty" class="empty">
      <div class="empty-art"><span></span><span></span><span></span></div>
      <h2 data-i18n="emptyTitle"></h2>
      <p data-i18n="emptyBody"></p>
    </div>

    <div id="toolbar" class="ftoolbar" role="toolbar">
      <button class="chip-btn" id="btnDeviceChip"><span data-icon="mobile" id="chipIcon"></span><span id="chipName"></span></button>
      <div class="dim">
        <input id="inW" type="number" min="100" max="5000" aria-label="Width">
        <span class="x">×</span>
        <input id="inH" type="number" min="100" max="5000" aria-label="Height">
      </div>
      <select id="selDpr" class="dpr" aria-label="Pixel ratio"></select>
      <button class="icon-btn" id="btnRotate" data-icon="crop_rotate" data-i18n-title="rotate"></button>
      <span class="vr"></span>
      <div class="zoom">
        <button class="icon-btn sm" id="btnZoomOut" data-icon="zoom_out" data-i18n-title="zoomOut"></button>
        <button class="chip-btn fit" id="btnFit"><span data-icon="fit_screen"></span><span id="zoomLabel">Fit</span></button>
        <button class="icon-btn sm" id="btnZoomIn" data-icon="zoom_in" data-i18n-title="zoomIn"></button>
      </div>
      <span class="vr"></span>
      <button class="icon-btn toggle" id="btnTouch" data-icon="touch_app" data-i18n-title="touch"></button>
      <button class="icon-btn toggle" id="btnFrame" data-icon="devices_fold" data-i18n-title="frame"></button>
      <span class="vr"></span>
      <button class="icon-btn" id="btnShot" data-icon="photo_camera" data-i18n-title="screenshot"></button>
      <div class="rec-wrap">
        <button class="icon-btn rec" id="btnRec" data-icon="videocam" data-i18n-title="record"></button>
        <div class="menu" id="recMenu" hidden>
          <div class="menu-title" data-i18n="recordAs"></div>
          <button data-fmt="gif"><span data-icon="gif_box"></span>GIF</button>
          <button data-fmt="webm"><span data-icon="movie"></span>WebM</button>
          <button data-fmt="mp4"><span data-icon="movie"></span>MP4</button>
        </div>
      </div>
    </div>
  </main>

  <div id="toasts" class="toasts" aria-live="polite"></div>

  <dialog id="dlgSettings" class="dialog">
    <div class="dlg-head"><h2 data-i18n="settings"></h2><button class="icon-btn" data-close data-icon="close" data-i18n-title="close"></button></div>
    <div class="dlg-body" id="settingsBody"></div>
  </dialog>

  <dialog id="dlgDevice" class="dialog sm">
    <form method="dialog" id="deviceForm" class="dlg-form">
      <div class="dlg-head"><h2 id="deviceTitle"></h2><button type="button" class="icon-btn" data-close data-icon="close" data-i18n-title="close"></button></div>
      <label class="field"><span data-i18n="name"></span><input id="dName" required maxlength="40"></label>
      <div class="row2">
        <label class="field"><span data-i18n="width"></span><input id="dW" type="number" min="100" max="5000" required></label>
        <label class="field"><span data-i18n="height"></span><input id="dH" type="number" min="100" max="5000" required></label>
      </div>
      <div class="row2">
        <label class="field"><span data-i18n="dpr"></span><input id="dDpr" type="number" min="1" max="5" step="0.05" value="2" required></label>
        <label class="field"><span data-i18n="type"></span>
          <select id="dType"><option value="phone" data-i18n="phone"></option><option value="tablet" data-i18n="tablet"></option><option value="desktop" data-i18n="desktop"></option><option value="watch" data-i18n="watch"></option></select></label>
      </div>
      <label class="field"><span data-i18n="os"></span>
        <select id="dOs"><option value="android" data-i18n="android"></option><option value="ios" data-i18n="ios"></option><option value="other" data-i18n="other"></option></select></label>
      <div class="dlg-actions">
        <button type="button" class="btn text danger" id="dDelete"><span data-i18n="delete"></span></button>
        <span class="grow"></span>
        <button type="button" class="btn text" data-close><span data-i18n="cancel"></span></button>
        <button type="submit" class="btn filled"><span data-i18n="save"></span></button>
      </div>
    </form>
  </dialog>
</div>`;
