export interface Scene {
    /**
     * Paint one full, opaque frame.
     * @param t  seconds since this scene was created
     * @param dt seconds since the previous frame (already clamped)
     */
    draw(ctx: CanvasRenderingContext2D, t: number, dt: number): void;
}

export interface SceneDef {
    id: string;
    name: string;
    /** Accent colour used by the text overlay while this scene is showing. */
    accent: string;
    create(width: number, height: number): Scene;
}
