// Using Web Crypto API for password hashing - compatible with Cloudflare Workers
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(hash);
  const saltedHash = new Uint8Array(salt.length + hashArray.length);
  saltedHash.set(salt);
  saltedHash.set(hashArray, salt.length);
  
  return btoa(String.fromCharCode(...saltedHash));
}

export async function verifyPassword(
  hashedPassword: string,
  password: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const saltedHash = Uint8Array.from(atob(hashedPassword), c => c.charCodeAt(0));
  
  const salt = saltedHash.slice(0, 16);
  const storedHash = saltedHash.slice(16);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(hash);
  
  if (hashArray.length !== storedHash.length) {
    return false;
  }
  
  for (let i = 0; i < hashArray.length; i++) {
    if (hashArray[i] !== storedHash[i]) {
      return false;
    }
  }
  
  return true;
}