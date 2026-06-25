const FREIGHT_API_ORIGIN =
  process.env.FREIGHT_API_ORIGIN || "https://apollo-freight-pst1.onrender.com";

module.exports = async function handler(request, response) {
  const pathParts = Array.isArray(request.query.path) ? request.query.path : [];
  const upstreamPath = `/${pathParts.join("/")}`;
  const targetUrl = new URL(upstreamPath, FREIGHT_API_ORIGIN);

  Object.entries(request.query || {}).forEach(([key, value]) => {
    if (key === "path") return;
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      if (item !== undefined) targetUrl.searchParams.append(key, item);
    });
  });

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: copyRequestHeaders(request.headers),
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request,
      duplex: "half"
    });

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    const contentType = upstreamResponse.headers.get("content-type") || "";

    if (!contentType.includes("application/json") && upstreamResponse.status >= 400) {
      response.status(upstreamResponse.status).json({
        message: `Freight API returned ${upstreamResponse.status}.`,
        upstreamUrl: targetUrl.toString(),
        upstreamContentType: contentType || "unknown"
      });
      return;
    }

    response.status(upstreamResponse.status);
    upstreamResponse.headers.forEach((value, key) => {
      if (!isHopByHopHeader(key)) {
        response.setHeader(key, value);
      }
    });
    response.setHeader("cache-control", "no-store");
    response.send(buffer);
  } catch (error) {
    response.status(502).json({
      message: "Unable to reach freight API.",
      error: error.message
    });
  }
};

function copyRequestHeaders(headers) {
  const nextHeaders = { ...headers };
  delete nextHeaders.host;
  delete nextHeaders.connection;
  delete nextHeaders["content-length"];
  delete nextHeaders["accept-encoding"];
  delete nextHeaders["x-forwarded-host"];
  delete nextHeaders["x-forwarded-proto"];
  return nextHeaders;
}

function isHopByHopHeader(name) {
  return [
    "connection",
    "content-encoding",
    "content-length",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade"
  ].includes(name.toLowerCase());
}
