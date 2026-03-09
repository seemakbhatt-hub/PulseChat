const secretKey = "shadowtalk-secret-key";

export async function encryptMessage(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const key = await crypto.subtle.digest("SHA-256", encoder.encode(secretKey));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

export async function decryptMessage(encryptedText, ivText) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.digest("SHA-256", encoder.encode(secretKey));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const encrypted = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivText), c => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}