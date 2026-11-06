window.RT_TEMPLATE = `<div id="app" class="app">
  <aside id="panelL" class="panel left">
    <div class="p-head">
      <div class="btn-group nav-group">
        <button class="btn-icon" id="btnBack" data-icon="arrow_back" data-i18n-title="back"></button>
        <button class="btn-icon" id="btnFwd" data-icon="arrow_forward" data-i18n-title="forward"></button>
        <button class="btn-icon" id="btnReload" data-icon="refresh" data-i18n-title="reload"></button>
      </div>
      <div class="p-actions">
        <button class="icon-btn" id="btnSettings" data-icon="settings" data-i18n-title="settings"></button>
        <button class="icon-btn" id="btnPanel" data-icon="menu_open" data-i18n-title="menu"></button>
        <button class="icon-btn close-btn" id="btnClose" data-icon="close" data-i18n-title="closeSim"></button>
      </div>
    </div>
    <div class="urlbar">
      <span class="urlbar-lead" data-icon="public"></span>
      <input id="urlInput" type="text" spellcheck="false" autocomplete="off" data-i18n-ph="urlPlaceholder">
      <button class="go-btn" id="btnGo" data-icon="arrow_forward" data-i18n-title="reload"></button>
    </div>

    <section class="ctl">
      <div class="cur"><span class="cur-ic" id="chipIcon" data-icon="mobile"></span><div class="cur-t"><b id="chipName"></b><span class="vpi" id="vpInfo"></span></div></div>
      <div class="btn-group seg" id="modeSeg">
        <button data-mode="single"><span data-icon="mobile"></span><span data-i18n="single"></span></button>
        <button data-mode="compare" data-key="C"><span data-icon="compare"></span><span data-i18n="compare"></span></button>
      </div>
      <div class="row-dim">
        <div class="dim">
          <input id="inW" type="number" min="100" max="5000" aria-label="Width">
          <span class="x">×</span>
          <input id="inH" type="number" min="100" max="5000" aria-label="Height">
        </div>
        <div id="selDpr" class="select sm" data-label="Pixel ratio"></div>
        <button class="icon-btn" id="btnRotate" data-key="R" data-icon="crop_rotate" data-i18n-title="rotate"></button>
      </div>
      <div class="zoom">
        <button class="icon-btn sm" id="btnZoomOut" data-icon="zoom_out" data-i18n-title="zoomOut"></button>
        <button class="chip-btn fit" id="btnFit" data-key="F" data-i18n-title="fit"><span data-icon="fit_screen"></span><span id="zoomLabel">Fit</span></button>
        <button class="icon-btn sm" id="btnZoomIn" data-icon="zoom_in" data-i18n-title="zoomIn"></button>
      </div>
    </section>

    <section class="card">
      <div class="sec-title" data-i18n="breakpoints"></div>
      <div class="chips bp wrap" id="bpChips"></div>
    </section>

    <section class="card">
      <div class="tgrid">
        <button class="tbtn toggle" id="btnTouch"><span data-icon="touch_app"></span><span class="lbl" data-i18n="touch"></span></button>
        <button class="tbtn toggle" id="btnFrame"><span data-icon="devices_fold"></span><span class="lbl" data-i18n="frame"></span></button>
        <button class="tbtn toggle" id="btnScroll"><span data-icon="swap_vert"></span><span class="lbl" data-i18n="scrollbar"></span></button>
        <button class="tbtn toggle" id="btnGrid"><span data-icon="grid_view"></span><span class="lbl" data-i18n="gridOverlay"></span></button>
        <button class="tbtn" id="btnShot" data-key="S"><span data-icon="photo_camera"></span><span class="lbl" data-i18n="screenshot"></span></button>
        <button class="tbtn" id="btnShotFull"><span data-icon="fullscreen"></span><span class="lbl" data-i18n="fullPage"></span></button>
        <div class="rec-wrap">
          <button class="tbtn rec" id="btnRec"><span data-icon="videocam"></span><span class="lbl" data-i18n="record"></span></button>
          <div class="menu" id="recMenu" hidden>
            <div class="menu-title" data-i18n="recordAs"></div>
            <button data-fmt="gif"><span data-icon="gif_box"></span>GIF</button>
            <button data-fmt="webm"><span data-icon="movie"></span>WebM</button>
            <button data-fmt="mp4"><span data-icon="movie"></span>MP4</button>
          </div>
        </div>
        <button class="tbtn" id="btnQr"><span data-icon="qr_code_2"></span><span class="lbl" data-i18n="qrTitle"></span></button>
        <button class="tbtn" id="btnPop"><span data-icon="open_in_new"></span><span class="lbl" data-i18n="popout"></span></button>
      </div>
    </section>
    <div class="rz" data-side="l"></div>
  </aside>

  <main id="stage" class="stage">
    <button class="icon-btn reopen rl" id="btnReopenL" data-icon="menu" data-i18n-title="menu"></button>
    <button class="icon-btn reopen rr" id="btnReopenR" data-icon="devices" data-i18n-title="devices"></button>
    <div id="canvas" class="canvas"></div>
    <div id="empty" class="empty">
      <div class="empty-art"><span></span><span></span><span></span></div>
      <h2 data-i18n="emptyTitle"></h2>
      <p data-i18n="emptyBody"></p>
    </div>
  </main>

  <aside id="panelR" class="panel right">
    <div class="p-head">
      <span class="brand-mark" data-icon="devices"></span>
      <b class="ptitle" data-i18n="devices"></b>
      <span class="grow"></span>
      <button class="icon-btn tonal" id="btnAddDevice" data-icon="add" data-i18n-title="addDevice"></button>
      <button class="icon-btn flip" id="btnPanelR" data-icon="menu_open" data-i18n-title="menu"></button>
    </div>
    <label class="search"><span data-icon="search"></span><input id="devSearch" type="search" data-i18n-ph="search" autocomplete="off"></label>
    <div class="chips" id="filterChips"></div>
    <div class="chips sets" id="setRow" hidden></div>
    <div class="list-wrap"><div class="dev-list" id="devList"></div></div>
    <div class="rz" data-side="r"></div>
  </aside>
  <div class="scrim" id="panelScrim"></div>
  <div id="tip" class="tip" role="tooltip"></div>

  <div id="toasts" class="toasts" aria-live="polite"></div>

    <dialog id="dlgSet" class="dialog sm">
    <form method="dialog" id="setForm" class="dlg-form">
      <div class="dlg-head"><h2 data-i18n="saveSet"></h2><button type="button" class="icon-btn" data-close data-icon="close" data-i18n-title="close"></button></div>
      <label class="field"><span data-i18n="name"></span><input id="setName" required maxlength="28"></label>
      <div class="dlg-actions"><span class="grow"></span><button type="button" class="btn text" data-close><span data-i18n="cancel"></span></button><button type="submit" class="btn filled"><span data-i18n="save"></span></button></div>
    </form>
  </dialog>

  <dialog id="dlgQr" class="dialog sm">
    <div class="dlg-head"><h2 data-i18n="qrTitle"></h2><button type="button" class="icon-btn" data-close data-icon="close" data-i18n-title="close"></button></div>
    <div class="qr-body"><div class="qr-box" id="qrBox"></div><p class="qr-url" id="qrUrl"></p><p class="qr-note" id="qrNote"></p></div>
  </dialog>

  <dialog id="dlgTour" class="dialog">
    <div class="dlg-head"><h2 data-i18n="tourTitle"></h2><button type="button" class="icon-btn" data-close data-icon="close" data-i18n-title="close"></button></div>
    <div class="tour-body" id="tourBody"></div>
    <div class="dlg-actions tour-act"><span class="grow"></span><button type="button" class="btn filled" data-close><span data-i18n="gotIt"></span></button></div>
  </dialog>
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
        <div class="field"><span data-i18n="type"></span><div id="dType" class="select"></div></div>
      </div>
      <div class="field"><span data-i18n="os"></span><div id="dOs" class="select"></div></div>
      <div class="dlg-actions">
        <button type="button" class="btn text danger" id="dDelete"><span data-i18n="delete"></span></button>
        <span class="grow"></span>
        <button type="button" class="btn text" data-close><span data-i18n="cancel"></span></button>
        <button type="submit" class="btn filled"><span data-i18n="save"></span></button>
      </div>
    </form>
  </dialog>
</div>`;
