// Nguồn danh sách công khai — dùng chung cho tools/fetch-lists.mjs và tính năng tự cập nhật trong background.js.
export const BASE = 'https://raw.githubusercontent.com/easylist/easylist/master';
export const SOURCES = {
  ads: ['easylist/easylist_general_block.txt', 'easylist/easylist_thirdparty.txt', 'easylist/easylist_specific_block.txt'],
  trackers: [
    'easyprivacy/easyprivacy_general.txt',
    'easyprivacy/easyprivacy_thirdparty.txt',
    'easyprivacy/easyprivacy_specific.txt',
    'easyprivacy/easyprivacy_trackingservers.txt',
  ],
  'cosmetic-ads': ['easylist/easylist_general_hide.txt', 'easylist/easylist_specific_hide.txt'],
};

// Danh sách bổ sung: mỗi danh sách là một ruleset riêng, bật/tắt độc lập trong Cài đặt.
//   updatable: được tải lại bằng nút "Cập nhật ngay" / tự động (quy tắc động); còn lại cập nhật theo bản phát hành của tiện ích.
const RAW = 'https://raw.githubusercontent.com';
const UASSETS = `${RAW}/uBlockOrigin/uAssets/master/filters`;
export const EXTRA = {
  vn: { title: 'ABPVN', updatable: true, files: { 'abpvn.txt': `${RAW}/abpvn/abpvn/master/filter/abpvn.txt` } },
  ubo: {
    title: 'uBlock filters',
    updatable: false,
    files: Object.fromEntries(['filters', 'privacy', 'badware', 'unbreak', 'quick-fixes'].map((n) => [`${n}.txt`, `${UASSETS}/${n}.txt`])),
  },
  adguard: {
    title: 'AdGuard Base',
    updatable: false,
    files: { 'base.txt': `${RAW}/AdguardTeam/FiltersRegistry/master/filters/filter_2_Base/filter.txt` },
  },
};
