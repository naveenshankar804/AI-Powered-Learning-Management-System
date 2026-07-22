const { executeCssTests } = require('../src/utils/cssTestEngine');

describe('CSS Test Engine', () => {
  let mockPage;

  beforeEach(() => {
    mockPage = {
      evaluate: jest.fn(async (callback, spec) => {
        global.document = {
          querySelector: jest.fn(selector => {
            if (selector === '.test-element') {
              return {};
            }
            return null;
          }),
          styleSheets: [
            {
              cssRules: [
                { selectorText: '.test-element' }
              ]
            }
          ]
        };

        global.window = {
          getComputedStyle: jest.fn(() => ({
            getPropertyValue: jest.fn(prop => prop === 'color' ? 'red' : null),
            color: 'red'
          }))
        };

        const result = callback(spec);

        delete global.document;
        delete global.window;

        return result;
      })
    };
  });

  it('should return empty array if no spec', async () => {
    const result = await executeCssTests(mockPage, []);
    expect(result).toEqual([]);
  });

  it('should evaluate ruleExists', async () => {
    const spec = [{ testType: 'ruleExists', selector: '.test-element' }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(true);
  });

  it('should evaluate css property match', async () => {
    const spec = [{ selector: '.test-element', property: 'color', expected: 'red' }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(true);
  });

  it('should fail missing element', async () => {
    const spec = [{ selector: '.missing', property: 'color', expected: 'red' }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(false);
  });

  it('should evaluate css property match with matcher: includes', async () => {
    const spec = [{ selector: '.test-element', property: 'color', expected: 're', matcher: 'includes' }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(true);
  });

  it('should evaluate css property match with matcher: notequals', async () => {
    const spec = [{ selector: '.test-element', property: 'color', expected: 'blue', matcher: 'notequals' }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(true);
  });

  it('should evaluate css property match when expected is an array', async () => {
    const spec = [{ selector: '.test-element', property: 'color', expected: ['blue', 'red'] }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(true);
  });

  it('should fail ruleExists when rule is missing', async () => {
    const spec = [{ testType: 'ruleExists', selector: '.missing-rule' }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(false);
    expect(result[0].hint).toContain('Missing CSS rule containing: .missing-rule');
  });

  it('should handle cross-origin security errors in cssRules gracefully', async () => {
    mockPage.evaluate.mockImplementation(async (callback, spec) => {
      global.document = {
        styleSheets: [
          {
            get cssRules() {
              throw new Error('SecurityError: The operation is insecure.');
            }
          }
        ]
      };
      const result = callback(spec);
      delete global.document;
      return result;
    });

    const spec = [{ testType: 'ruleExists', selector: '.test-element' }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(false);
  });

  it('should evaluate catch block error gracefully for DOM manipulation errors', async () => {
    mockPage.evaluate.mockImplementation(async (callback, spec) => {
      global.document = {
        querySelector: jest.fn(() => { throw new Error('Invalid selector'); })
      };
      const result = callback(spec);
      delete global.document;
      return result;
    });

    const spec = [{ selector: '.test-element[', property: 'color', expected: 'red' }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(false);
    expect(result[0].hint).toBe('Error parsing CSS properties target');
  });

});
