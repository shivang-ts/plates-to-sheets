export const PLATFORMS = {
  swiggy: {
    id: "swiggy",
    name: "Swiggy",
    loginUrl: "https://partner.swiggy.com/food",
    dashboardHint: "Stay on the partner /food dashboard after login.",
    theme: {
      primary: "#fc8019",
      primaryHover: "#e67312",
      primaryLight: "#fff8f0",
      header: "#fc8019",
    },
    logPrefix: "SwiggyOrders",
  },
  zomato: {
    id: "zomato",
    name: "Zomato",
    loginUrl: "https://www.zomato.com/partners/login",
    dashboardHint: "Stay on the Zomato partner dashboard after login.",
    theme: {
      primary: "#e23744",
      primaryHover: "#cb202d",
      primaryLight: "#fff5f5",
      header: "#e23744",
    },
    logPrefix: "ZomatoOrders",
  },
};

export function getPlatform(id) {
  return PLATFORMS[id] ?? PLATFORMS.swiggy;
}
