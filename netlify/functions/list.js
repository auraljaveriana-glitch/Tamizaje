// GET /api/list?key=ADMIN_KEY — used by panel.html to load all contacts.
// Requires the ADMIN_KEY environment variable to match the ?key= param.
const { getStore, connectLambda } = require("@netlify/blobs");

const STORE_NAME = "aural-contactos";
const DATA_KEY = "contacts";

exports.handler = async (event) => {
  connectLambda(event);

  const providedKey = event.queryStringParameters && event.queryStringParameters.key;
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey) {
    return { statusCode: 500, body: "ADMIN_KEY no esta configurada en Netlify (Site settings > Environment variables)." };
  }
  if (!providedKey || providedKey !== adminKey) {
    return { statusCode: 401, body: "unauthorized" };
  }

  const store = getStore(STORE_NAME);
  let contacts = [];
  try {
    const existing = await store.get(DATA_KEY, { type: "json" });
    if (Array.isArray(existing)) contacts = existing;
  } catch (e) {
    // no data yet
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contacts)
  };
};
