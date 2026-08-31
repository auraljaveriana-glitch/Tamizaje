// POST /api/submit  — called by the public tamizaje page (index.html)
// whenever a visitor sends their result to Aural, and by the admin
// panel's manual-entry form. No key required: any visitor can create a
// lead (that's the point of the public survey), but nobody can READ or
// change the list without the admin key — see list.js / update.js.
const { getStore, connectLambda } = require("@netlify/blobs");

const STORE_NAME = "aural-contactos";
const DATA_KEY = "contacts";
const MAX_LEN = { nombre: 200, edad: 10, telefono: 40, correo: 200, ciudad: 100, canal: 30, sintomas: 10, tonos: 10, riesgo: 30 };

function clip(v, max) {
  return String(v == null ? "" : v).slice(0, max);
}

exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: "JSON invalido" };
  }

  const nombre = clip(payload.nombre, MAX_LEN.nombre).trim();
  const telefono = clip(payload.telefono, MAX_LEN.telefono).trim();
  if (!nombre || !telefono) {
    return { statusCode: 400, body: "nombre y telefono son obligatorios" };
  }

  const contact = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    fecha: new Date().toISOString(),
    nombre: nombre,
    edad: clip(payload.edad, MAX_LEN.edad).trim(),
    telefono: telefono,
    correo: clip(payload.correo, MAX_LEN.correo).trim(),
    ciudad: clip(payload.ciudad, MAX_LEN.ciudad).trim(),
    canal: clip(payload.canal, MAX_LEN.canal).trim(),
    sintomas: clip(payload.sintomas, MAX_LEN.sintomas).trim(),
    tonos: clip(payload.tonos, MAX_LEN.tonos).trim(),
    riesgo: clip(payload.riesgo, MAX_LEN.riesgo).trim(),
    estado: "Pendiente",
    notas: ""
  };

  const store = getStore(STORE_NAME);
  let contacts = [];
  try {
    const existing = await store.get(DATA_KEY, { type: "json" });
    if (Array.isArray(existing)) contacts = existing;
  } catch (e) {
    // no data yet — start fresh
  }
  contacts.push(contact);
  await store.setJSON(DATA_KEY, contacts);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, id: contact.id })
  };
};
