async function executeDomTests(page, domTestSpec) {
  if (!domTestSpec || !domTestSpec.length) return [];
  
  return page.evaluate((spec) => {
    const normalize = (value) => {
      if (value == null) return '';
      return String(value).trim();
    };

    const needsExpected = new Set([
      'count',
      'textIncludes',
      'textEquals',
      'hasClass',
      'attributeEquals',
      'valueEquals',
      'alertIncludes'
    ]);

    return spec.map(test => {
      let passed = false;
      let hint = test.hint || `Failed DOM test for selector: ${test.selector}`;
      try {
        const assertion = test.assertion || 'exists';
        const expected = normalize(test.expected);

        if (assertion === 'alertCalled') {
          passed = Array.isArray(window.__alerts) && window.__alerts.length > 0;
        } else if (assertion === 'alertIncludes') {
          const alerts = Array.isArray(window.__alerts) ? window.__alerts.map((item) => normalize(item)) : [];
          passed = alerts.some((item) => item.includes(expected));
        } else {
          const elements = document.querySelectorAll(test.selector);
          const element = elements[0];

          if (assertion === 'exists') {
            passed = elements.length > 0;
          } else if (assertion === 'count') {
            passed = elements.length === Number(test.expected);
          } else if (!element) {
            hint = `Element not found: ${test.selector}`;
          } else if (assertion === 'textIncludes') {
            passed = normalize(element.textContent).includes(expected);
          } else if (assertion === 'textEquals') {
            passed = normalize(element.textContent) === expected;
          } else if (assertion === 'hasClass') {
            passed = element.classList.contains(expected);
          } else if (assertion === 'attributeEquals') {
            const attributeName = normalize(test.attribute);
            passed = Boolean(attributeName) && normalize(element.getAttribute(attributeName)) === expected;
            if (!attributeName) hint = 'Attribute name is required for attributeEquals';
          } else if (assertion === 'valueEquals') {
            passed = normalize(element.value) === expected;
          } else {
            hint = test.hint || `Unsupported DOM assertion: ${assertion}`;
          }

          // We clear default hint if we want a specific error
          if (!passed && hint === (test.hint || `Failed DOM test for selector: ${test.selector}`) && needsExpected.has(assertion)) {
            hint = `Expected ${assertion} to match "${expected}" for ${test.selector}`;
          }
        }
      } catch (e) {
        hint = `Invalid selector: ${test.selector}`;
      }
      return { 
        testId: test.id || Math.random().toString(36).substr(2, 9), 
        passed, 
        hint, 
        selector: test.selector 
      };
    });
  }, domTestSpec);
}

module.exports = { executeDomTests };
