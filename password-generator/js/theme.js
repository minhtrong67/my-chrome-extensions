const MD_COLORS = ["red","pink","purple","deepPurple","indigo","blue","lightBlue","cyan","teal","green","lightGreen","lime","yellow","amber","orange","deepOrange","brown","blueGrey"];
const MD_SEEDS = {red:"#F44336",pink:"#E91E63",purple:"#9C27B0",deepPurple:"#673AB7",indigo:"#3F51B5",blue:"#2196F3",lightBlue:"#03A9F4",cyan:"#00BCD4",teal:"#009688",green:"#4CAF50",lightGreen:"#8BC34A",lime:"#CDDC39",yellow:"#FFEB3B",amber:"#FFC107",orange:"#FF9800",deepOrange:"#FF5722",brown:"#795548",blueGrey:"#607D8B"};

const themeManager = {
  mode: "system",
  mql: window.matchMedia("(prefers-color-scheme: dark)"),

  apply(mode) {
    this.mode = mode;
    const dark = mode === "dark" || (mode === "system" && this.mql.matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  },
  applyColor(color) {
    document.documentElement.setAttribute("data-color", MD_SEEDS[color] ? color : "teal");
  },
  /** Re-apply when the OS theme flips while "System" is selected. */
  watch() {
    this.mql.addEventListener("change", () => { if (this.mode === "system") this.apply("system"); });
  }
};
