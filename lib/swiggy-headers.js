export const SWIGGY_API_HEADERS = {
  accept: "application/json",
  "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
  "content-type": "application/json",
  dnt: "1",
  origin: "https://partner.swiggy.com",
  priority: "u=1, i",
  referer: "https://partner.swiggy.com/",
  "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent":
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
};

export function authHeaders(accessToken) {
  return {
    ...SWIGGY_API_HEADERS,
    access_token: accessToken,
    accesstoken: accessToken,
  };
}
