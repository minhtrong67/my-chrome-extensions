// LockSmith Landing Page Interactive Logic

document.addEventListener("DOMContentLoaded", () => {
  // ── Theme Switcher ──
  const themeToggle = document.getElementById("themeToggle");
  const themeIconSun = document.getElementById("themeIconSun");
  const themeIconMoon = document.getElementById("themeIconMoon");

  const savedTheme = localStorage.getItem("locksmith_landing_theme") || 
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("locksmith_landing_theme", theme);
    if (theme === "dark") {
      themeIconSun.style.display = "block";
      themeIconMoon.style.display = "none";
    } else {
      themeIconSun.style.display = "none";
      themeIconMoon.style.display = "block";
    }
  }

  applyTheme(savedTheme);

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });

  // ── Toast System ──
  const toast = document.getElementById("landingToast");
  const toastMsg = document.getElementById("toastMsg");
  let toastTimer = null;

  function showToast(msg) {
    toastMsg.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  // ── Gallery Showcase ──
  const galleryTabs = document.querySelectorAll(".gallery-tab-btn");
  const galleryImg = document.getElementById("galleryImg");
  const galleryCaption = document.getElementById("galleryCaption");

  const galleryData = {
    "image01": {
      src: "../screenshots/image01.png",
      caption: "Chế độ Tạo Mật Khẩu (Giao diện Sáng - Material Design 3) với thanh đo độ mạnh và ước tính thời gian bẻ khóa trực tiếp"
    },
    "image02": {
      src: "../screenshots/image02.png",
      caption: "Chế độ Giao Diện Tối (Dark Mode M3) với màu sắc dịu mắt, độ tương phản chuẩn xác và tone xanh ngọc đặc trưng"
    },
    "image03": {
      src: "../screenshots/image03.png",
      caption: "Chế độ Cụm Mật Khẩu (Passphrase) dùng 2048 từ chuẩn BIP-39 — cực kỳ dễ nhớ nhưng đạt 1.200+ tỷ năm để bẻ khóa"
    },
    "image04": {
      src: "../screenshots/image04.png",
      caption: "Chế độ Mã PIN cho khóa số, thẻ ATM, SIM điện thoại với thuật toán sinh ngẫu nhiên bảo mật chuẩn Web Crypto"
    },
    "image05": {
      src: "../screenshots/image05.png",
      caption: "Menu Cài Đặt đa dạng: tùy biến chủ đề, cỡ chữ, song ngữ Anh - Việt, quản lý xuất nhập dữ liệu và chính sách quyền riêng tư"
    }
  };

  galleryTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      galleryTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const key = tab.getAttribute("data-img");
      const item = galleryData[key];
      if (item) {
        galleryImg.style.opacity = "0.4";
        setTimeout(() => {
          galleryImg.src = item.src;
          galleryCaption.textContent = item.caption;
          galleryImg.style.opacity = "1";
        }, 150);
      }
    });
  });

  // ── Live Interactive Generator Demo ──
  let demoMode = "password"; // password | passphrase | pin

  const demoTabs = document.querySelectorAll(".demo-tab");
  const demoDisplay = document.getElementById("demoDisplay");
  const demoCopyBtn = document.getElementById("demoCopyBtn");
  const demoRegenBtn = document.getElementById("demoRegenBtn");
  const demoBarFill = document.getElementById("demoBarFill");
  const demoStrengthText = document.getElementById("demoStrengthText");
  const demoCrackText = document.getElementById("demoCrackText");
  const btnGenerateDemo = document.getElementById("btnGenerateDemo");

  // Controls
  const demoPasswordControls = document.getElementById("demoPasswordControls");
  const demoPassphraseControls = document.getElementById("demoPassphraseControls");
  const demoPinControls = document.getElementById("demoPinControls");

  // Sliders
  const demoLengthSlider = document.getElementById("demoLengthSlider");
  const demoLengthVal = document.getElementById("demoLengthVal");
  const demoWordSlider = document.getElementById("demoWordSlider");
  const demoWordVal = document.getElementById("demoWordVal");
  const demoPinSlider = document.getElementById("demoPinSlider");
  const demoPinVal = document.getElementById("demoPinVal");

  // Toggles
  const demoUpper = document.getElementById("demoUpper");
  const demoLower = document.getElementById("demoLower");
  const demoNumbers = document.getElementById("demoNumbers");
  const demoSymbols = document.getElementById("demoSymbols");
  const demoCapitalize = document.getElementById("demoCapitalize");
  const demoAddNum = document.getElementById("demoAddNum");

  // Update slider displays
  demoLengthSlider.addEventListener("input", (e) => {
    demoLengthVal.textContent = e.target.value;
    generateDemoValue();
  });
  demoWordSlider.addEventListener("input", (e) => {
    demoWordVal.textContent = e.target.value;
    generateDemoValue();
  });
  demoPinSlider.addEventListener("input", (e) => {
    demoPinVal.textContent = e.target.value;
    generateDemoValue();
  });

  // Checkboxes
  [demoUpper, demoLower, demoNumbers, demoSymbols, demoCapitalize, demoAddNum].forEach(el => {
    el.addEventListener("change", generateDemoValue);
  });

  // Tabs
  demoTabs.forEach(t => {
    t.addEventListener("click", () => {
      demoTabs.forEach(tab => tab.classList.remove("active"));
      t.classList.add("active");
      demoMode = t.getAttribute("data-mode");

      demoPasswordControls.style.display = demoMode === "password" ? "flex" : "none";
      demoPassphraseControls.style.display = demoMode === "passphrase" ? "flex" : "none";
      demoPinControls.style.display = demoMode === "pin" ? "flex" : "none";

      generateDemoValue();
    });
  });

  function generateDemoValue() {
    let result = "";
    let strengthScore = 4; // 0..4
    let crackTime = "1,000+ tỷ năm";

    if (demoMode === "password") {
      const len = parseInt(demoLengthSlider.value, 10);
      let pool = "";
      if (demoUpper.checked) pool += "ABCDEFGHJKLMNPQRSTUVWXYZ";
      if (demoLower.checked) pool += "abcdefghijkmnopqrstuvwxyz";
      if (demoNumbers.checked) pool += "23456789";
      if (demoSymbols.checked) pool += "!@#$%^&*()_+-=";
      if (!pool) pool = "abcdefghijkmnopqrstuvwxyz";

      const arr = new Uint32Array(len);
      window.crypto.getRandomValues(arr);
      for (let i = 0; i < len; i++) {
        result += pool[arr[i] % pool.length];
      }

      if (len < 8) {
        strengthScore = 0;
        crackTime = "Vài giây";
      } else if (len < 12) {
        strengthScore = 2;
        crackTime = "3 tháng";
      } else if (len < 16) {
        strengthScore = 3;
        crackTime = "14.000 năm";
      } else {
        strengthScore = 4;
        crackTime = "840+ tỷ năm";
      }
    } else if (demoMode === "passphrase") {
      const words = (typeof BIP39_WORDS !== "undefined") ? BIP39_WORDS : [
        "solar", "breeze", "shield", "echo", "beacon", "timber", "vivid", "summit", 
        "pulse", "harbor", "canyon", "galaxy", "silver", "falcon", "drift", "ember"
      ];
      const count = parseInt(demoWordSlider.value, 10);
      const chosen = [];
      const arr = new Uint32Array(count);
      window.crypto.getRandomValues(arr);

      for (let i = 0; i < count; i++) {
        let w = words[arr[i] % words.length];
        if (demoCapitalize.checked) {
          w = w.charAt(0).toUpperCase() + w.slice(1);
        }
        chosen.push(w);
      }
      result = chosen.join("-");
      if (demoAddNum.checked) {
        const numArr = new Uint8Array(1);
        window.crypto.getRandomValues(numArr);
        result += "-" + (numArr[0] % 90 + 10);
      }

      strengthScore = count >= 4 ? 4 : 3;
      crackTime = count >= 5 ? "1.500+ tỷ năm" : (count === 4 ? "420+ tỷ năm" : "800 năm");
    } else if (demoMode === "pin") {
      const digits = parseInt(demoPinSlider.value, 10);
      const arr = new Uint8Array(digits);
      window.crypto.getRandomValues(arr);
      const pinChars = [];
      for (let i = 0; i < digits; i++) {
        pinChars.push(arr[i] % 10);
      }
      result = pinChars.join(" ");
      strengthScore = digits >= 8 ? 3 : (digits >= 6 ? 2 : 1);
      crackTime = digits >= 8 ? "2 ngày" : (digits >= 6 ? "11 phút" : "Tức thì");
    }

    demoDisplay.textContent = result;

    // Update meter
    const pcts = [15, 35, 60, 85, 100];
    const colors = ["var(--md-error)", "var(--md-error)", "var(--md-warning)", "var(--md-success)", "var(--md-success)"];
    const labels = ["Rất yếu", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"];

    demoBarFill.style.width = pcts[strengthScore] + "%";
    demoBarFill.style.background = colors[strengthScore];
    demoStrengthText.textContent = labels[strengthScore];
    demoStrengthText.style.color = colors[strengthScore];
    demoCrackText.textContent = `Bẻ khóa: ${crackTime}`;
  }

  // Buttons
  demoCopyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(demoDisplay.textContent.replace(/\s+/g, "")).then(() => {
      showToast("Đã sao chép mật khẩu vào bộ nhớ tạm!");
    });
  });

  demoRegenBtn.addEventListener("click", generateDemoValue);
  btnGenerateDemo.addEventListener("click", generateDemoValue);

  // Initial demo generation
  generateDemoValue();
});
