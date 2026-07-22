const { executeDomTests } = require('../src/utils/domTestEngine');

describe('DOM Test Engine', () => {
  let mockPage;

  beforeEach(() => {
    // Instead of using jsdom which has ESM issues with Jest out of the box in this project,
    // we mock `page.evaluate` and directly call the callback with the spec.
    // However, the callback uses `document` and `window`. We can mock these inside the callback context.
    mockPage = {
      evaluate: jest.fn(async (callback, spec) => {
        // We simulate the evaluation in the browser by manually supplying a fake document and window
        // But since callback is just a pure function that relies on global `document` and `window`,
        // we can set them globally in Node for this execution, run the callback, and then unset them.

        global.window = {
            __alerts: ['test alert'],
        };

        const mockElement = {
            textContent: 'Hello World',
            classList: {
                contains: jest.fn(cls => cls === 'my-class')
            },
            getAttribute: jest.fn(attr => attr === 'data-test' ? 'my-data' : null),
            value: 'test-value'
        };

        global.document = {
            querySelectorAll: jest.fn(selector => {
                if (selector === '#test-div') return [mockElement];
                if (selector === 'div') return [mockElement];
                if (selector === '#test-input') return [mockElement];
                return [];
            })
        };

        const result = callback(spec);

        delete global.window;
        delete global.document;

        return result;
      })
    };
  });

  it('returns empty array if no spec is provided', async () => {
    const results = await executeDomTests(mockPage, []);
    expect(results).toEqual([]);
    expect(mockPage.evaluate).not.toHaveBeenCalled();
  });

  it('validates element exists', async () => {
    const spec = [{ id: '1', selector: '#test-div', assertion: 'exists' }];
    const results = await executeDomTests(mockPage, spec);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
    expect(results[0].selector).toBe('#test-div');
  });

  it('validates element count', async () => {
    const spec = [{ id: '2', selector: 'div', assertion: 'count', expected: '1' }];
    const results = await executeDomTests(mockPage, spec);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
  });

  it('validates textIncludes', async () => {
    const spec = [{ id: '3', selector: '#test-div', assertion: 'textIncludes', expected: 'Hello' }];
    const results = await executeDomTests(mockPage, spec);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
  });

  it('validates hasClass', async () => {
    const spec = [{ id: '4', selector: '#test-div', assertion: 'hasClass', expected: 'my-class' }];
    const results = await executeDomTests(mockPage, spec);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
  });

  it('validates valueEquals', async () => {
    const spec = [{ id: '5', selector: '#test-input', assertion: 'valueEquals', expected: 'test-value' }];
    const results = await executeDomTests(mockPage, spec);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
  });

  it('validates attributeEquals', async () => {
    const spec = [{ id: '6', selector: '#test-div', assertion: 'attributeEquals', attribute: 'data-test', expected: 'my-data' }];
    const results = await executeDomTests(mockPage, spec);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
  });

  it('validates alertCalled', async () => {
    const spec = [{ id: '7', assertion: 'alertCalled' }];
    const results = await executeDomTests(mockPage, spec);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
  });

  it('validates alertIncludes', async () => {
    const spec = [{ id: '8', assertion: 'alertIncludes', expected: 'test alert' }];
    const results = await executeDomTests(mockPage, spec);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
  });

  it('returns false for missing element', async () => {
    const spec = [{ id: '9', selector: '#missing-div', assertion: 'exists' }];
    const results = await executeDomTests(mockPage, spec);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false);
  });

  it('returns false and sets hint for missing element on non-exists assertion', async () => {
    const spec = [{ id: '10', selector: '#missing-div', assertion: 'textEquals', expected: 'foo' }];
    const results = await executeDomTests(mockPage, spec);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false);
    expect(results[0].hint).toBe('Element not found: #missing-div');
  });

  it('should evaluate textEquals assertion correctly', async () => {
    const spec = [{ selector: '#test-div', assertion: 'textEquals', expected: 'Hello World' }];
    const result = await executeDomTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(true);
  });

  it('returns false and sets hint for failed assertion expecting specific value', async () => {
    const spec = [{ selector: '#test-div', assertion: 'textEquals', expected: 'Goodbye World' }];
    const result = await executeDomTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(false);
    expect(result[0].hint).toBe('Expected textEquals to match "Goodbye World" for #test-div');
  });

  it('should fail attributeEquals assertion if attribute missing', async () => {
    const spec = [{ selector: '#test-div', assertion: 'attributeEquals', expected: 'my-data' }];
    const result = await executeDomTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(false);
    expect(result[0].hint).toBe('Attribute name is required for attributeEquals');
  });

  it('should evaluate unsupported assertion', async () => {
    const spec = [{ selector: '#test-div', assertion: 'unsupported' }];
    const result = await executeDomTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(false);
    expect(result[0].hint).toBe('Unsupported DOM assertion: unsupported');
  });

  it('should evaluate catch block error gracefully', async () => {
    mockPage.evaluate = jest.fn(async (callback, spec) => {
      global.document = {
        querySelectorAll: jest.fn(() => { throw new Error(); })
      };
      const result = callback(spec);
      delete global.document;
      return result;
    });

    const spec = [{ selector: 'input[', assertion: 'exists' }];
    const result = await executeDomTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(false);
    expect(result[0].hint).toBe('Invalid selector: input[');
  });
});
