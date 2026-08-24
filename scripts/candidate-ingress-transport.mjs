const transportError = (message, code) => Object.assign(new Error(message), { code });

const stripOptionalFence = (text) => {
  const fenced = text.match(/^```(?:base64)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
  return fenced ? fenced[1] : text;
};

export const normalizeCandidateIngressBase64 = (payloadLines) => {
  const text = Array.isArray(payloadLines) ? payloadLines.join('\n').trim() : String(payloadLines ?? '').trim();
  if (!text) throw transportError('Candidate payload is missing.', 'missing_payload');

  const compact = stripOptionalFence(text).replace(/\s+/g, '');
  if (!compact) throw transportError('Candidate payload is missing.', 'missing_payload');

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    throw transportError('Candidate payload is not valid Base64.', 'candidate_payload_malformed');
  }

  const unpadded = compact.replace(/=+$/, '');
  if (unpadded.length % 4 === 1) {
    throw transportError('Candidate payload has invalid Base64 length.', 'candidate_payload_malformed');
  }

  return compact;
};

export const decodeCandidateIngressPayload = (payloadLines, maxPlaintextBytes) => {
  const encoded = normalizeCandidateIngressBase64(payloadLines);
  const maxEncodedBytes = Math.ceil(maxPlaintextBytes * 4 / 3) + 8;
  if (encoded.length > maxEncodedBytes) {
    throw transportError('Candidate payload exceeds the transport limit.', 'payload_too_large');
  }

  const padding = (4 - (encoded.length % 4)) % 4;
  const padded = `${encoded}${'='.repeat(padding)}`;
  const plaintext = Buffer.from(padded, 'base64');
  if (!plaintext.length || plaintext.length > maxPlaintextBytes) {
    throw transportError('Candidate payload is outside the accepted size range.', 'payload_size_invalid');
  }

  const canonicalInput = encoded.replace(/=+$/, '');
  const canonicalDecoded = plaintext.toString('base64').replace(/=+$/, '');
  if (canonicalInput !== canonicalDecoded) {
    plaintext.fill(0);
    throw transportError('Candidate payload failed strict Base64 round-trip validation.', 'candidate_payload_malformed');
  }

  return plaintext;
};
