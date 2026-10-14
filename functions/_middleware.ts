export async function onRequest(context: { request: Request; next: () => Promise<Response> }) {
	const url = new URL(context.request.url);
	if (
		url.hostname.toLowerCase() === 'myvu.app' &&
		(context.request.method === 'GET' || context.request.method === 'HEAD') &&
		context.request.headers.get('accept')?.includes('text/html')
	) {
		const destination = new URL(`${url.pathname}${url.search}`, 'https://tenagain.app');
		return Response.redirect(destination, 308);
	}

	return context.next();
}
