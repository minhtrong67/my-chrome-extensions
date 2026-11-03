'use strict';
/* Viewport sizes are CSS pixels in portrait. cutout: island | notch | punch | home | none */
(function () {
  const L = [];
  const d = (id, name, group, type, os, w, h, dpr, cutout, r) =>
    L.push({ id, name, group, type, os, w, h, dpr, cutout: cutout || 'none', r: r == null ? 0 : r });

  // Apple iPhone
  const IP = 'Apple iPhone';
  d('iphone-17-pro-max', 'iPhone 17 Pro Max', IP, 'phone', 'ios', 440, 956, 3, 'island', 62);
  d('iphone-17-pro', 'iPhone 17 Pro', IP, 'phone', 'ios', 402, 874, 3, 'island', 58);
  d('iphone-17', 'iPhone 17', IP, 'phone', 'ios', 402, 874, 3, 'island', 58);
  d('iphone-air', 'iPhone Air', IP, 'phone', 'ios', 420, 912, 3, 'island', 60);
  d('iphone-16-pro-max', 'iPhone 16 Pro Max', IP, 'phone', 'ios', 440, 956, 3, 'island', 62);
  d('iphone-16-pro', 'iPhone 16 Pro', IP, 'phone', 'ios', 402, 874, 3, 'island', 58);
  d('iphone-16-plus', 'iPhone 16 Plus', IP, 'phone', 'ios', 430, 932, 3, 'island', 55);
  d('iphone-16', 'iPhone 16', IP, 'phone', 'ios', 393, 852, 3, 'island', 55);
  d('iphone-16e', 'iPhone 16e', IP, 'phone', 'ios', 390, 844, 3, 'notch', 47);
  d('iphone-15-pro-max', 'iPhone 15 Pro Max', IP, 'phone', 'ios', 430, 932, 3, 'island', 55);
  d('iphone-15-pro', 'iPhone 15 Pro', IP, 'phone', 'ios', 393, 852, 3, 'island', 55);
  d('iphone-15', 'iPhone 15', IP, 'phone', 'ios', 393, 852, 3, 'island', 55);
  d('iphone-14-pro-max', 'iPhone 14 Pro Max', IP, 'phone', 'ios', 430, 932, 3, 'island', 55);
  d('iphone-14-pro', 'iPhone 14 Pro', IP, 'phone', 'ios', 393, 852, 3, 'island', 55);
  d('iphone-14-plus', 'iPhone 14 Plus', IP, 'phone', 'ios', 428, 926, 3, 'notch', 47);
  d('iphone-14', 'iPhone 14', IP, 'phone', 'ios', 390, 844, 3, 'notch', 47);
  d('iphone-13-mini', 'iPhone 13 mini', IP, 'phone', 'ios', 375, 812, 3, 'notch', 44);
  d('iphone-13', 'iPhone 13 / 12', IP, 'phone', 'ios', 390, 844, 3, 'notch', 47);
  d('iphone-11-pro-max', 'iPhone 11 Pro Max', IP, 'phone', 'ios', 414, 896, 3, 'notch', 40);
  d('iphone-11', 'iPhone 11', IP, 'phone', 'ios', 414, 896, 2, 'notch', 40);
  d('iphone-x', 'iPhone X / XS', IP, 'phone', 'ios', 375, 812, 3, 'notch', 40);
  d('iphone-se-3', 'iPhone SE (3rd gen)', IP, 'phone', 'ios', 375, 667, 2, 'home', 0);
  d('iphone-8-plus', 'iPhone 8 Plus', IP, 'phone', 'ios', 414, 736, 3, 'home', 0);
  d('iphone-se-1', 'iPhone SE (1st gen)', IP, 'phone', 'ios', 320, 568, 2, 'home', 0);

  // Google Pixel
  const PX = 'Google Pixel';
  d('pixel-10-pro-xl', 'Pixel 10 Pro XL', PX, 'phone', 'android', 448, 998, 3, 'punch', 34);
  d('pixel-10', 'Pixel 10', PX, 'phone', 'android', 412, 923, 2.625, 'punch', 32);
  d('pixel-9-pro-xl', 'Pixel 9 Pro XL', PX, 'phone', 'android', 448, 998, 3, 'punch', 34);
  d('pixel-9', 'Pixel 9', PX, 'phone', 'android', 412, 923, 2.625, 'punch', 32);
  d('pixel-8-pro', 'Pixel 8 Pro', PX, 'phone', 'android', 448, 998, 3, 'punch', 34);
  d('pixel-8', 'Pixel 8', PX, 'phone', 'android', 412, 915, 2.625, 'punch', 32);
  d('pixel-7', 'Pixel 7', PX, 'phone', 'android', 412, 915, 2.625, 'punch', 32);
  d('pixel-6', 'Pixel 6', PX, 'phone', 'android', 412, 915, 2.625, 'punch', 30);
  d('pixel-5', 'Pixel 5', PX, 'phone', 'android', 393, 851, 2.75, 'punch', 24);

  // Samsung Galaxy
  const SG = 'Samsung Galaxy';
  d('galaxy-s25-ultra', 'Galaxy S25 Ultra', SG, 'phone', 'android', 412, 891, 3.5, 'punch', 28);
  d('galaxy-s25-plus', 'Galaxy S25+', SG, 'phone', 'android', 384, 832, 3.75, 'punch', 34);
  d('galaxy-s25', 'Galaxy S25', SG, 'phone', 'android', 360, 780, 3, 'punch', 34);
  d('galaxy-s24-ultra', 'Galaxy S24 Ultra', SG, 'phone', 'android', 384, 824, 3.75, 'punch', 28);
  d('galaxy-s24', 'Galaxy S24', SG, 'phone', 'android', 360, 780, 3, 'punch', 34);
  d('galaxy-s23', 'Galaxy S23', SG, 'phone', 'android', 360, 780, 3, 'punch', 34);
  d('galaxy-s20-ultra', 'Galaxy S20 Ultra', SG, 'phone', 'android', 412, 915, 3.5, 'punch', 28);
  d('galaxy-a55', 'Galaxy A55', SG, 'phone', 'android', 360, 780, 3, 'punch', 28);
  d('galaxy-a54', 'Galaxy A54', SG, 'phone', 'android', 412, 915, 2.625, 'punch', 28);
  d('galaxy-s8-plus', 'Galaxy S8+', SG, 'phone', 'android', 360, 740, 4, 'none', 30);
  d('galaxy-s5', 'Galaxy S5', SG, 'phone', 'android', 360, 640, 3, 'home', 0);

  // Other Android
  const OA = 'Other Android';
  d('redmi-note-13', 'Xiaomi Redmi Note 13', OA, 'phone', 'android', 393, 873, 2.75, 'punch', 26);
  d('oneplus-12', 'OnePlus 12', OA, 'phone', 'android', 450, 990, 3.2, 'punch', 32);
  d('android-small', 'Small Android (320)', OA, 'phone', 'android', 320, 658, 2, 'none', 18);
  d('android-compact', 'Compact Android', OA, 'phone', 'android', 360, 640, 2, 'none', 18);

  // Foldables
  const FO = 'Foldables';
  d('galaxy-fold-cover', 'Galaxy Fold (folded)', FO, 'foldable', 'android', 280, 653, 3, 'none', 22);
  d('zfold-cover', 'Galaxy Z Fold (cover screen)', FO, 'foldable', 'android', 344, 882, 2.625, 'punch', 28);
  d('zfold-inner', 'Galaxy Z Fold (unfolded)', FO, 'foldable', 'android', 884, 1104, 2, 'punch', 22);
  d('pixel-fold', 'Pixel Fold (unfolded)', FO, 'foldable', 'android', 700, 841, 2.625, 'punch', 22);
  d('surface-duo', 'Surface Duo (one screen)', FO, 'foldable', 'android', 540, 720, 2.5, 'none', 12);

  // Tablets
  const IPD = 'Apple iPad';
  d('ipad-pro-13', 'iPad Pro 13"', IPD, 'tablet', 'ios', 1032, 1376, 2, 'none', 18);
  d('ipad-pro-11', 'iPad Pro 11"', IPD, 'tablet', 'ios', 834, 1210, 2, 'none', 18);
  d('ipad-air-13', 'iPad Air 13"', IPD, 'tablet', 'ios', 1024, 1366, 2, 'none', 18);
  d('ipad-air-11', 'iPad Air 11"', IPD, 'tablet', 'ios', 820, 1180, 2, 'none', 18);
  d('ipad-11', 'iPad (10th / 11th gen)', IPD, 'tablet', 'ios', 820, 1180, 2, 'none', 18);
  d('ipad-mini', 'iPad mini', IPD, 'tablet', 'ios', 744, 1133, 2, 'none', 18);
  d('ipad-9', 'iPad (9th gen)', IPD, 'tablet', 'ios', 810, 1080, 2, 'home', 0);
  const AT = 'Android tablets';
  d('tab-s9-ultra', 'Galaxy Tab S9 Ultra', AT, 'tablet', 'android', 924, 1480, 2, 'punch', 14);
  d('tab-s9', 'Galaxy Tab S9', AT, 'tablet', 'android', 800, 1280, 2, 'punch', 14);
  d('pixel-tablet', 'Pixel Tablet', AT, 'tablet', 'android', 800, 1280, 2, 'none', 18);
  d('surface-pro-7', 'Surface Pro 7', AT, 'tablet', 'other', 912, 1368, 2, 'none', 8);
  d('nest-hub-max', 'Nest Hub Max', AT, 'tablet', 'other', 1280, 800, 1, 'none', 8);
  d('nest-hub', 'Nest Hub', AT, 'tablet', 'other', 1024, 600, 1, 'none', 8);

  // Watches
  const WA = 'Watches';
  d('watch-ultra-2', 'Apple Watch Ultra 49mm', WA, 'watch', 'ios', 205, 251, 2, 'none', 46);
  d('watch-s10-46', 'Apple Watch Series 10 46mm', WA, 'watch', 'ios', 208, 248, 2, 'none', 46);
  d('watch-s10-42', 'Apple Watch Series 10 42mm', WA, 'watch', 'ios', 187, 223, 2, 'none', 42);

  // Laptops & desktops
  const DT = 'Laptops & desktops';
  d('macbook-air-13', 'MacBook Air 13"', DT, 'desktop', 'other', 1470, 956, 2, 'none', 6);
  d('macbook-pro-14', 'MacBook Pro 14"', DT, 'desktop', 'other', 1512, 982, 2, 'none', 6);
  d('macbook-pro-16', 'MacBook Pro 16"', DT, 'desktop', 'other', 1728, 1117, 2, 'none', 6);
  d('laptop-1440', 'Laptop 1440 × 900', DT, 'desktop', 'other', 1440, 900, 1, 'none', 6);
  d('laptop-1366', 'Laptop 1366 × 768', DT, 'desktop', 'other', 1366, 768, 1, 'none', 6);
  d('desktop-fhd', 'Desktop Full HD', DT, 'desktop', 'other', 1920, 1080, 1, 'none', 6);
  d('desktop-qhd', 'Desktop QHD', DT, 'desktop', 'other', 2560, 1440, 1, 'none', 6);
  d('imac-24', 'iMac 24"', DT, 'desktop', 'other', 2240, 1260, 2, 'none', 6);
  d('kiosk', 'Kiosk portrait', DT, 'desktop', 'other', 1080, 1920, 1, 'none', 6);

  window.RT_DEVICES = L;
  window.RT_BREAKPOINTS = [320, 375, 425, 640, 768, 1024, 1280, 1536];
})();
