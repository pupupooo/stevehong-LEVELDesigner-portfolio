(() => {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("from");

  if (source !== "ai-cv") {
    return;
  }

  const currentUrl = new URL(window.location.href);
  const worksMarker = "/works/";
  const worksIndex = currentUrl.pathname.indexOf(worksMarker);

  if (worksIndex === -1) {
    return;
  }

  const rootUrl = new URL(window.location.href);
  rootUrl.pathname = currentUrl.pathname.slice(0, worksIndex + 1);
  rootUrl.search = "";
  rootUrl.hash = "";

  const aiCvUrl = new URL("cv/for-ai-native/", rootUrl);
  const rootIndexUrl = new URL("index.html", rootUrl);
  const isSameSite = (url) => (
    url.protocol === currentUrl.protocol &&
    url.host === currentUrl.host
  );

  const isHtmlLike = (url) => {
    const leaf = url.pathname.split("/").pop() || "";
    return url.pathname.endsWith("/") || leaf.endsWith(".html") || !leaf.includes(".");
  };

  for (const anchor of document.querySelectorAll("a[href]")) {
    const rawHref = anchor.getAttribute("href");
    if (!rawHref || rawHref.startsWith("#")) {
      continue;
    }

    let url;
    try {
      url = new URL(rawHref, window.location.href);
    } catch {
      continue;
    }

    if (!isSameSite(url)) {
      continue;
    }

    if (url.pathname === rootUrl.pathname || url.pathname === rootIndexUrl.pathname) {
      anchor.setAttribute("href", aiCvUrl.href);
      continue;
    }

    if (url.pathname.includes(worksMarker) && isHtmlLike(url)) {
      url.searchParams.set("from", "ai-cv");
      anchor.setAttribute("href", url.href);
    }
  }
})();
