const fs = require('fs');
const path = require('path');
const baselineGenerationService = require('../../src/services/baselineGenerationService');
const { Baseline } = require('../../src/models');
const { enqueueBaseline } = require('../../src/services/queueService');

jest.mock('fs');
jest.mock('path');
jest.mock('../../src/models', () => ({
  Baseline: {
    max: jest.fn()
  }
}));
jest.mock('../../src/services/queueService', () => ({
  enqueueBaseline: jest.fn()
}));

describe('BaselineGenerationService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('prepareAutoBaselineSpec', () => {
    it('should handle missing or invalid inputs', () => {
      const result = baselineGenerationService.prepareAutoBaselineSpec(null, null);
      expect(result.ready).toBe(false);
      expect(result.autoFilled).toBe(false);
    });

    it('should return explicit baseline if provided', () => {
      const spec = { baseline: { html: '<div></div>' } };
      const result = baselineGenerationService.prepareAutoBaselineSpec(spec);
      expect(result.ready).toBe(true);
      expect(result.autoFilled).toBe(false);
      expect(result.spec).toEqual(spec);
    });

    it('should use fallback files if no explicit baseline and meaningful fallback', () => {
      const fallbackFiles = { css: 'body { color: red; }' };
      const result = baselineGenerationService.prepareAutoBaselineSpec({}, fallbackFiles);
      expect(result.ready).toBe(true);
      expect(result.autoFilled).toBe(true);
      expect(result.spec.baseline.css).toBe('body { color: red; }');
      expect(result.spec.baseline.html).toBe('');
      expect(result.spec.baseline.js).toBe('');
    });

    it('should return not ready if fallback files are not meaningful', () => {
      const fallbackFiles = { html: '   <!-- start styling here -->   ' };
      const result = baselineGenerationService.prepareAutoBaselineSpec({}, fallbackFiles);
      expect(result.ready).toBe(false);
      expect(result.autoFilled).toBe(false);
    });

    it('should return true for meaningful HTML fallback', () => {
      const fallbackFiles = { html: '<div>Hello World</div>' };
      const result = baselineGenerationService.prepareAutoBaselineSpec({}, fallbackFiles);
      expect(result.ready).toBe(true);
      expect(result.autoFilled).toBe(true);
    });
  });

  describe('resolveCurrentBaselineVersion', () => {
    it('should return 0 for invalid question id', async () => {
      const result = await baselineGenerationService.resolveCurrentBaselineVersion('invalid');
      expect(result).toBe(0);
    });

    it('should return max version from db and fs', async () => {
      Baseline.max.mockResolvedValue(2);
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([
        { isDirectory: () => true, name: 'v1' },
        { isDirectory: () => true, name: 'v3' },
        { isDirectory: () => false, name: 'v4' }
      ]);
      path.resolve.mockReturnValue('/mock/path');

      const result = await baselineGenerationService.resolveCurrentBaselineVersion(1);
      expect(result).toBe(3); // Max of db(2) and fs(3)
    });

    it('should ignore fs errors', async () => {
      Baseline.max.mockResolvedValue(1);
      path.resolve.mockReturnValue('/mock/path');
      fs.existsSync.mockImplementation(() => { throw new Error('fs error'); });

      const result = await baselineGenerationService.resolveCurrentBaselineVersion(1);
      expect(result).toBe(1);
    });
  });

  describe('resolveNextBaselineVersion', () => {
    it('should return current max + 1', async () => {
      Baseline.max.mockResolvedValue(2);
      fs.existsSync.mockReturnValue(false);

      const result = await baselineGenerationService.resolveNextBaselineVersion(1);
      expect(result).toBe(3);
    });
  });

  describe('queueInitialBaselineIfReady', () => {
    it('should return queued false if not ready', async () => {
      Baseline.max.mockResolvedValue(0);
      fs.existsSync.mockReturnValue(false);
      const result = await baselineGenerationService.queueInitialBaselineIfReady(1, {}, {});
      expect(result.queued).toBe(false);
      expect(result.version).toBe(null);
    });

    it('should return queued false if already queued (version > 0)', async () => {
      Baseline.max.mockResolvedValue(1);
      const spec = { baseline: { html: '<div></div>' } };

      const result = await baselineGenerationService.queueInitialBaselineIfReady(1, spec, {});
      expect(result.queued).toBe(false);
      expect(result.version).toBe(1);
    });

    it('should queue and return queued true if ready and no previous version', async () => {
      Baseline.max.mockResolvedValue(0);
      fs.existsSync.mockReturnValue(false);
      enqueueBaseline.mockResolvedValue({ id: 'job123' });

      const fallbackFiles = { css: 'body { color: blue; }' };
      const result = await baselineGenerationService.queueInitialBaselineIfReady(1, {}, fallbackFiles);

      expect(result.queued).toBe(true);
      expect(result.version).toBe(1);
      expect(result.jobId).toBe('job123');
      expect(enqueueBaseline).toHaveBeenCalledWith(1, 1);
    });
  });
});
