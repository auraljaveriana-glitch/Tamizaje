// POST /api/update?key=ADMIN_KEY — used by panel.html to edit a contact's
// estado/notas, or to delete one. Body: {id, patch} or {deleteId}.
const { getStore, connectLambda } = require("@netlify/blobs");

const STORE_NAME = "aural-contactos";
const DATA_KEY = "contacts";
const PATCHABLE = ["estado", "notas"];

exports.handler = async (event) => {
  connectLambda(event);

  const providedKey = event.queryStringParameters && event.queryStringParameters.key;
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey) {
    return { statusCode: 500, body: "ADMIN_KEY no esta configurada en Netlify." };
  }
  if (!providedKey || providedKey !== adminKey) {
    return { statusCode: 401, body: "unauthorized" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: "JSON invalido" };
  }

  const store = getStore(STORE_NAME);
  let contacts = [];
  try {
    const existing = await store.get(DATA_KEY, { type: "json" });
    if (Array.isArray(existing)) contacts = existing;
  } catch (e) {
    // no data yet
  }

  if (body.deleteId) {
    contacts = contacts.filter((c) => c.id !== body.deleteId);
  } else if (body.id && body.patch && typeof body.patch === "object") {
    const safePatch = {};
    for (const k of PATCHABLE) {
      if (k in body.patch) safePatch[k] = String(body.patch[k]).slice(0, 500);
    }
    contacts = contacts.map((c) => (c.id === body.id ? Object.assign({}, c, safePatch) : c));
  } else {
    return { statusCode: 400, body: "Se requiere {id, patch} o {deleteId}" };
  }

  await store.setJSON(DATA_KEY, contacts);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true })
  };
};
