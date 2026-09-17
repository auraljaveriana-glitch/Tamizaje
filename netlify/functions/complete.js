// POST /api/complete — called by the public tamizaje page (index.html) when
// a visitor FINISHES the questionnaire + tone test, to fill in the exam
// results on the lead that /api/submit already created right after they
// filled in their contact data. No key required, same trust model as
// submit.js: a visitor can only patch the exam-result fields (sintomas,
// tonos, riesgo, canal) of a contact whose id their own browser received
// from /api/submit — nobody can use this to READ the list or edit other
// people's fields (estado/notas) — see list.js / update.js for that.
const { getStore, connectLambda } = require("@netlify/blobs");

const STORE_NAME = "aural-contactos";
const DATA_KEY = "contacts";
const MAX_LEN = { canal: 30, sintomas: 10, tonos: 10, riesgo: 30 };
const PATCHABLE = ["sintomas", "tonos", "riesgo", "canal"];

function clip(v, max) {
  return String(v == null ? "" : v).slice(0, max).trim();
}

exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: "JSON invalido" };
  }

  const id = clip(body.id, 64);
  if (!id) {
    return { statusCode: 400, body: "Se requiere id" };
  }

  const store = getStore(STORE_NAME);
  let contacts = [];
  try {
    const existing = await store.get(DATA_KEY, { type: "json" });
    if (Array.isArray(existing)) contacts = existing;
  } catch (e) {
    // no data yet
  }

  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) {
    // Nothing to patch — don't error loudly, the beacon fires best-effort.
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, patched: false }) };
  }

  const safePatch = {};
  for (const k of PATCHABLE) {
    if (k in body) safePatch[k] = clip(body[k], MAX_LEN[k]);
  }
  contacts[idx] = Object.assign({}, contacts[idx], safePatch);

  await store.setJSON(DATA_KEY, contacts);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, patched: true })
  };
};
