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
  const match = String(line ?? '').match(/^sha256: ([a-f0-9]{64})$/);
  if (!match) throw transportError('Candidate payload SHA-256 metadata is missing or invalid.', 'invalid_transport_metadata');
  return match[1];
};

export const parseCandidateIngressReference = (payloadLines, maxPlaintextBytes) => {
  const lines = Array.isArray(payloadLines)
    ? payloadLines
    : String(payloadLines ?? '').split(/\r?\n/);

  if (lines.length !== 2) {
    throw transportError('Candidate ingress reference must contain exactly byte length and SHA-256 metadata.', 'invalid_transport_metadata');
  }

  const payloadBytes = parseDeclaredBytes(lines[0]);
  const payloadSha256 = parseDeclaredSha256(lines[1]);
  if (payloadBytes > maxPlaintextBytes) {
    throw transportError('Candidate payload exceeds the transport limit.', 'payload_too_large');
  }

  return { payloadBytes, payloadSha256 };
};

export const validateCandidateIngressPayload = (payloadText, reference, maxPlaintextBytes) => {
  const text = String(payloadText ?? '');
  if (!text) throw transportError('Candidate ingress payload is empty.', 'missing_payload');

  const actualBytes = Buffer.byteLength(text, 'utf8');
  if (actualBytes > maxPlaintextBytes || reference.payloadBytes > maxPlaintextBytes) {
    throw transportError('Candidate payload exceeds the transport limit.', 'payload_too_large');
  }
  if (actualBytes !== reference.payloadBytes) {
    throw transportError('Candidate payload byte length does not match the ingress reference.', 'payload_length_mismatch');
  }

  const actualSha256 = createHash('sha256').update(text, 'utf8').digest('hex');
  if (actualSha256 !== reference.payloadSha256) {
    throw transportError('Candidate payload SHA-256 does not match the ingress reference.', 'payload_checksum_mismatch');
  }

  return Buffer.from(text, 'utf8');
};
