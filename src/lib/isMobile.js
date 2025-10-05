
export const isMobile = () => {
  // A simple check for mobile devices based on user agent
  return /Mobi|Android/i.test(navigator.userAgent);
};
