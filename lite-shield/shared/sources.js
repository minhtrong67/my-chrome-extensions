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
