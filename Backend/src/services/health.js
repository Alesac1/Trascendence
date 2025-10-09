module.exports = function (fastify, opts, done) {
	fastify.get('/health', async (request, reply) => {
		return {status: 'ok' };
	});
	done();
}