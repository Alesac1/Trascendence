// package.json -> assicurati di usare ES modules: { "type": "module" }
// .env -> PRIVATE_KEY=... (senza 0x o con 0x), FUJI_RPC_URL=..., CONTRACT_ADDRESS=...

import 'dotenv/config';
import Fastify from 'fastify';
import { createPublicClient, createWalletClient, http, parseAbi, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';

const app = Fastify({ logger: true });

// Env
const RPC_URL = process.env.FUJI_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// viem clients
const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: avalancheFuji, transport: http(RPC_URL) });

// ABI minimo per le funzioni indicate
const abi = parseAbi([
  'function get_name1(uint256 id) view returns (string)',
  'function get_name2(uint256 id) view returns (string)',
  'function get_score1(uint256 id) view returns (uint256)',
  'function get_score2(uint256 id) view returns (uint256)',
  'function get_winner(uint256 id) view returns (string)',
  'function store(uint256 id, string name1, string name2, uint256 score1, uint256 score2)',
]);

const contract = getContract({
  address: CONTRACT_ADDRESS,
  abi,
  client: { public: publicClient, wallet: walletClient },
});

// Schemi Fastify
const idParamsSchema = {
  type: 'object',
  properties: { id: { type: 'integer', minimum: 0 } },
  required: ['id'],
};

const postBodySchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', minimum: 0 },
    name1: { type: 'string' },
    name2: { type: 'string' },
    score1: { type: 'integer', minimum: 0 },
    score2: { type: 'integer', minimum: 0 },
  },
  required: ['id', 'name1', 'name2', 'score1', 'score2'],
  additionalProperties: false,
};

// POST: scrive on-chain
app.post(
  '/records',
  {
    schema: {
      body: postBodySchema,
      response: {
        200: {
          type: 'object',
          properties: { ok: { type: 'boolean' }, txHash: { type: 'string' } },
          required: ['ok', 'txHash'],
        },
      },
    },
  },
  async (req, reply) => {
    const { id, name1, name2, score1, score2 } = req.body;
    const hash = await contract.write.store([BigInt(id), name1, name2, BigInt(score1), BigInt(score2)]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return reply.send({ ok: receipt.status === 'success', txHash: hash });
  }
);

// GET tuple: name1, name2, score1, score2
app.get(
  '/records/:id',
  {
    schema: {
      params: idParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            name1: { type: 'string' },
            name2: { type: 'string' },
            score1: { type: 'integer', minimum: 0 },
            score2: { type: 'integer', minimum: 0 },
          },
          required: ['name1', 'name2', 'score1', 'score2'],
        },
      },
    },
  },
  async (req, reply) => {
    const id = BigInt(req.params.id);
    const [name1, name2, score1, score2] = await Promise.all([
      contract.read.get_name1([id]),
      contract.read.get_name2([id]),
      contract.read.get_score1([id]),
      contract.read.get_score2([id]),
    ]);
    return { name1, name2, score1: Number(score1), score2: Number(score2) };
  }
);

// GET: name1
app.get('/records/:id/name1', { schema: { params: idParamsSchema } }, async (req, reply) => {
  const id = BigInt(req.params.id);
  const value = await contract.read.get_name1([id]);
  return { value };
});

// GET: name2
app.get('/records/:id/name2', { schema: { params: idParamsSchema } }, async (req, reply) => {
  const id = BigInt(req.params.id);
  const value = await contract.read.get_name2([id]);
  return { value };
});

// GET: score1
app.get('/records/:id/score1', { schema: { params: idParamsSchema } }, async (req, reply) => {
  const id = BigInt(req.params.id);
  const value = await contract.read.get_score1([id]);
  return { value: Number(value) };
});

// GET: score2
app.get('/records/:id/score2', { schema: { params: idParamsSchema } }, async (req, reply) => {
  const id = BigInt(req.params.id);
  const value = await contract.read.get_score2([id]);
  return { value: Number(value) };
});

// GET: winner (string)
app.get('/records/:id/winner', { schema: { params: idParamsSchema } }, async (req, reply) => {
  const id = BigInt(req.params.id);
  const value = await contract.read.get_winner([id]);
  return { value };
});

app.listen({ port: 3000, host: '0.0.0.0' });
