// lib/bits.js
function clamp(x, min, max) {
  if (min !== null && x < min) return min;
  if (max !== null && x > max) return max;
  return x;
}
function toRaw(phys, factor, offset, signed, min, max) {
  if (factor === 0) throw new Error("factor must not be zero");
  const clamped = clamp(phys, min, max);
  let raw = Math.round((clamped - offset) / factor);
  if (!Number.isFinite(raw)) throw new Error("raw not finite");
  return raw;
}
function packBits(rawValue, start_bit, bit_length, byte_order, signed) {
  if (bit_length <= 0 || bit_length > 64) throw new Error("bit_length out of range");
  let valBig;
  if (signed) {
    const minVal = -(1n << BigInt(bit_length - 1));
    const maxVal = (1n << BigInt(bit_length - 1)) - 1n;
    let rv = BigInt(rawValue);
    if (rv < minVal) rv = minVal;
    if (rv > maxVal) rv = maxVal;
    if (rv < 0) rv = (1n << BigInt(bit_length)) + rv;
    valBig = rv;
  } else {
    const maxVal = (1n << BigInt(bit_length)) - 1n;
    let rv = BigInt(rawValue);
    if (rv < 0) rv = 0n;
    if (rv > maxVal) rv = maxVal;
    valBig = rv;
  }
  if (byte_order === 'intel') {
    const shift = BigInt(start_bit);
    const mask = ((1n << BigInt(bit_length)) - 1n) << shift;
    const valueBits = valBig << shift;
    return { mask, valueBits };
  } else if (byte_order === 'motorola') {
    let remaining = bit_length;
    let currentStart = start_bit;
    let mask = 0n, valueBits = 0n, val = valBig;
    while (remaining > 0) {
      const byteIndex = Math.floor(currentStart / 8);
      const bitIndexInByte = 7 - (currentStart % 8);
      const bitsInThisByte = Math.min(remaining, bitIndexInByte + 1);
      const msbPos = byteIndex * 8 + bitIndexInByte;
      const lsbPos = msbPos - (bitsInThisByte - 1);
      let sliceMask = ((1n << BigInt(bitsInThisByte)) - 1n) << BigInt(lsbPos);
      mask |= sliceMask;
      const sliceVal = val & ((1n << BigInt(bitsInThisByte)) - 1n);
      valueBits |= (sliceVal << BigInt(lsbPos));
      val >>= BigInt(bitsInThisByte);
      remaining -= bitsInThisByte;
      currentStart = lsbPos - 1;
    }
    return { mask, valueBits };
  } else {
    throw new Error("Unknown byte_order: " + byte_order);
  }
}
module.exports = { clamp, toRaw, packBits };
