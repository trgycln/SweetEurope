import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// In-memory cache for ultra-fast repeated loads in dev/production
const memoryCache = new Map<string, { buffer: Buffer; contentType: string }>();

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Check memory cache first
    if (memoryCache.has(imageUrl)) {
        const cached = memoryCache.get(imageUrl)!;
        return new NextResponse(new Uint8Array(cached.buffer), {
            headers: {
                'Content-Type': cached.contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    }

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
        });

        if (!response.ok) {
            return NextResponse.redirect(imageUrl);
        }

        const arrayBuffer = await response.arrayBuffer();
        const inputBuf = Buffer.from(arrayBuffer);

        // Process with sharp
        const { data, info } = await sharp(inputBuf)
            .resize(500, 500, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const w = info.width;
        const h = info.height;
        const visited = new Uint8Array(w * h);
        const queue: number[] = [];

        // Check if pixel is considered "white background"
        const isBg = (idx: number) => {
            const pi = idx * 4;
            const r = data[pi];
            const g = data[pi + 1];
            const b = data[pi + 2];
            // Pure white or very light studio background
            return r > 225 && g > 225 && b > 225;
        };

        // Seed from all 4 borders
        for (let x = 0; x < w; x++) {
            queue.push(x); // top row
            queue.push((h - 1) * w + x); // bottom row
        }
        for (let y = 0; y < h; y++) {
            queue.push(y * w); // left col
            queue.push(y * w + (w - 1)); // right col
        }

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            if (visited[curr]) continue;
            visited[curr] = 1;

            if (isBg(curr)) {
                // Set alpha to 0
                data[curr * 4 + 3] = 0;

                const cx = curr % w;
                const cy = Math.floor(curr / w);

                if (cx > 0 && !visited[curr - 1]) queue.push(curr - 1);
                if (cx < w - 1 && !visited[curr + 1]) queue.push(curr + 1);
                if (cy > 0 && !visited[curr - w]) queue.push(curr - w);
                if (cy < h - 1 && !visited[curr + w]) queue.push(curr + w);
            }
        }

        // Soften antialiasing on edges
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = y * w + x;
                const pi = idx * 4;
                if (data[pi + 3] !== 0) {
                    // Check if adjacent to transparent pixel
                    const hasTransNeighbor =
                        data[(idx - 1) * 4 + 3] === 0 ||
                        data[(idx + 1) * 4 + 3] === 0 ||
                        data[(idx - w) * 4 + 3] === 0 ||
                        data[(idx + w) * 4 + 3] === 0;

                    if (hasTransNeighbor) {
                        const r = data[pi];
                        const g = data[pi + 1];
                        const b = data[pi + 2];
                        if (r > 200 && g > 200 && b > 200) {
                            // Fade alpha slightly for anti-aliasing
                            const avg = (r + g + b) / 3;
                            data[pi + 3] = Math.max(0, Math.round(255 * (1 - (avg - 200) / 55)));
                        }
                    }
                }
            }
        }

        const outBuf = await sharp(data, {
            raw: { width: w, height: h, channels: 4 },
        })
            .webp({ quality: 88, effort: 3 })
            .toBuffer();

        // Store in memory cache (limit to 200 items to avoid RAM bloat)
        if (memoryCache.size > 200) {
            const firstKey = memoryCache.keys().next().value;
            if (firstKey) memoryCache.delete(firstKey);
        }
        memoryCache.set(imageUrl, { buffer: outBuf, contentType: 'image/webp' });

        return new NextResponse(new Uint8Array(outBuf), {
            headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (err) {
        console.error('Error isolating image background:', err);
        return NextResponse.redirect(imageUrl);
    }
}
