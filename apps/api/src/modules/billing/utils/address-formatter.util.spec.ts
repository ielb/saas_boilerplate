import {
  normalizeAddress,
  formatAddressForPdf,
  formatAddressOneLine,
  isValidAddress,
  formatAddress,
} from './address-formatter.util';

describe('AddressFormatterUtil', () => {
  describe('normalizeAddress', () => {
    it('should normalize standard address format', () => {
      const address = {
        name: 'John Doe',
        company: 'Acme Corp',
        addressLine1: '123 Main St',
        addressLine2: 'Suite 100',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        phone: '555-1234',
        email: 'john@example.com',
      };

      const result = normalizeAddress(address);
      expect(result).toEqual(address);
    });

    it('should normalize address with alternative field names', () => {
      const address = {
        name: 'John Doe',
        street: '123 Test Street',
        city: 'TestCity',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
      };

      const result = normalizeAddress(address);
      expect(result).toEqual({
        name: 'John Doe',
        addressLine1: '123 Test Street',
        city: 'TestCity',
        state: 'TS',
        postalCode: '12345',
        country: 'US',
        company: undefined,
        addressLine2: undefined,
        phone: undefined,
        email: undefined,
      });
    });

    it('should handle JSON string addresses', () => {
      const addressString = JSON.stringify({
        street: '123 Test Street',
        city: 'TestCity',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
      });

      const result = normalizeAddress(addressString);
      expect(result.addressLine1).toBe('123 Test Street');
      expect(result.city).toBe('TestCity');
      expect(result.postalCode).toBe('12345');
    });

    it('should handle invalid JSON string as address line', () => {
      const invalidJson = '123 Main Street, City, State';
      const result = normalizeAddress(invalidJson);
      expect(result.addressLine1).toBe('123 Main Street, City, State');
    });

    it('should handle null or undefined input', () => {
      expect(normalizeAddress(null)).toEqual({});
      expect(normalizeAddress(undefined)).toEqual({});
      expect(normalizeAddress('')).toEqual({});
    });

    it('should handle different postal code field names', () => {
      const testCases = [
        { zipCode: '12345' },
        { zip: '12345' },
        { postalCode: '12345' },
        { postcode: '12345' },
      ];

      testCases.forEach(address => {
        const result = normalizeAddress(address);
        expect(result.postalCode).toBe('12345');
      });
    });
  });

  describe('formatAddressForPdf', () => {
    it('should format complete address for PDF', () => {
      const address = {
        name: 'John Doe',
        company: 'Acme Corp',
        addressLine1: '123 Main St',
        addressLine2: 'Suite 100',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        phone: '555-1234',
        email: 'john@example.com',
      };

      const result = formatAddressForPdf(address);
      expect(result).toContain('<p><strong>John Doe</strong></p>');
      expect(result).toContain('<p>Acme Corp</p>');
      expect(result).toContain('<p>123 Main St</p>');
      expect(result).toContain('<p>Suite 100</p>');
      expect(result).toContain('<p>New York, NY, 10001</p>');
      expect(result).toContain('<p>USA</p>');
      expect(result).toContain('<p>Phone: 555-1234</p>');
      expect(result).toContain('<p>Email: john@example.com</p>');
    });

    it('should format address with alternative field names', () => {
      const address = {
        street: '123 Test Street',
        city: 'TestCity',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
      };

      const result = formatAddressForPdf(address, 'Jane Smith');
      expect(result).toContain('<p><strong>Jane Smith</strong></p>');
      expect(result).toContain('<p>123 Test Street</p>');
      expect(result).toContain('<p>TestCity, TS, 12345</p>');
      expect(result).toContain('<p>US</p>');
    });

    it('should handle partial address data', () => {
      const address = {
        city: 'TestCity',
        country: 'US',
      };

      const result = formatAddressForPdf(address);
      expect(result).toContain('<p>TestCity</p>');
      expect(result).toContain('<p>US</p>');
      expect(result).not.toContain('<p><strong>');
    });

    it('should handle empty address', () => {
      const result = formatAddressForPdf({});
      expect(result).toBe('<p>No address provided</p>');
    });

    it('should handle null address', () => {
      const result = formatAddressForPdf(null);
      expect(result).toBe('<p>No address provided</p>');
    });
  });

  describe('formatAddressOneLine', () => {
    it('should format address as single line', () => {
      const address = {
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      };

      const result = formatAddressOneLine(address);
      expect(result).toBe('123 Main St, New York, NY, 10001, USA');
    });

    it('should handle partial address', () => {
      const address = {
        city: 'TestCity',
        country: 'US',
      };

      const result = formatAddressOneLine(address);
      expect(result).toBe('TestCity, US');
    });

    it('should handle empty address', () => {
      const result = formatAddressOneLine({});
      expect(result).toBe('No address provided');
    });
  });

  describe('isValidAddress', () => {
    it('should return true for valid address with addressLine1', () => {
      const address = { addressLine1: '123 Main St' };
      expect(isValidAddress(address)).toBe(true);
    });

    it('should return true for valid address with city only', () => {
      const address = { city: 'New York' };
      expect(isValidAddress(address)).toBe(true);
    });

    it('should return true for address with street field', () => {
      const address = { street: '123 Test Street' };
      expect(isValidAddress(address)).toBe(true);
    });

    it('should return false for empty address', () => {
      expect(isValidAddress({})).toBe(false);
      expect(isValidAddress(null)).toBe(false);
      expect(isValidAddress(undefined)).toBe(false);
    });

    it('should return false for address with only name/company', () => {
      const address = { name: 'John Doe', company: 'Acme Corp' };
      expect(isValidAddress(address)).toBe(false);
    });
  });

  describe('formatAddress', () => {
    const address = {
      name: 'John Doe',
      addressLine1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
    };

    it('should format as HTML', () => {
      const result = formatAddress(address, 'html');
      expect(result).toContain('<p><strong>John Doe</strong></p>');
      expect(result).toContain('<p>123 Main St</p>');
    });

    it('should format as one line', () => {
      const result = formatAddress(address, 'oneline');
      expect(result).toBe('123 Main St, New York, NY, 10001, USA');
    });

    it('should format as text (default)', () => {
      const result = formatAddress(address);
      const lines = result.split('\n');
      expect(lines).toContain('John Doe');
      expect(lines).toContain('123 Main St');
      expect(lines).toContain('New York, NY, 10001');
      expect(lines).toContain('USA');
    });

    it('should format as text explicitly', () => {
      const result = formatAddress(address, 'text');
      const lines = result.split('\n');
      expect(lines).toContain('John Doe');
      expect(lines).toContain('123 Main St');
    });
  });
});
