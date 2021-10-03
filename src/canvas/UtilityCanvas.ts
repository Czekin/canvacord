import { ImageSourceType } from "../typings/types";
import { BaseCanvas } from "./BaseCanvas";
import { SKRSContext2D, Canvas as SkCanvas } from "@napi-rs/canvas";
import singleton from "../decorators/Singleton";

@singleton()
export class UtilityCanvas extends BaseCanvas {
    public async blur(image: ImageSourceType, pixels?: number): Promise<Buffer> {
        const img = await this.loadImage(image);
        const { canvas, ctx } = this.makeCanvas(img.width, img.height);

        pixels ??= 5;

        ctx.filter = `blur(${pixels ?? 0}px)`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        return await this.buildImage(canvas);
    }

    public async brightness(img: ImageSourceType, percentage?: number): Promise<Buffer> {
        percentage ??= 100;
        const image = await this.loadImage(img);
        const { canvas, ctx } = this.makeCanvas(image.width, image.height);

        ctx.filter = `brightness(${percentage ?? 0}%)`;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        return await this.buildImage(canvas);
    }

    public async greyscale(img: ImageSourceType, percentage?: number): Promise<Buffer> {
        percentage ??= 70;
        const image = await this.loadImage(img);
        const { canvas, ctx } = this.makeCanvas(image.width, image.height);

        ctx.filter = `grayscale(${percentage ?? 0}%)`;
        ctx.drawImage(image, 0, 0);

        return await this.buildImage(canvas);
    }

    public async grayscale(img: ImageSourceType, percentage?: number): Promise<Buffer> {
        return await this.greyscale(img, percentage);
    }

    public async invert(img: ImageSourceType, percentage?: number) {
        percentage ??= 70;
        const image = await this.loadImage(img);
        const { canvas, ctx } = this.makeCanvas(image.width, image.height);

        ctx.filter = `invert(${percentage ?? 0}%)`;
        ctx.drawImage(image, 0, 0);

        return await this.buildImage(canvas);
    }

    public async sepia(img: ImageSourceType, percentage?: number) {
        percentage ??= 70;
        const image = await this.loadImage(img);
        const { canvas, ctx } = this.makeCanvas(image.width, image.height);

        ctx.filter = `sepia(${percentage ?? 0}%)`;
        ctx.drawImage(image, 0, 0);

        return await this.buildImage(canvas);
    }

    public async threshold(img: ImageSourceType, amount: number): Promise<Buffer> {
        const image = await this.loadImage(img);
        const { canvas, ctx } = this.makeCanvas(image.width, image.height);

        ctx.drawImage(image, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const r = imgData.data[i];
            const g = imgData.data[i + 1];
            const b = imgData.data[i + 2];
            const v = 0.2126 * r + 0.7152 * g + 0.0722 * b >= amount ? 255 : 0;
            imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = v;
        }

        ctx.putImageData(imgData, 0, 0);

        return await this.buildImage(canvas);
    }

    public async circle(image: ImageSourceType): Promise<Buffer> {
        const img = await this.loadImage(image);
        const { canvas, ctx } = this.makeCanvas(img.width, img.height);

        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.height / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        return await this.buildImage(canvas);
    }

    public async convolute(ctx: SKRSContext2D, canvas: SkCanvas, matrix: number[], opaque?: boolean): Promise<SKRSContext2D> {
        const side = Math.round(Math.sqrt(matrix.length));
        const halfSide = Math.floor(side / 2);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const src = pixels.data;
        const sw = pixels.width;
        const sh = pixels.height;
        const w = sw;
        const h = sh;
        const output = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dst = output.data;
        const alphaFac = opaque ? 1 : 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const sy = y;
                const sx = x;
                const dstOff = (y * w + x) * 4;
                let r = 0;
                let g = 0;
                let b = 0;
                let a = 0;
                for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                        const scy = sy + cy - halfSide;
                        const scx = sx + cx - halfSide;
                        if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                            const srcOff = (scy * sw + scx) * 4;
                            const wt = matrix[cy * side + cx];
                            r += src[srcOff] * wt;
                            g += src[srcOff + 1] * wt;
                            b += src[srcOff + 2] * wt;
                            a += src[srcOff + 3] * wt;
                        }
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }

        ctx.putImageData(output, 0, 0);
        return ctx;
    }

    public async colorfy(image: ImageSourceType, color: string): Promise<Buffer> {
        const img = await this.loadImage(image);
        const { canvas, ctx } = this.makeCanvas(img.width, img.height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (color) {
            ctx.globalCompositeOperation = "color";
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        return await this.buildImage(canvas);
    }

    public async colourfy(image: ImageSourceType, colour: string): Promise<Buffer> {
        return await this.colorfy(image, colour);
    }

    public async color(color: string, width: number, height: number): Promise<Buffer> {
        const { canvas, ctx } = this.makeCanvas(width ?? 1024, height ?? 1024);

        ctx.beginPath();
        ctx.fillStyle = color ?? "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        return await this.buildImage(canvas);
    }

    public async colour(colour: string, width: number, height: number): Promise<Buffer> {
        return this.color(colour, width, height);
    }

    public async saturate(img: ImageSourceType, percentage?: number) {
        percentage ??= 70;
        const image = await this.loadImage(img);
        const { canvas, ctx } = this.makeCanvas(image.width, image.height);

        ctx.filter = `saturate(${percentage ?? 0}%)`;
        ctx.drawImage(image, 0, 0);

        return await this.buildImage(canvas);
    }

    public async contrast(img: ImageSourceType, percentage?: number) {
        percentage ??= 70;
        const image = await this.loadImage(img);
        const { canvas, ctx } = this.makeCanvas(image.width, image.height);

        ctx.filter = `contrast(${percentage ?? 0}%)`;
        ctx.drawImage(image, 0, 0);

        return await this.buildImage(canvas);
    }

    public async hueRotate(img: ImageSourceType, angle?: number) {
        angle ??= 70;
        const image = await this.loadImage(img);
        const { canvas, ctx } = this.makeCanvas(image.width, image.height);

        ctx.filter = `hue-rotate(${angle ?? 0}deg)`;
        ctx.drawImage(image, 0, 0);

        return await this.buildImage(canvas);
    }

    public async dropShadow(img: ImageSourceType, x: number, y: number, borderRadius: number, color: string) {
        if (typeof x !== "number" || typeof y !== "number" || typeof borderRadius !== "number" || typeof color !== "string") {
            throw new TypeError("Invalid arguments type");
        }
        const image = await this.loadImage(img);
        const { canvas, ctx } = this.makeCanvas(image.width, image.height);

        ctx.filter = `drop-shadow(${x}px ${y}px ${borderRadius}px ${color})`;
        ctx.drawImage(image, 0, 0);

        return await this.buildImage(canvas);
    }
    public async gradient(colorFrom: string, colorTo: string, img?: ImageSourceType) {
        let image = null;
        if (img) image = await this.loadImage(img);
        const { canvas, ctx } = this.makeCanvas(image ? image.width : 800, image ? image.height : 600);

        if (image) {
            ctx.drawImage(image, 0, 0);
            ctx.globalAlpha = 0.5;
        }

        const gradient = ctx.createLinearGradient(0, canvas.height / 2, canvas.width, canvas.height / 2);
        gradient.addColorStop(0, colorFrom);
        gradient.addColorStop(1, colorTo);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return await this.buildImage(canvas);
    }
}
