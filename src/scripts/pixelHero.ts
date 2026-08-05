import {
	Color,
	LinearFilter,
	Mesh,
	OrthographicCamera,
	PlaneGeometry,
	Scene,
	ShaderMaterial,
	SRGBColorSpace,
	TextureLoader,
	WebGLRenderer
} from 'three';

const vertexShader = `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const fragmentShader = `
	uniform sampler2D tDiffuse;
	uniform float uImageAspect;
	uniform float uPixelsPerUV;
	uniform float uTime;
	uniform float uIntro;
	varying vec2 vUv;

	void main() {
		float intro = clamp(uIntro, 0.0, 1.0);
		float eased = smoothstep(0.0, 1.0, intro);
		float motion = 1.0 - eased;
		float frequency = mix(12.0, 28.8, eased);
		vec2 position = vUv;
		position.x *= uImageAspect;
		vec2 cellUv = position * frequency;
		vec2 cellId = floor(cellUv);
		vec2 grid = fract(cellUv) - 0.5;

		vec2 sampleUv = (cellId + 0.5) / frequency;
		sampleUv.x /= uImageAspect;
		sampleUv = clamp(sampleUv, 0.0, 1.0);
		vec4 textureColor = texture2D(tDiffuse, sampleUv);
		float luminance = dot(textureColor.rgb, vec3(0.299, 0.587, 0.114));

		vec2 q = abs(grid);
		float hex = max(q.x * 0.866025 + q.y * 0.5, q.y);
		float ringOne = abs(hex - 0.12);
		float ringTwo = abs(hex - 0.26);
		float ringThree = abs(hex - 0.4);
		float sdf = luminance < 0.2
			? min(min(ringOne, ringTwo), ringThree)
			: luminance < 0.42
				? min(ringOne, ringTwo)
				: luminance < 0.68
					? ringOne
					: 1.0;

		float pixelSize = frequency / uPixelsPerUV;
		float lineMask = 1.0 - smoothstep(0.024 - pixelSize * 1.5, 0.024 + pixelSize * 1.5, sdf);
		lineMask *= mix(1.65, 1.0, eased);
		lineMask *= 1.0 + sin(uTime * 10.0) * 0.08 * motion;
		vec3 patterned = mix(textureColor.rgb, vec3(0.1098), lineMask * 0.34);

		float sweepFront = mix(-0.3, 1.6, eased);
		float revealMask = 1.0 - smoothstep(sweepFront - 0.28, sweepFront, vUv.x);
		float sweepFlash = exp(-42.0 * abs(vUv.x - sweepFront)) * motion;
		vec3 finalColor = mix(textureColor.rgb, patterned, revealMask);
		finalColor = mix(finalColor, vec3(1.0), sweepFlash * 0.12);
		gl_FragColor = vec4(finalColor, 1.0);
	}
`;

type Callbacks = {
	onStart?: () => void;
	onProgress?: (progress: number) => void;
	onComplete?: () => void;
	onError?: () => void;
};

const wait = (milliseconds: number) =>
	new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export function createPixelHero(canvas: HTMLCanvasElement) {
	let renderVersion = 0;

	async function play(src: string, callbacks: Callbacks = {}) {
		const version = ++renderVersion;
		const bounds = canvas.getBoundingClientRect();
		const width = Math.max(1, Math.round(bounds.width));
		const height = Math.max(1, Math.round(bounds.height));
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
		const context = canvas.getContext('2d');

		if (!context || width < 2 || height < 2) {
			callbacks.onError?.();
			return;
		}

		canvas.width = Math.round(width * pixelRatio);
		canvas.height = Math.round(height * pixelRatio);
		context.clearRect(0, 0, canvas.width, canvas.height);

		const webglCanvas = document.createElement('canvas');
		let renderer: WebGLRenderer | null = null;
		let geometry: PlaneGeometry | null = null;
		let material: ShaderMaterial | null = null;
		let texture: Awaited<ReturnType<TextureLoader['loadAsync']>> | null = null;

		try {
			renderer = new WebGLRenderer({
				canvas: webglCanvas,
				antialias: true,
				alpha: false,
				preserveDrawingBuffer: true,
				powerPreference: 'high-performance'
			});
			renderer.setPixelRatio(pixelRatio);
			renderer.setSize(width, height, false);

			const scene = new Scene();
			const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
			camera.position.z = 1;
			material = new ShaderMaterial({
				vertexShader,
				fragmentShader,
				uniforms: {
					tDiffuse: { value: null },
					uImageAspect: { value: 1 },
					uPixelsPerUV: { value: 1000 },
					uTime: { value: 0 },
					uIntro: { value: 0 },
					uLineColor: { value: new Color('#1c1c1c') }
				}
			});

			texture = await new TextureLoader().loadAsync(src);
			if (version !== renderVersion) return;
			texture.colorSpace = SRGBColorSpace;
			texture.minFilter = LinearFilter;
			texture.magFilter = LinearFilter;
			texture.generateMipmaps = false;

			const image = texture.image as { width?: number; height?: number } | undefined;
			const imageAspect = Math.max(1, image?.width ?? 1) / Math.max(1, image?.height ?? 1);
			const containerAspect = width / height;
			let visibleWidth = imageAspect;
			let visibleHeight = 1;
			if (containerAspect > imageAspect) visibleHeight = imageAspect / containerAspect;
			else visibleWidth = containerAspect;
			camera.left = -visibleWidth / 2;
			camera.right = visibleWidth / 2;
			camera.top = visibleHeight / 2;
			camera.bottom = -visibleHeight / 2;
			camera.updateProjectionMatrix();

			material.uniforms.tDiffuse.value = texture;
			material.uniforms.uImageAspect.value = imageAspect;
			material.uniforms.uPixelsPerUV.value =
				(height * pixelRatio) / (camera.top - camera.bottom);
			geometry = new PlaneGeometry(imageAspect, 1);
			scene.add(new Mesh(geometry, material));

			await wait(360);
			if (version !== renderVersion) return;
			callbacks.onStart?.();
			const startedAt = performance.now();

			while (version === renderVersion) {
				const elapsed = performance.now() - startedAt;
				const rawProgress = Math.min(elapsed / 1750, 1);
				const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
				material.uniforms.uTime.value = elapsed / 1000;
				material.uniforms.uIntro.value = easedProgress;
				renderer.render(scene, camera);
				context.clearRect(0, 0, canvas.width, canvas.height);
				context.drawImage(webglCanvas, 0, 0, canvas.width, canvas.height);
				callbacks.onProgress?.(easedProgress);

				if (rawProgress >= 1) {
					callbacks.onComplete?.();
					break;
				}
				await new Promise<number>((resolve) => window.requestAnimationFrame(resolve));
			}
		} catch (error) {
			if (version === renderVersion) {
				console.warn('MyVu hero pixel reveal unavailable; using the still image.', error);
				callbacks.onError?.();
				callbacks.onComplete?.();
			}
		} finally {
			texture?.dispose();
			geometry?.dispose();
			material?.dispose();
			renderer?.dispose();
			webglCanvas.width = 0;
			webglCanvas.height = 0;
		}
	}

	return {
		play,
		cancel() {
			renderVersion += 1;
		},
		destroy() {
			renderVersion += 1;
			canvas.width = 0;
			canvas.height = 0;
		}
	};
}
