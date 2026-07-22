const fs = require('fs');
const { PNG } = require('pngjs');
const pixelmatchImport = require('pixelmatch');

const pixelmatch = pixelmatchImport.default || pixelmatchImport;

function generateVisualDiff(expectedPath, actualPath, diffPath) {
  let img1 = null;
  let img2 = null;
  let diff = null;
  let normalized1 = null;
  let normalized2 = null;

  try {
    img1 = PNG.sync.read(fs.readFileSync(expectedPath));
    img2 = PNG.sync.read(fs.readFileSync(actualPath));

    const width = Math.max(img1.width, img2.width);
    const height = Math.max(img1.height, img2.height);

    normalized1 = new PNG({
      width,
      height,
      colorType: 6,
      inputHasAlpha: true
    });

    normalized2 = new PNG({
      width,
      height,
      colorType: 6,
      inputHasAlpha: true
    });

    normalized1.data.fill(0);
    normalized2.data.fill(0);

    PNG.bitblt(img1, normalized1, 0, 0, img1.width, img1.height, 0, 0);
    PNG.bitblt(img2, normalized2, 0, 0, img2.width, img2.height, 0, 0);

    diff = new PNG({
      width,
      height,
      colorType: 6,
      inputHasAlpha: true
    });

    const numDiffPixels = pixelmatch(
      normalized1.data,
      normalized2.data,
      diff.data,
      width,
      height,
      {
        threshold: 0.1,
        includeAA: false,
        alpha: 0.35,
        diffColor: [255, 0, 0],
        diffColorAlt: [255, 0, 0]
      }
    );

    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    const cellSize = 20;
    const padding = 10;
    const minDiffRatio = 0.02;
    const cellsX = Math.ceil(width / cellSize);
    const cellsY = Math.ceil(height / cellSize);
    const cellCounts = new Uint32Array(cellsX * cellsY);

    for (let y = 0; y < height; y += 1) {
      const rowOffset = y * width * 4;
      const cellY = Math.floor(y / cellSize);

      for (let x = 0; x < width; x += 1) {
        const idx = rowOffset + x * 4;
        const isDiffPixel =
          diff.data[idx] === 255 &&
          diff.data[idx + 1] === 0 &&
          diff.data[idx + 2] === 0 &&
          diff.data[idx + 3] > 0;

        if (!isDiffPixel) {
          continue;
        }

        const cellX = Math.floor(x / cellSize);
        cellCounts[cellY * cellsX + cellX] += 1;
      }
    }

    const mergedHotspots = [];

    const intersectsOrTouches = (boxA, boxB) =>
      boxA.x <= boxB.x + boxB.width &&
      boxA.x + boxA.width >= boxB.x &&
      boxA.y <= boxB.y + boxB.height &&
      boxA.y + boxA.height >= boxB.y;

    const mergeBoxes = (boxA, boxB) => {
      const left = Math.min(boxA.x, boxB.x);
      const top = Math.min(boxA.y, boxB.y);
      const right = Math.max(boxA.x + boxA.width, boxB.x + boxB.width);
      const bottom = Math.max(boxA.y + boxA.height, boxB.y + boxB.height);

      return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top
      };
    };

    for (let cellY = 0; cellY < cellsY; cellY += 1) {
      for (let cellX = 0; cellX < cellsX; cellX += 1) {
        const cellIndex = cellY * cellsX + cellX;
        const cellOriginX = cellX * cellSize;
        const cellOriginY = cellY * cellSize;
        const cellWidth = Math.min(cellSize, width - cellOriginX);
        const cellHeight = Math.min(cellSize, height - cellOriginY);
        const cellArea = cellWidth * cellHeight;

        if (cellArea <= 0) {
          continue;
        }

        if (cellCounts[cellIndex] < Math.ceil(cellArea * minDiffRatio)) {
          continue;
        }

        let candidate = {
          x: cellOriginX,
          y: cellOriginY,
          width: cellWidth,
          height: cellHeight
        };

        let merged = true;

        while (merged) {
          merged = false;

          for (let i = mergedHotspots.length - 1; i >= 0; i -= 1) {
            if (!intersectsOrTouches(candidate, mergedHotspots[i])) {
              continue;
            }

            candidate = mergeBoxes(candidate, mergedHotspots[i]);
            mergedHotspots.splice(i, 1);
            merged = true;
          }
        }

        mergedHotspots.push(candidate);
      }
    }

    const hotspots = mergedHotspots.map((box) => {
      const x = Math.max(0, box.x - padding);
      const y = Math.max(0, box.y - padding);
      const right = Math.min(width, box.x + box.width + padding);
      const bottom = Math.min(height, box.y + box.height + padding);

      return {
        x,
        y,
        width: Math.max(1, right - x),
        height: Math.max(1, bottom - y)
      };
    });

    return {
      numDiffPixels,
      diffPercentage: (numDiffPixels / (width * height)) * 100,
      hotspots,
      width,
      height
    };
  } finally {
    img1 = null;
    img2 = null;
    diff = null;
    normalized1 = null;
    normalized2 = null;
  }
}

module.exports = { generateVisualDiff };
