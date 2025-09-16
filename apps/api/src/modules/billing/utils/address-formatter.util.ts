/**
 * Utility functions for formatting addresses in invoices and PDFs
 */

export interface AddressData {
  // Standard format (as defined in entity)
  name?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;

  // Alternative formats that might be received
  street?: string;
  zipCode?: string;
  zip?: string;
}

/**
 * Formats an address object into a normalized structure
 * Handles different field name variations that might be received
 */
export function normalizeAddress(address: any): AddressData {
  if (!address) {
    return {};
  }

  // Handle string addresses (JSON strings) - could be double-encoded
  if (typeof address === 'string') {
    try {
      address = JSON.parse(address);
      // Check if it's still a string (double-encoded JSON)
      if (typeof address === 'string') {
        address = JSON.parse(address);
      }
    } catch {
      return { addressLine1: address };
    }
  }

  // After parsing, check if it's now an object
  if (!address || typeof address !== 'object') {
    return {};
  }

  return {
    name: address.name,
    company: address.company,
    // Handle different field names for street address
    addressLine1:
      address.addressLine1 ||
      address.street ||
      address.address1 ||
      address.address,
    addressLine2: address.addressLine2 || address.address2,
    city: address.city,
    state: address.state || address.province || address.region,
    // Handle different field names for postal code
    postalCode:
      address.postalCode || address.zipCode || address.zip || address.postcode,
    country: address.country,
    phone: address.phone || address.phoneNumber,
    email: address.email || address.emailAddress,
  };
}

/**
 * Formats an address object into HTML for display in PDFs
 */
export function formatAddressForPdf(
  address: any,
  customerName?: string
): string {
  const normalizedAddress = normalizeAddress(address);

  if (!normalizedAddress || Object.keys(normalizedAddress).length === 0) {
    return '<p>No address provided</p>';
  }

  const lines: string[] = [];

  // Name line (prioritize address name, then customer name)
  const displayName = normalizedAddress.name || customerName;
  if (displayName) {
    lines.push(`<p><strong>${displayName}</strong></p>`);
  }

  // Company line
  if (normalizedAddress.company) {
    lines.push(`<p>${normalizedAddress.company}</p>`);
  }

  // Address line 1
  if (normalizedAddress.addressLine1) {
    lines.push(`<p>${normalizedAddress.addressLine1}</p>`);
  }

  // Address line 2
  if (normalizedAddress.addressLine2) {
    lines.push(`<p>${normalizedAddress.addressLine2}</p>`);
  }

  // City, State, Postal Code line
  const locationParts = [
    normalizedAddress.city,
    normalizedAddress.state,
    normalizedAddress.postalCode,
  ].filter(Boolean);

  if (locationParts.length > 0) {
    lines.push(`<p>${locationParts.join(', ')}</p>`);
  }

  // Country line
  if (normalizedAddress.country) {
    lines.push(`<p>${normalizedAddress.country}</p>`);
  }

  // Contact information
  if (normalizedAddress.phone) {
    lines.push(`<p>Phone: ${normalizedAddress.phone}</p>`);
  }

  if (normalizedAddress.email) {
    lines.push(`<p>Email: ${normalizedAddress.email}</p>`);
  }

  return lines.length > 0
    ? lines.join('\n            ')
    : '<p>No address provided</p>';
}

/**
 * Formats an address object into a single line string
 */
export function formatAddressOneLine(address: any): string {
  const normalizedAddress = normalizeAddress(address);

  if (!normalizedAddress || Object.keys(normalizedAddress).length === 0) {
    return 'No address provided';
  }

  const parts = [
    normalizedAddress.addressLine1,
    normalizedAddress.city,
    normalizedAddress.state,
    normalizedAddress.postalCode,
    normalizedAddress.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'No address provided';
}

/**
 * Validates if an address has minimum required fields
 */
export function isValidAddress(address: any): boolean {
  const normalizedAddress = normalizeAddress(address);

  // At minimum, we need either an address line or city
  return !!(normalizedAddress.addressLine1 || normalizedAddress.city);
}

/**
 * Formats an address for display in different contexts
 */
export function formatAddress(
  address: any,
  format: 'html' | 'text' | 'oneline' = 'text'
): string {
  const normalizedAddress = normalizeAddress(address);

  if (!normalizedAddress || Object.keys(normalizedAddress).length === 0) {
    return 'No address provided';
  }

  switch (format) {
    case 'html':
      return formatAddressForPdf(address);
    case 'oneline':
      return formatAddressOneLine(address);
    case 'text':
    default:
      const lines = [
        normalizedAddress.name,
        normalizedAddress.company,
        normalizedAddress.addressLine1,
        normalizedAddress.addressLine2,
        [
          normalizedAddress.city,
          normalizedAddress.state,
          normalizedAddress.postalCode,
        ]
          .filter(Boolean)
          .join(', '),
        normalizedAddress.country,
      ].filter(Boolean);

      return lines.join('\n');
  }
}
