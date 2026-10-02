import { createHash } from 'node:crypto';

const transportError = (message, code) => Object.assign(new Error(message), { code });

const parseDeclaredBytes = (line) => {
  const match = String(line ?? '').match(/^bytes: ([1-9][0-9]*)$/);
  if (!match) throw transportError('Candidate payload byte length metadata is missing or invalid.', 'invalid_transport_metadata');
  const value = Number(match[1]);
  if (!Number.isSafeInteger(value)) throw transportError('Candidate payload byte length metadata is invalid.', 'invalid_transport_metadata');
  return value;
};

const parseDeclaredSha256 = (line) => {
  const match = String(line ?? '').match(/^sha256: ([a-f0-9]{64})$/i);
  if (!match) throw transportError('Candidate payload SHA-256 metadata is missing or invalid.', 'invalid_transport_metadata');
  return match[1].toLowerCase();
};

export const decodeCandidateIngressPayload = (payloadLines, maxPlaintextBytes) => {
  const lines = Array.isArray(payloadLines)
    ? payloadLines
    : String(payloadLines ?? '').split(/\r?\n/);

  if (lines.length < 3) {
    throw transportError('Candidate payload metadata or JSON body is missing.', 'missing_payload');
  }

  const declaredBytes = parseDeclaredBytes(lines[0]);
  const declaredSha256 = parseDeclaredSha256(lines[1]);
  const jsonText = lines.slice(2).join('\n');

  if (!jsonText) throw transportError('Candidate payload is missing.', 'missing_payload');

  const actualBytes = Buffer.byteLength(jsonText, 'utf8');
  if (actualBytes > maxPlaintextBytes || declaredBytes > maxPlaintextBytes) {
    throw transportError('Candidate payload exceeds the transport limit.', 'payload_too_large');
  }
  if (actualBytes !== declaredBytes) {
    throw transportError('Candidate payload byte length does not match transport metadata.', 'payload_length_mismatch');
  }

  const actualSha256 = createHash('sha256').update(jsonText, 'utf8').digest('hex');
  if (actualSha256 !== declaredSha256) {
    throw transportError('Candidate payload SHA-256 does not match transport metadata.', 'payload_checksum_mismatch');
  }

  return Buffer.from(jsonText, 'utf8');
};
