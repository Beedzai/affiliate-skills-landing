const BUCKET = "product-images";
const MAX_BYTES = 6 * 1024 * 1024;

const json = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
};

const readJson = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES * 1.4) {
        reject(new Error("File quá lớn. Vui lòng dùng ảnh tối đa 6MB."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });

const storageRequest = async (path, options = {}) => {
  const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...options.headers,
    },
  });

  const text = await response.text();
  if (response.status === 404 || text.includes("Bucket not found")) {
    return { missing: true };
  }
  if (!response.ok) {
    throw new Error(`Supabase Storage ${response.status}: ${text}`);
  }
  if (response.status === 204) return null;
  return text ? JSON.parse(text) : null;
};

const ensureBucket = async () => {
  const bucket = await storageRequest(`bucket/${BUCKET}`);
  if (bucket?.missing) {
    await storageRequest("bucket", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: BUCKET,
        name: BUCKET,
        public: true,
        file_size_limit: MAX_BYTES,
        allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      }),
    });
    return;
  }

  if (bucket && bucket.public === false) {
    await storageRequest(`bucket/${BUCKET}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ public: true, file_size_limit: MAX_BYTES }),
    });
  }
};

const safeName = (name = "product-image") =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 90) || "product-image";

module.exports = async (request, response) => {
  try {
    if (request.method !== "POST") {
      return json(response, 405, { error: "Method not allowed" });
    }

    const body = await readJson(request);
    const dataUrl = body.dataUrl || "";
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
    if (!match) {
      return json(response, 400, { error: "Vui lòng chọn file ảnh JPG, PNG, WEBP hoặc GIF." });
    }

    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length || buffer.length > MAX_BYTES) {
      return json(response, 400, { error: "File quá lớn. Vui lòng dùng ảnh tối đa 6MB." });
    }

    await ensureBucket();

    const extension = contentType.split("/")[1].replace("jpeg", "jpg");
    const productId = safeName(body.productId || "product");
    const filename = safeName(body.filename || `image.${extension}`);
    const objectPath = `products/${productId}/${Date.now()}-${filename}`;

    await storageRequest(`object/${BUCKET}/${objectPath}`, {
      method: "PUT",
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=31536000, immutable",
        "x-upsert": "true",
      },
      body: buffer,
    });

    return json(response, 200, {
      url: `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`,
      path: objectPath,
    });
  } catch (error) {
    return json(response, 500, { error: error.message });
  }
};
