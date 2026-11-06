# Chrome Web Store notes

## Single purpose
Preview and test how a web page looks and behaves on different device sizes (phones, tablets, foldables, watches, desktops), with screenshots and recordings.

## Permission justification
| Permission | Justification |
| --- | --- |
| `activeTab` | Start the simulator on the tab where the user clicked the toolbar icon, shortcut or context menu entry. |
| `scripting` | Inject the simulator overlay (`js/app.js` and its assets) into that tab. |
| `declarativeNetRequest` | Per-tab session rules: send a device `User-Agent` and allow the tested page to be shown in the simulator frame. Removed when the simulator closes. |
| Host permissions `<all_urls>` | The user may test any website, so the rules and the frame agent must be able to apply to any `http(s)` origin. Only tabs where the simulator is open are affected. |
| `storage` | Save settings, custom devices, favourites and sidebar sizes locally. |
| `contextMenus` | "Open page in Responsive Tester" entry. |

## Remote code
None. All scripts and fonts are packaged with the extension.

## Data usage disclosure
No user data is collected, transmitted or sold. See `PRIVACY.md`.
